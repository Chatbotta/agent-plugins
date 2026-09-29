---
name: chatbotta-line-onboarding
description: 引導使用者把 LINE 官方帳號串接到 Chatbotta 專案：選定 OA、啟用 Messaging API、搬移 Channel Access Token、核對 Webhook、部署流程，最後以真實 LINE 訊息驗證收發。當使用者要求連接／串接 LINE、設定 Messaging API 或 Webhook、或測試 LINE 機器人是否回覆時使用。Use when connecting a LINE Official Account to Chatbotta.
---

# Chatbotta × LINE 串接

以台灣繁體中文引導。目標：LINE 訊息事件送到 Chatbotta，由 Chatbotta 回覆。預設設定為 Webhook 開啟、LINE 原生「自動回應訊息」關閉；加入好友歡迎訊息與人工聊天維持現況，不詢問歡迎文案或建立歡迎流程。

開始時用一句話說明目標與預計步驟，之後每個階段只回報結果、實際阻礙與下一步，不逐一解說按鈕。

## 工具與模式

- **Chatbotta MCP**（`list_workspaces`、`get_setup_status`，視授權可能有 `deploy_bot`、`preview_bot_reply`）：專案與狀態的主要證據。只使用本次工具清單實際提供的工具。
- **瀏覽器模式**：本次有可操作使用者 Chrome 的瀏覽器工具（Claude in Chrome）時，沿用使用者目前的登入狀態操作 Chatbotta 與 LINE Official Account Manager。
- **手動模式**：沒有瀏覽器工具時，一次給一個階段的具體步驟（網址、選單路徑、按鈕名稱），請使用者完成後回覆，再以 MCP 或使用者描述核對。不假裝已點擊或已看到畫面。

