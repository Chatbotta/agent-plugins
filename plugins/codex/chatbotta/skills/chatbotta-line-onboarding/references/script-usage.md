# 在 Codex 內建 Browser 使用腳本

使用 Codex 隨附的 Browser（`@browser`）與 `node_repl` 工具。Node REPL 初始時不一定有 `agent`；依下方方式從已安裝 Browser plugin 載入 `setupBrowserRuntime()`，再以 `browserAgent.browsers.get('iab')` 取得 in-app browser。沿用已開啟且登入的分頁；若目前沒有合適分頁，才在同一個 in-app browser 開分頁並前往本次已核對的網址。

讀取一次 `scripts/browser-steps.js`，把函式原始碼放進同一個 `node_repl` 呼叫，再傳入 Browser 的 `Tab` 與本次操作資料。`Tab.playwright` 是 Browser 內建的頁面定位 API；不需安裝 Playwright 套件、啟動另一個瀏覽器或搬移登入 cookie。

```js
await (async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { pathToFileURL } = await import('node:url');
  const browserRoot = path.join(nodeRepl.homeDir, '.codex', 'plugins', 'cache', 'openai-bundled', 'browser');
  const versions = (await fs.readdir(browserRoot)).sort((left, right) => {
    const a = left.split('.').map(Number);
    const b = right.split('.').map(Number);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if ((b[i] || 0) !== (a[i] || 0)) return (b[i] || 0) - (a[i] || 0);
    }
    return 0;
  });
  let runtimePath;
  for (const version of versions) {
    const candidate = path.join(browserRoot, version, 'scripts', 'browser-client.mjs');
    try { await fs.access(candidate); runtimePath = candidate; break; } catch {}
  }
  if (!runtimePath) return { ok: false, reason: 'browser-runtime-not-found' };
  const { setupBrowserRuntime } = await import(pathToFileURL(runtimePath).href);
  const browserAgent = await setupBrowserRuntime();
  const browser = await browserAgent.browsers.get('iab');
  const tabs = await browser.tabs.list();
  const expectedUrl = '<本次已核對的 Developers Messaging API 頁面 URL>';
  const expected = new URL(expectedUrl);
  const info = tabs.find((item) => {
    if (!item.url) return false;
    const current = new URL(item.url);
    return current.origin === expected.origin && current.pathname === expected.pathname;
  });
  const tab = info ? await browser.tabs.get(info.id) : await browser.tabs.new();
  if (!info) await tab.goto(expectedUrl);
  // 在此放入 browser-steps.js 的 chatbottaStep 函式原始碼。
  return await chatbottaStep(tab, { op: 'copy-token', expectedUrl });
})()
```

`expectedUrl` 不能由舊任務複製；腳本會檢查允許的網站 origin 與完整 pathname。先在本次對話核對 OA、Channel 與專案，再使用相符分頁。腳本只接收已核對的頁面 URL、公開 API origin、專案 ID、操作名稱與 selector，不接收 token、secret、完整 Webhook URL 或剪貼簿內容。

| op | 執行位置／輸入 | 返回 |
|---|---|---|
| prepare-token | 頻道串接頁；新連線省略選項，既有帳號傳 `existingConnection: true` | inputReady |
| verify-token | 頻道串接頁；會打開既有 LINE 帳號卡並按「重新驗證」 | tokenVerified，不更換 token |
| copy-token | 已核對的 Developers token 頁 | copyClicked，沒有讀取 token |
| inspect-token-controls | 複製定位失敗後只用一次 | token 區塊控制項結構，不含文字／值 |
| paste-save-token | LINE 視窗中的新 token 表單；macOS 預設 true | token 驗證完成，或回傳 `token-saved-partial-failure` 表示後續設定失敗 |
| read-webhook | Manager API 設定；傳 chatbotId；測試環境才傳已核對的 apiOrigin | configured、matchesProjectEndpoint，不含網址 |
| configure-response | Manager 回應設定；必須帶入 read-webhook 的 webhookConfigured=true 與 matchesProjectEndpoint=true；客戶要求保留自動回應才傳 keepAutoReply=true；現場要求儲存才傳 saveSelector | webhook、autoReply |

