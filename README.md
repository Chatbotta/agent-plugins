# Chatbotta 外掛

在 AI 助手中使用 [Chatbotta（創易聊）](https://chatbotta.com)。兩個外掛都連到 Chatbotta MCP（`https://api.chatbotta.com/mcp`），由使用者以自己的 Chatbotta 帳號登入授權，不含任何金鑰。

| 宿主 | 外掛 | 功能 |
|---|---|---|
| Claude（網頁版、桌面版、Cowork） | [`plugins/claude/chatbotta`](plugins/claude/chatbotta) | 查詢專案、檢查 LINE 頻道設定與流程部署狀態 |
| Codex | [`plugins/codex/chatbotta`](plugins/codex/chatbotta) | 以內建 Browser 引導 LINE 官方帳號串接、驗證並測試收發 |

## 安裝：Claude

1. 開啟 **Customize → Plugins → Add marketplace**。
2. 輸入 `Chatbotta/agent-plugins`。
3. 在清單中安裝 **Chatbotta**，依提示以 Chatbotta 帳號登入連接器。

需使用 Claude 付費方案。若連接器未自動出現，可在 **Customize → Connectors** 新增遠端 MCP：`https://api.chatbotta.com/mcp`。

## 安裝：Codex

```sh
codex plugin marketplace add Chatbotta/agent-plugins
```

重新啟動 Codex，在 Plugins Directory 選擇 **Chatbotta** marketplace 並安裝 **Chatbotta**，依提示登入。更新：`codex plugin marketplace upgrade chatbotta-plugins`。

## 開發

- 更新外掛時調高各自 `plugin.json` 的 `version`。
- Claude manifest 檢查：`claude plugin validate .` 與 `claude plugin validate plugins/claude/chatbotta`
- Codex 腳本測試：`node --test plugins/codex/chatbotta/tests/browser-steps.test.mjs`
