---
name: chatbotta-line-onboarding
description: Use when a user needs to connect a LINE 官方帳號 to Chatbotta, set up Messaging API or Webhook, deploy an existing flow, or share a LINE 好友測試連結.
---

# Chatbotta × LINE 串接

以台灣繁體中文代辦串接。預設由 Chatbotta 回覆：Webhook 開啟、LINE 原生自動回應關閉；歡迎訊息和人工聊天保持現況。不為串接詢問歡迎文案或建立歡迎流程。

Codex 一律使用 Browser（@browser）的 in-app browser，透過 node_repl 初始化 Browser runtime，並控制現有 iab 工作階段及分頁；沿用目前登入狀態。外掛附帶 Chatbotta MCP 連接器、技能與腳本。Browser 或 node_repl 工具未提供時，說明缺少的工具與已完成階段，不假稱完成。

預設入口：[Chatbotta](https://app.chatbotta.com/)、[Manager](https://manager.line.biz/)、[Developers](https://developers.line.biz/console/)。測試環境須由客戶指定。

## 連接器安裝與 MCP 連線驗證

外掛附帶 `https://api.chatbotta.com/mcp` 的連接器設定。首次使用時，讓客戶在宿主的連接器登入／授權介面，以 Chatbotta 帳號完成 OAuth；不用貼 API key 或 LINE token。已有工具可用就直接沿用，不要求重新安裝。若宿主未自動載入，請在宿主的 MCP／連接器設定新增名稱 Chatbotta、URL `https://api.chatbotta.com/mcp`，再登入授權；不猜測不存在的安裝工具。把成功的 MCP 工具回應當作連線證據；若客戶暫不連接 MCP，可完成可見的 Browser 操作，但清楚標記 MCP 驗證未完成。

1. 先檢查本次可用工具並實際呼叫 `list_workspaces`。成功回傳才證明 Chatbotta MCP 已完成連線與帳號授權；再依使用者指定的專案名稱／ID 找目標，重名才請客戶選擇，不自行選第一筆。
2. 對選定的 `chatbotId` 實際呼叫 `get_setup_status`，確認回傳的專案名稱與 ID 相符。成功讀取才證明目前帳號有該專案存取權；保存其 `channels`、`checklist` 及應用程式連結作為後續核對依據。
3. 若工具不存在或呼叫失敗，先依宿主連接器流程完成 OAuth／排除連線錯誤；只有實際工具回應成功後才標示「MCP 已連線」。可在 MCP 尚未就緒時用 Browser 處理可見的 LINE 設定，但要把 MCP 驗證標為未完成，不能拿 Browser 登入狀態或設定頁代替 MCP 證據。
4. MCP 工具依目前授權與部署版本而異。只使用本次工具清單實際提供的工具；若含 `deploy_bot` 且已授權發布，僅在需要部署時呼叫。LINE 官方頁面、token 直接複製貼上、Webhook 開關與沒有可用 MCP 工具的設計器操作使用 Codex 內建 Browser。Webhook 網址由 Chatbotta 儲存 token 時透過 LINE API 自動更新，不在 Manager 手動填寫。
5. 部署後再次呼叫 `get_setup_status`，確認目標專案的 LINE channel 顯示 connected，且部署 checklist 已完成。以 Chatbotta「Channel Access Token」狀態列的「已啟用」作 token 驗證證據；這些狀態都不能代替真實 LINE 訊息測試。
6. `preview_bot_reply` 會在 Chatbotta「專案測試」聊天室模擬 AI 對話，可作為 AI 回覆診斷；它不是 LINE Webhook 事件，不列為 LINE 觸發驗證。

## 瀏覽器步驟：腳本優先，完成一段就往下

1. 使用 Codex 內建 Browser（@browser）的 node_repl 工具，依 [references/script-usage.md](references/script-usage.md) 初始化 Browser runtime，再以 browserAgent.browsers.get('iab') 取得 in-app browser，沿用目前分頁。將同頁相依的定位、填寫、點擊與等待放在一次腳本內，循序 await；把 Browser Tab 傳給 [scripts/browser-steps.js](scripts/browser-steps.js)。使用方法見 [references/script-usage.md](references/script-usage.md)。不另啟瀏覽器、不搬移登入 cookie。
2. 直接使用已核對的 URL、label、role、CSS locator 與條件等待。先確認目標 OA／Channel／專案，再沿用本階段的 locator。不要以「click → snapshot → click → snapshot」作為預設流程，不憑空使用過期元素 ref。
3. 初次不熟悉的非憑證頁可讀一次局部 snapshot。既知頁面直接用腳本；只有找不到元素或狀態矛盾才讀一次局部 DOM 結構。一次定位失敗後，根據結構修正再試；仍失敗就回報具體阻礙，不循環猜 Copy、title、aria-label、祖先層數，也不反覆重現同一錯誤。
4. Provider／Channel 清單先等待 loading 結束及清單或明確空狀態就緒；有 progressbar 時不能據「Provider not found」判定沒有帳號。跨站更新或舊分頁只刷新一次再判讀。持續未就緒是載入問題，不另建資源。
5. 每階段取得一次成功證據就繼續。例外是回應開關更改後重新載入一次確認保存。設定和部署核對完成後，提供好友連結及一句明確測試指示；客戶回覆已傳送後，才檢查真實 LINE 聊天室中的收訊／回覆結果。不巡覽無關頁面、不重發 token、不重按部署。
6. 按下會開確認視窗的操作後，先完成目前視窗再操作背景頁。LINE Developers 可能用 `.kv-overlay` 而非 `role=dialog`。只處理已授權的確認；逾時先判斷有無成功，不能盲目重送建立、Issue 或部署。
7. 客戶說「已登入／已送出／已部署」時先讀現況再續做，丟棄失效的表單 ref。若客戶說測試訊息已傳送，打開已核對的 Chatbotta 專案聊天室，查看最新訊息與機器人回覆；進度只說已完成階段、實際阻礙及下一步，不逐個按鈕解說。

## 一次收齊缺漏資料

先沿用本次對話和目前表單的適用資料，核對指定 Chatbotta 專案與 OA。若本次對話尚未指定 OA，先在 Official Account Manager 檢視既有帳號，請客戶選定平常使用的 OA；清單只列一次，並請客戶回覆帳號名稱或 Basic ID。預設沿用既有帳號，只有客戶明確要求時才新建。客戶已選定就沿用，不重問。不要自行選第一個帳號、另建專案或使用舊任務的識別碼／email。

新建 OA 時，將尚缺的名稱、email、真實所在地、用途或代選業種授權、Provider 選擇集中詢問。可提供「測試用途，業種由助手選擇」；新建 Provider 選項包含確切名稱，例如「建立與本次專案『實際名稱』同名的 Provider」。不先問新建再追問名稱，也不為找既有 Provider 預先繞去 Developers；以 Manager 啟用 API 視窗的已載入選項為準，必要時再補問確實缺少的歸屬。

- OA 名稱使用客戶指定值；公司名稱等選填無資料就留空。已准許代選業種就直接選符合用途的分類並代送表單。
- Email 優先沿用已提供或表單帶入且屬於客戶的地址。僅在客戶允許測試暫填、確認聯絡欄位可編輯且不需收信驗證／登入／復原時，才用 `test@example.com`，交付時標示更換入口。不要為了使用範例地址另開調查支線；條件不明而缺必填 email 時集中問一次。
- 所在地使用本次已知真實國家／地區，不以語言、時區或舊任務推定，不任意填再承諾可改。[LINE OA 條款第 6 條](https://terms2.line.me/official_account_terms_tw) 要求正確所在地且客戶不得更改所屬國家／地區。
- 登入、密碼、OTP、QR、CAPTCHA 交由客戶完成。完成登入不重發問卷。

開始時一句說明目標及「LINE 訊息事件將送到 Chatbotta」。建立／串接委託涵蓋必經的標準 OA／API 條款、企業資訊使用同意及確認頁，依實際頁面代辦，不逐頁要求再次同意。選填行銷與額外授權略過。隱私政策及條款網址為選填時直接留空，不問「是否沒有」、不填假網址、不要求建網站；只有表單真的阻擋才索取必要資料。

切換另一個未指定 OA／Provider、現有客服平台、額外付費或額外資料授權，才針對超出範圍的差異確認。Provider 代表服務提供者／組織歸屬，不能任意搬移 Channel；依指定名稱建立或沿用，不綁到 Chatbotta 自己的 Provider。

## Chatbotta 頻道串接介面

在專案設定的「頻道串接」（網址參數 `section=channels`）查看「已連接的帳號」。LINE 已連接時，帳號卡會顯示 OA 名稱與摘要狀態；開啟卡片後可核對完整 OA 資訊、Channel Access Token 與 Webhook 各自的狀態。卡片上的「已啟用」是整體狀態；細節請按「Channel Access Token」或「Webhook」標籤判讀，因為兩列可能使用相同的「已啟用」文字。

Chatbotta 的 LINE 連線視窗不提供 OA 選擇器，也不能在同一專案加第二個 LINE OA。已有 LINE 卡片時先確認顯示名稱與 Basic ID 符合本次指定的 OA，再繼續；不符時停止，不要按「更換 Token」。尚未連接時，管理員按「新增連線」並選「LINE」。缺少專案管理員權限時，畫面會顯示「需要專案管理員協助設定 LINE 連線」，請管理員接手。

LINE 視窗中的「重新驗證」會檢查已儲存的 token，不會更換憑證；只有明確需要替換憑證時才按「更換 Token」。腳本 `verify-token` 可自動打開既有 LINE 帳號卡並執行重新驗證。新連線或進入更換表單後，Channel Access Token 以密碼欄位顯示，按「儲存並驗證」提交。成功後 token 細節列顯示「已啟用」，Webhook 狀態另列。Webhook 顯示「已啟用」只代表 LINE 開關已開，不代表 endpoint 指向目前專案。

成功驗證後，視窗中的「OA 資訊」會顯示 LINE 回傳的帳號名稱、Basic ID、「加入好友／開啟帳號」連結及 QR code；優先使用該連結交付。「使用 Chatbotta 外掛協助串接」可展開「複製串接提示詞」；提示詞帶有專案資料，不含 token。沿用對話中已指定的 OA，不因提示詞缺少 OA 名稱而重問。一般串接不需要「解除綁定」；這個操作會中斷此專案透過該 OA 回覆並移除 Chatbotta 設定的圖文選單，僅在客戶明確要求解除時處理。

## 主流程

### 1. 建立或選定 OA，啟用 API

核對 OA 名稱、Basic ID、管理權限及 Chatbotta 專案。記下本次 Basic ID、Channel ID、專案 ID 與已核對的頁面 URL，後續直接使用。已有 Channel 就沿用；新 OA 在 Manager 啟用 Messaging API，於同一視窗選擇或建立已指定 Provider。

**按下啟用前就切換為憑證頁操作方式。** 下一頁可能直接顯示 Channel secret；不要在確認啟用後取得整頁 snapshot。只讀公開名稱、Channel ID、API 狀態與指定 Webhook 欄位。啟用完成後才到 Developers 同一 Provider／Channel，等清單載入；不直接在 Developers 新建 Messaging API 或誤建 LINE Login Channel。實際入口有變才查 [官方入門](https://developers.line.biz/en/docs/messaging-api/getting-started/)。

### Chatbotta 連線介面

帳號選單 →「帳號」→「AI 助手連接 · Beta」提供 Codex 安裝、ChatGPT MCP 連接教學與已授權助手管理。LINE 編輯視窗的「使用 AI 助手協助設定」會開啟同一個入口，並帶入目前專案。預設「確認連線」提示詞只讀取；「協助串接 LINE」在 Codex 與 Claude 教學中提供（內容依宿主不同）。不要把授權清單紀錄當作目前宿主工具已可用的證明，仍須實際呼叫工具核對。

- 設定 → 頻道串接以帳號名稱為卡片標題；平台以頭像右下角小圖示識別，無頭像時顯示平台 Logo。核對帳號名稱與 OA 資訊，不把平台名稱當成帳號名稱。
- 已綁定 LINE 時，「新增連線」中的 LINE 選項停用。點既有 LINE 帳號卡開啟「編輯連線」，不要走新增入口或解除再重綁。
- Channel Access Token 與 Webhook 共用狀態樣式，正常都顯示「已啟用」。Token 證據必須限定在 `[data-testid="line-token-status"]`，不能用整個視窗的「已啟用」或列表綠燈判定驗證成功。Webhook 的「已啟用」僅代表開關開啟，不代表接收網址與專案一致或訊息已送達；沿用下節的獨立核對。
- 「重新驗證」「更換 Token」在 Token 欄位旁；「OA 資訊」包含 Basic ID、QR Code 及「加入好友／開啟帳號」連結。
- 「解除綁定」是 footer 的小型紅字按鈕，會開啟第二層確認視窗；一般串接不需使用。編輯視窗沒有 footer「關閉」按鈕，使用右上角關閉控制。不要把解除綁定當作離開視窗。

### 2. 搬移 token 並等待驗證

先只讀既有 Webhook URL 與 Chatbotta 連線狀態。若將切換別的平台／專案，先取得該切換授權。新 Channel 可 Issue；既有 token 只有明確授權輪替才 Reissue。Channel secret 不用於本次 token 串接，不操作其 Issue 按鈕。

若 Channel Access Token 細節列已顯示「已啟用」，沿用現有 token；需要重查有效性時用「重新驗證」，不要為了完成流程而輪替。需要首次設定或已獲授權更換 token 時，先打開本次目標 OA 的 LINE 視窗：已有連線就開正確帳號卡；新連線才用「新增連線」→「LINE」。腳本 `prepare-token` 接受 `existingConnection: true` 來開既有帳號卡並選「更換 Token」；新連線省略此欄位，會從新增連線流程開啟 token 表單。只在已核對的 Developers Messaging API Channel 使用 `copy-token`，再以 `paste-save-token` 貼入 Chatbotta。

新介面的輸入欄位是 `貼上 Messaging API 的 Channel Access Token`，送出按鈕是「儲存並驗證」。腳本會等待編輯表單關閉，再檢查是否出現儲存錯誤，最後確認「Channel Access Token」列顯示「已啟用」；不要再等待舊文字 `token 已驗證` 或按舊的「確定」按鈕。若回傳 `token-saved-partial-failure`，token 可能已儲存，但 Webhook 或圖文選單同步失敗；不要重貼 token 或重新 Issue，依非敏感狀態檢查 Webhook 並暫停後續部署。先準備 Chatbotta 欄位再複製，使用 LINE 頁面 `.copy-btn` 和貼上快捷鍵，不讀取剪貼簿或欄位值。既有 token 只有明確授權輪替才按 LINE Developers 的 Reissue；Channel secret 不用於本次串接，不操作其 Issue 按鈕。

憑證只由頁面複製按鈕與貼上快捷鍵傳遞；腳本不得讀取 token、secret、剪貼簿或輸入欄位值，不放入參數、返回值、console、URL、檔案、截圖或對話。憑證頁只回傳白名單狀態／公開識別資訊，禁止整頁 snapshot、innerText、outerHTML、console／network 傾印。若宿主工具自動記錄秘密且無法停用，才請客戶代做複製貼上，不透過重發反覆試探。發生洩漏時不重述或另存秘密，說明事故；輪替須核對依賴服務與授權，不能用反覆重發掩蓋問題。

儲存後先等 Chatbotta 的 token 編輯表單關閉，再讀 token 細節列與獨立 Webhook 列；不可把操作前的舊狀態當成這次成功。成功狀態是 Channel Access Token 列顯示「已啟用」，不要求另外出現「token 已驗證」或「已連線」。儲存 token 的 API 會自動更新 LINE Webhook endpoint；如果視窗出現 Webhook 設定錯誤，先以 Manager 的唯讀 endpoint 檢查定位原因，不手動填 URL。逾時先讀非敏感狀態，不重發 token。若原本已有有效 token 且本次不需更新，保留，不為走完步驟重填。

### 3. Webhook 與回應開關

儲存 token 後，Chatbotta 後端會用 LINE API 將 Webhook URL 設為目前環境的接收端與本次專案 ID 組成的路徑。重新整理 Manager 的 API 設定頁一次，執行 `read-webhook` 核對網址存在且符合目標專案；腳本只回傳 `configured` 與 `matchesProjectEndpoint`，不回傳完整網址。若客戶指定測試環境，使用該環境已確認的公開 API origin；未指定時使用正式環境 origin。Manager 的 Webhook URL 欄位只讀、不手動填寫。若網址不存在或目標不符，回頭核對 Chatbotta 專案、token 驗證狀態與環境，回報具體差異並暫停後續操作；不要呼叫 `configure-response`、開啟 Webhook 或部署，直到網址與目標相符。

只有 `read-webhook` 回傳 `configured: true` 與 `matchesProjectEndpoint: true` 時，才前往同一 OA 的回應設定。呼叫 `configure-response` 時帶入這兩個已核對結果（`webhookConfigured: true`、`matchesProjectEndpoint: true`）；腳本會拒絕沒有核對或目標不符的呼叫。之後一段腳本完成：
- 讀 Webhook 與原生自動回應的實際狀態；
- 只切換不符合目標者：Webhook 開、自動回應關（客戶指定保留則保留）；
- 必要時儲存，重新載入一次，回傳兩個最終狀態。

不順帶改歡迎訊息或人工聊天。Manager 已確認就不再往返 Developers 重複確認相同開關。token 已驗證、URL 有值及已部署均不能代替 Webhook 開啟。

### 4. 部署現有授權流程

確認目標專案與現有流程在本次授權內。若本次 MCP 工具清單含 `deploy_bot`，使用它部署一次；工具不存在或呼叫權限不足時，才用 Codex 內建 Browser 在設計器部署。新專案有預設流程就沿用；未接入範例節點的提醒不是部署失敗。不覆蓋無關草稿，不創作歡迎流程。

單純更新 token 且 `get_setup_status` 顯示現有流程已部署時不需重新部署。尚未部署或有待發布變更時，先說明將發布內容並依本次授權部署一次；工具成功回應或 Browser 設計器成功狀態作為部署證據，再用 MCP `get_setup_status` 核對目標專案 checklist。工具已回報成功就不再開設計器重按部署。不因文字或按鈕 locator 失敗就重按部署。沒有可用流程、內容超出授權或出現實際阻擋錯誤才回報缺口。客戶要求只讀／不部署則遵守；客戶回報已部署可註明來源續做，不冒稱親自驗證。

### 5. 交付

分項核對並回報已取得的證據：MCP `list_workspaces`／`get_setup_status` 成功及目標一致、Chatbotta 的 Channel Access Token 狀態列顯示「已啟用」、Webhook URL 正確且開關開啟、原生自動回應關閉或依指定保留、現有流程部署成功且 MCP checklist 已更新。這些設定證據不等於真實 LINE 訊息已觸發。

公開加入好友連結優先使用 Chatbotta「OA 資訊」的「加入好友／開啟帳號」連結與 QR code；若該細節尚未載入，再用本次核對的 Basic ID 組成 `https://line.me/R/ti/p/{Basic ID}`（保留 @）。開啟一次確認加入好友頁；頁面未顯示名稱時，以本次 OA Basic ID 為來源，不宣稱有讀到名稱，也不巡覽其他後台尋找。Manager 管理網址不是加入好友連結。

給客戶的下一步使用一看就懂的文字：「請點 [加入好友連結] 加入『帳號名稱』，加入後傳送『測試』。傳完回覆我『已傳送』，我會接著確認聊天室有沒有收到訊息及機器人回覆。」

客戶回覆已傳送後，到該 Chatbotta 專案的聊天室查看最新對話。聊天室出現客戶測試訊息證明 LINE 收訊觸發；再看到機器人回覆才證明完整收發成功。收到訊息但無回覆時，分開報告收訊成功與回覆未完成，檢查 Webhook 事件及流程觸發條件；聊天室沒有測試訊息時檢查 token、Webhook 與 OA 對應。未看到聊天室證據就說明尚待確認，不宣稱收訊或回覆。

## 續做與故障處理

續做先以 MCP `list_workspaces`／`get_setup_status` 及當前頁面讀取現況，只補缺少的階段，不從建 OA 重跑。通常設定完成後由客戶透過好友連結傳送一次簡單測試訊息，再到 Chatbotta 聊天室核對真實觸發；不代替客戶傳送。沒有回覆才查部署與觸發條件；重複回覆才查原生回應設定。

遇到失敗只處理當前原因，不另建帳號、不反覆 Issue、不無限重新部署。必要進度只保存本次非敏感識別資訊、授權與各階段結果，不存憑證或完整帳號清單。