沿用既有且有效的 token 時，執行 verify-token → read-webhook。需要首次設定或已授權替換 token 時，先執行 prepare-token；existing connection 傳 `existingConnection: true`，新連線直接新增連線並選 LINE。接著在已核對的 Developers 頁面必要時 Issue／Reissue 一次 → copy-token → 切回 Chatbotta → paste-save-token → read-webhook。若 `paste-save-token` 回傳 `token-saved-partial-failure`，代表 token 可能已儲存但後續同步有錯；不可重貼、重發 token 或部署，先讀非敏感狀態並處理阻擋。只有 `configured` 與 `matchesProjectEndpoint` 都是 `true` 才能繼續 configure-response、部署及交付；任一為 `false` 就停止並核對專案／環境。Chatbotta 儲存 token 時會自動更新 Webhook URL，因此此腳本只核對網址，不會在 LINE Manager 寫入 URL。

每段成功返回就繼續，不為返回值再讀整頁 snapshot。返回 `ok:false` 時只針對該 stage 修正；儲存、Issue、建立、部署逾時後先確認有無成功，不能直接重跑寫入。

## 不需要另加固定腳本的頁面

- **表單**：用已確認的 label／role 定位，在一段腳本內依序 fill、selectOption、click 並等待下一頁；前提是必填資料與建立授權完整。
- **Provider／Channel 清單**：等待可見 progressbar 消失，再等待該清單的載入完成標記。不要單憑標題「Providers」出現就算載入完成；列表／計數或明確完成後空狀態才算。本次已指定新 Provider 時直接在 Manager 處理，不預先查 Developers。
- **Chatbotta 帳號卡**：在專案設定「頻道串接」查看「已連接的帳號」。開既有 LINE 卡以前核對 OA 名稱；`prepare-token` 和 `verify-token` 只匹配 LINE 卡的圖示，不會替你辨識客戶要用哪個 OA。帳號不符時停止，不操作「更換 Token」或「解除綁定」。
- **LINE 連線視窗**：細節分列「Channel Access Token」與「Webhook」。Channel Access Token 列的「已啟用」代表 token 已驗證；Webhook 列的狀態代表 LINE Webhook 開關，不能以其中一列代替另一列。密碼欄位是 `貼上 Messaging API 的 Channel Access Token`，提交鈕是「儲存並驗證」。
- **好友資訊**：以「OA 資訊」中的「加入好友／開啟帳號」連結及 QR code 交付；只有連結尚未載入才依已核對的 Basic ID 組成好友網址。
- **啟用確認**：按下確定後，只等待 API 狀態或讀 Channel ID。下一頁含 secret，不能接整頁 snapshot。
- **彈窗**：優先使用現場確認的 dialog；LINE 自訂視窗可定位 `.kv-overlay`。在視窗內完成已授權確認，等它隱藏，再進下一步。
- **部署**：在已核對專案，用已觀察到的精確文字／locator 點一次部署，等待成功。成功提示不明時，讀一次概覽「最後部署」作替代證據即可。
- **Browser 工具缺少**：確認 Codex 的 Browser（`@browser`）與 `node_repl` 工具是否可用；缺少時回報具體工具限制，不改用其他瀏覽器。

頁面 locator 必須符合本次看到的介面。首次操作可讀一次局部結構確認；若既知欄位或按鈕找不到，先重新讀取對應區塊，再更新 selector 一次。定位失敗後不可改用舊的 placeholder、舊按鈕文字或猜測祖先層數反覆試。唯一匹配與本次目標核對仍必須成立。

## 連線 UI 定位

既有 LINE 從帳號卡開啟編輯視窗；已綁定時新增入口的 LINE 按鈕停用。Token 與 Webhook 都顯示「已啟用」，必須限定 `[data-testid="line-token-status"]` 判讀 token，不可只找第一個相同文字。帳號名稱是主標題，好友連結與 QR Code 在「OA 資訊」。編輯視窗僅右上角關閉控制；footer 紅字是解除綁定，不是關閉按鈕。
