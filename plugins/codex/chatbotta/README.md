# Chatbotta

## 安裝（Codex）

在終端機執行：

```sh
codex plugin marketplace add Chatbotta/agent-plugins
```

重新啟動 Codex，在 Plugins Directory 選擇 **Chatbotta** marketplace 並安裝 **Chatbotta**。首次使用時，依 Codex 顯示的授權流程登入 Chatbotta；每位使用者都以自己的帳號完成 OAuth。

安裝後先以唯讀方式測試 Chatbotta MCP 連線：

> 請使用 Chatbotta LINE onboarding 技能，實際呼叫 `list_workspaces` 列出我有權限的工作區，再用 `get_setup_status` 查詢「技能測試專案」的設定狀態。若清單中沒有這個專案，請列出可選專案讓我指定一個再查詢。以兩個工具都成功回傳且專案名稱相符作為 MCP 連線驗證。先只查詢，不要修改任何設定。

更新此 marketplace 時執行：

```sh
codex plugin marketplace upgrade chatbotta-plugins
```

版本 0.2.6。附帶 Chatbotta MCP 連接器，用實際工具回應驗證帳號授權與目標專案；以 `get_setup_status` 核對 LINE channel 和部署狀態。依本次工具清單使用可用的 MCP 工具；若含 `deploy_bot` 且本次需要部署並已授權，就用它部署，否則以 Codex 內建 Browser（@browser）的 in-app browser 操作設計器。部署後再次查詢狀態。最後優先提供 Chatbotta「OA 資訊」的好友連結，請測試者加入後傳「測試」啟動真實 LINE 對話；測試者回覆「已傳送」後，到 Chatbotta 聊天室核對訊息與回覆。MCP 預覽對話僅測 Chatbotta 專案，不代表 LINE 訊息已觸發。圖示使用 Chatbotta 專案現有 icon。

## 安裝連接器

安裝或更新外掛後，在宿主提供的 Chatbotta 連接器登入／授權入口完成 OAuth。連接器 URL 為 `https://api.chatbotta.com/mcp`；宿主未自動載入時，可在 MCP／連接器設定手動新增此 URL。已有 Chatbotta 連線就沿用。登入及授權由使用者直接操作，不用傳送 API key 或 LINE token。

驗證 MCP 時，實際呼叫 `list_workspaces`，依使用者指定名稱找專案，再呼叫 `get_setup_status`；兩者成功且專案 ID／名稱相符才標示 MCP 已連線。以回傳的 `channels` 與部署狀態核對 Chatbotta 專案。只有本次 MCP 工具清單含 `deploy_bot` 且部署已授權時才用它；否則使用 Codex 內建 Browser 的設計器。完成後再次呼叫 `get_setup_status` 驗證。`preview_bot_reply` 只測 Chatbotta「專案測試」中的 AI 回覆，不代表 LINE Webhook 或真實訊息觸發成功。

## 簡化流程

1. 透過 MCP 核對目標專案；未連接 MCP 時以瀏覽器完成。集中收齊缺漏必填資料。
2. 在 Manager 選定客戶日常使用的 OA，啟用 Messaging API 並處理指定 Provider。
3. 在 Chatbotta 專案「設定 → 頻道串接」核對「已連接的帳號」卡片。若已有目標 OA，就直接開啟該卡片；若尚未連接，按「新增連線」並選「LINE」。
4. 對有效的現有 token 使用「重新驗證」；需要首次設定或已授權替換時，用 LINE 頁面複製按鈕與貼上快捷鍵，按「儲存並驗證」，等待「Channel Access Token」狀態列顯示「已啟用」。
5. 儲存 LINE token 後，Chatbotta 會自動更新 LINE Webhook URL。只檢查網址是否對應目標專案，不在 Manager 手動填寫；只有網址已設定且符合目標專案，才開啟 Webhook、關閉 LINE 原生自動回應，重新載入一次確認保存。若檢查不符，先停止並核對專案與環境。
6. Webhook 目標核對成功後，按目前流程部署一次，再以 MCP `get_setup_status` 核對 LINE channel 及部署狀態。
7. 優先提供 Chatbotta「OA 資訊」中的加入好友連結或 QR code，明確請測試者加入後傳送「測試」；測試者回覆「已傳送」後，檢查 Chatbotta 聊天室是否收到訊息及機器人是否回覆。

預設由 Chatbotta 回覆；不詢問或設定歡迎訊息，人工聊天保持現況。MCP 連線、LINE token 驗證、Webhook 設定、流程部署、真實 LINE 訊息觸發是不同檢查項目，分別回報。只有聊天室出現測試訊息／回覆才宣稱真實收訊／回覆已驗證；MCP 預覽不算 LINE 測試。

## 腳本與最少必要讀取

技能內附 [browser-steps.js](skills/chatbotta-line-onboarding/scripts/browser-steps.js) 及 [使用方法](skills/chatbotta-line-onboarding/references/script-usage.md)，支援開啟新／既有 LINE 連線、重新驗證或儲存 token、複製貼上、核對 Webhook 目標及一次處理回應開關。使用已登入的 Codex Browser Tab；腳本只回傳 token 驗證與 Webhook 比對狀態，不輸出完整網址或憑證。

已知頁面直接用 locator 與條件等待；同頁相依操作放同一段腳本。每階段取得一次成功證據就繼續，定位失敗才讀一次局部結構修正。snapshot 是例外處理，不是每一步必做；不反覆重現錯誤、不盲目重送建立／Issue／部署。

啟用 API 前就預期下一頁包含 Channel secret；避免整頁讀取。Provider／Channel 載入中不能判成空清單；舊 Manager 頁面上的空 URL 不能直接判成後端未設定。

## 授權與資料

沿用本次已回答資料，標準 OA／API 條款與必要確認依建立／串接委託代辦，不逐頁重問。選填政策網址空白即可。新 Provider 選項包含確切名稱；業種允許代選時直接處理。Email 優先用已提供或適用的預填資料；範例 email 只限客戶允許、可編輯且不需收信驗證／登入／復原的測試聯絡欄位。所在地必須真實。

沿用既有 Channel；既有 token 輪替須有明確授權。切換其他平台、未指定的帳號／Provider、額外費用及額外資料授權須確認差異。部署不夾帶未授權草稿。若客戶要求只讀或不部署，遵從該限制。

token／secret 不進入參數、返回值、對話、檔案、截圖或記錄。腳本僅點複製與直接貼上；宿主無法避免秘密記錄時，才請客戶完成該最小步驟。

官方文件：[建立帳號與啟用 API](https://developers.line.biz/en/docs/messaging-api/getting-started/)、[Webhook 事件](https://developers.line.biz/en/docs/messaging-api/receiving-messages/)。
