# Chatbotta Claude 外掛

在 Claude 使用 [Chatbotta（創易聊）](https://chatbotta.com)：查詢專案、檢查 LINE 頻道設定與流程部署狀態。

## 安裝

1. 在 Claude（網頁版、桌面版或 Cowork）開啟 **Customize → Plugins → Add marketplace**。
2. 輸入 `Chatbotta/claude-plugins`。
3. 在清單中安裝 **Chatbotta**。
4. 依提示以 Chatbotta 帳號登入連接器。

需使用 Claude 付費方案。若連接器未自動出現，可在 **Customize → Connectors** 新增遠端 MCP：`https://api.chatbotta.com/mcp`。

## 內容

- `plugins/chatbotta/.mcp.json`：Chatbotta MCP 連接器（OAuth 登入，不含任何金鑰）
- `plugins/chatbotta/skills/chatbotta-assistant`：引導 Claude 核對專案與頻道狀態的技能