入口：[Chatbotta](https://app.chatbotta.com/)、[LINE Official Account Manager](https://manager.line.biz/)、[LINE Developers](https://developers.line.biz/console/)。測試環境須由使用者指定。

## 分工與安全界線

| 由使用者完成 | 由 Claude 完成 |
|---|---|
| 登入、密碼、OTP、QR、CAPTCHA | 導覽頁面、讀取非機密狀態、核對專案與 OA |
| 在 LINE Developers 發行／複製 Channel Access Token，貼到 Chatbotta 並送出 | 開好 Chatbotta 的 token 欄位，指示複製位置，送出後核對結果 |
| 用手機加入好友並傳送測試訊息 | 提供好友連結，檢查 Chatbotta 聊天室 |

- **憑證**：Claude 不輸入、不讀出、不複述 Channel Access Token 或 Channel secret。不在聊天中索取 token；使用者貼到對話時，請他改貼到 Chatbotta，並建議之後在 LINE Developers 重新發行。
- **機密頁面**：LINE Developers 的 Channel 頁與 Manager 的 Messaging API 設定頁會顯示 Channel secret 或 token。Claude 不開啟 LINE Developers 的 Channel 頁；在 Manager 的 Messaging API 設定頁不截圖、不讀整頁文字，只用元素搜尋讀取「Webhook網址」欄位。做不到時請使用者自行核對。畫面若意外出現機密，不複述、不記錄。
- **需要先取得同意的動作**：建立 OA 或 Provider、接受條款、送出表單、變更 LINE 設定開關、部署流程、解除綁定。操作前列出將執行的具體變更，取得使用者明確同意後才執行；同一則同意只涵蓋列出的項目。
- **不做**：未經要求新建 OA、切換其他 OA／Provider／客服平台、輪替仍有效的 token、發布與本次無關的流程草稿。

## 流程

### 1. 核對 Chatbotta 專案

呼叫 `list_workspaces`，依使用者提供的名稱或 ID 找目標專案；重名或未指定時列出候選請使用者選擇，不自行選第一筆。再以該 `chatbotId` 呼叫 `get_setup_status`，確認名稱與 ID 相符，記下 `channels`、`checklist` 與回傳的設定連結。

MCP 工具不存在或呼叫失敗時，請使用者到 Claude 的 Customize → Connectors 登入 Chatbotta 連接器（網址 `https://api.chatbotta.com/mcp`）。使用者暫不連接時可以繼續，但回報時標示「MCP 驗證未完成」，不以瀏覽器畫面代替。

若 `channels` 顯示 LINE 已連接且 token 有效，跳到第 4 步核對 Webhook。

### 2. 選定 OA 並啟用 Messaging API

1. 在 Manager 首頁列出既有帳號一次，請使用者回覆要用的帳號名稱或 Basic ID。預設沿用既有帳號；使用者明確要求才新建。
2. **新建 OA**：將缺少的資料一次問齊：帳號名稱、email、真實所在地（國家／地區建立後無法更改）、業種或「由 Claude 代選」、Provider（沿用既有或建立與專案同名者）。選填欄位留空，不填假網址。送出與接受條款前取得同意。
3. **啟用 Messaging API**：Manager → 目標 OA → 設定 → Messaging API → 啟用。在同一視窗選擇或建立使用者指定的 Provider，取得同意後送出。已啟用就沿用，不重建 Channel、不搬移 Provider。
4. 啟用後下一頁會顯示 Channel secret：按下確認後不截圖、不讀整頁，只確認頁面已顯示「已啟用」狀態。

### 3. Channel Access Token

先在 Chatbotta 準備好輸入欄位，再請使用者到 LINE 複製，縮短 token 停留在剪貼簿的時間。

1. 開啟專案「設定 → 頻道串接」（網址 `https://app.chatbotta.com/{chatbotId}/settings?section=channels`），查看「已連接的帳號」。
   - **已有 LINE 帳號卡**：先核對卡片的帳號名稱與「OA 資訊」中的 Basic ID 是否為目標 OA；不符就停止並回報，不按「更換 Token」。符合時按「重新驗證」檢查現有 token；成功就沿用，不需要換 token。只有 token 失效、或使用者明確要求更換時，才按「更換 Token」。
   - **尚未連接**：按「新增連線」→「LINE」。
   - 顯示「需要專案管理員協助設定 LINE 連線」代表權限不足，請專案管理員接手。
2. 欄位「貼上 Messaging API 的 Channel Access Token」出現後，請使用者：
   > 開啟 [LINE Developers](https://developers.line.biz/console/) → 選擇與此 OA 同名的 Provider → 點選該 Channel → 「Messaging API」分頁 → 最下方「Channel access token (long-lived)」。尚未發行就按「Issue」，再按旁邊的複製按鈕，回到 Chatbotta 貼上欄位並按「儲存並驗證」。
   既有 token 只有使用者同意輪替時才按「Reissue」（舊 token 會失效，使用中的其他服務會中斷）。不要操作 Channel secret 的按鈕。
3. 使用者回覆已送出後，重新讀取 LINE 視窗：以「Channel Access Token」那一列（`[data-testid="line-token-status"]`）顯示「已啟用」作為 token 驗證證據。Webhook 列也會顯示「已啟用」，兩者不能互相代替，也不能用帳號卡或列表的綠燈判定。
4. 視窗出現錯誤提示時，token 可能已儲存但 Webhook 或圖文選單同步失敗：不要請使用者重貼或重發 token，先做第 4 步核對 Webhook 並回報錯誤。

離開視窗用右上角關閉控制。底部紅字「解除綁定」會中斷此專案的 LINE 回覆，只有使用者明確要求解除時才使用。

### 4. 核對 Webhook 網址

Chatbotta 儲存 token 時會透過 LINE API 自動設定 Webhook 網址，不在 Manager 手動填寫。預期網址為 `https://api.chatbotta.com/webhook/line/{chatbotId}`（測試環境換成使用者指定的 API 網域）。

在 Manager → 目標 OA → 設定 → Messaging API，以元素搜尋讀取「Webhook網址」欄位的值並比對：

- **相符**：繼續第 5 步。
- **空白或不符**：停止後續設定與部署。回報「未設定」或「指向其他服務」，不在對話中複述不符的完整網址（可能含其他服務的憑證）。請使用者確認專案、環境，以及該 OA 是否正由其他客服平台使用；需要改用 Chatbotta 時，回到第 3 步由使用者重新儲存 token。

無法只讀取該欄位時，請使用者自行確認網址結尾是否為 `/webhook/line/{chatbotId}`。

Chatbotta LINE 視窗的「Webhook」列只反映 LINE 的 Webhook 開關，不代表網址指向本專案，不能用來代替這一步。

### 5. 回應設定

Manager → 目標 OA → 設定 → 回應設定（此頁不含機密，可截圖）。讀取目前狀態，只變更不符合目標的項目：

- 「Webhook」：開啟
- 「自動回應訊息」：關閉（使用者要求保留則保留）

變更前列出將切換的項目並取得同意。變更後重新載入一次，確認狀態已保存；Chatbotta LINE 視窗的「Webhook」列此時也應顯示「已啟用」（「未啟用」「未設定」代表開關未生效）。不修改歡迎訊息與聊天（人工回覆）設定。

### 6. 部署流程

呼叫 `get_setup_status` 查看部署狀態：

- **已部署且沒有待發布變更**：單純更換 token 不需重新部署，直接跳到第 7 步。
- **尚未部署或有待發布變更**：說明將發布的內容並取得同意。本次工具清單有 `deploy_bot` 就用它部署一次；沒有時到流程設計頁（`https://app.chatbotta.com/{chatbotId}/designer`）按部署一次。新專案沿用預設流程，不創作新流程。

成功後再呼叫一次 `get_setup_status` 核對 checklist。部署逾時先確認是否已成功，不重複按部署。

### 7. 真實 LINE 訊息測試

提供 Chatbotta LINE 視窗「OA 資訊」中的「加入好友／開啟帳號」連結或 QR Code；尚未載入時才用 `https://line.me/R/ti/p/{Basic ID}`（保留 @）。Manager 的管理網址不是好友連結。告訴使用者：

> 請點 [加入好友連結] 加入「帳號名稱」，加入後傳送「測試」。傳完回覆我「已傳送」，我會確認聊天室有沒有收到訊息和機器人回覆。

使用者回覆後，到該 Chatbotta 專案的聊天室查看最新對話（手動模式請使用者查看並描述）：

- 看到使用者的「測試」訊息：LINE 收訊成功。
- 再看到機器人回覆：完整收發成功。
- 有收訊沒回覆：檢查部署狀態與流程觸發條件。
- 沒有收訊：回頭檢查 token、Webhook 網址與開關、選到的 OA。
- 收到重複回覆：檢查 LINE「自動回應訊息」是否仍開啟。

`preview_bot_reply` 只模擬 Chatbotta 內的 AI 回覆，不經過 LINE，不能當作 LINE 串接驗證。

## 回報

最後分項回報，每項註明證據來源，沒有證據的標示「未確認」：

1. MCP 連線與目標專案（`list_workspaces`／`get_setup_status`）
2. Channel Access Token（Chatbotta token 狀態列）
3. Webhook 網址指向本專案（Manager 欄位）
4. Webhook 開啟、自動回應訊息關閉（Manager 回應設定）
5. 流程部署（`deploy_bot` 或設計器結果，加上 `get_setup_status`）
6. LINE 收訊與機器人回覆（Chatbotta 聊天室）

## 續做與故障

- 使用者中途回來或說「已完成某步」時，先以 `get_setup_status` 與目前頁面讀取現況，只補缺少的階段，不從頭重跑。
- 頁面載入中（有進度條）不判定為空清單；重新整理一次仍未載入就回報載入問題，不另建資源。
- 同一操作失敗兩次就停止，回報具體阻礙與建議的下一步，不反覆嘗試、不另建帳號、不重發 token、不重複部署。
