// Pass a Codex in-app Browser Tab; use its built-in tab.playwright locator API.
// input contains public target URLs, selectors and options only. Never credentials.
async function chatbottaStep(tab, input) {
  const page = tab?.playwright;
  let stage = "target";
  const fail = (reason) => { throw new Error(reason); };
  const timeout = 10000;
  const allowedOrigins = new Set([
    "https://app.chatbotta.com",
    "https://manager.line.biz",
    "https://developers.line.biz"
  ]);
  const publicErrors = new Set([
    "browser-unavailable", "wrong-target", "unsupported-operation", "missing-control",
    "ambiguous-control", "unknown-switch-state", "state-not-saved",
    "invalid-endpoint", "webhook-endpoint-unverified", "token-saved-partial-failure"
  ]);
  try {
    if (!page || typeof tab.url !== "function" || typeof tab.reload !== "function") {
      fail("browser-unavailable");
    }
    const expected = new URL(input.expectedUrl);
    const current = new URL(await tab.url());
    if (!allowedOrigins.has(expected.origin) ||
        current.origin !== expected.origin ||
        current.pathname !== expected.pathname) fail("wrong-target");
    // expectedUrl must come from the already verified target in this session.
    const only = async (locator) => {
      await locator.first().waitFor({ state: "visible", timeoutMs: timeout });
      if (await locator.count() !== 1) fail("ambiguous-control");
      return locator;
    };
    const inputField = () => page.locator("input[placeholder='貼上 Messaging API 的 Channel Access Token']");
    const addConnectionButton = () => page.getByRole("button", { name: "新增連線", exact: true });
    const changeTokenButton = () => page.getByRole("button", { name: "更換 Token", exact: true });
    const lineProviderButton = () => page.locator("button.provider-option").filter({ hasText: "LINE" });
    const lineAccountCard = () => page.locator("button.connection-card").filter({
      has: page.locator('img[alt="LINE"]')
    });
    const tokenRow = () => page.locator("label").filter({
      hasText: /^Channel access token(?:\s*\(long-lived\))?\s*$/i
    }).locator("xpath=..");

    stage = input.op;
    if (input.op === "prepare-token") {
      if (expected.origin !== "https://app.chatbotta.com") fail("wrong-target");
      if (!await inputField().isVisible()) {
        if (await changeTokenButton().isVisible()) {
          await (await only(changeTokenButton())).click({ timeoutMs: timeout });
        } else if (input.existingConnection === true) {
          await (await only(lineAccountCard())).click({ timeoutMs: timeout });
          if (!await inputField().isVisible()) {
            await (await only(changeTokenButton())).click({ timeoutMs: timeout });
          }
        } else {
          await (await only(addConnectionButton())).click({ timeoutMs: timeout });
          await (await only(lineProviderButton())).click({ timeoutMs: timeout });
        }
      }
      await only(inputField());
      return { ok: true, stage, inputReady: true };
    }
    if (input.op === "verify-token") {
      if (expected.origin !== "https://app.chatbotta.com") fail("wrong-target");
      const verify = page.getByRole("button", { name: "重新驗證", exact: true });
      if (!await verify.isVisible()) {
        await (await only(lineAccountCard())).click({ timeoutMs: timeout });
      }
      await (await only(verify)).click({ timeoutMs: timeout });
      // Wait for the request to settle; do not reuse the pre-click enabled status.
      await page.locator('.line-connect button:disabled').first().waitFor({
        state: "hidden", timeoutMs: 20000
      });
      if (await page.locator(".line-connect > p[role='alert']").isVisible()) {
        fail("control-or-wait-failed");
      }
      await page.locator('[data-testid="line-token-status"]').getByText("已啟用", { exact: true }).waitFor({
        state: "visible", timeoutMs: 20000
      });
      return { ok: true, stage, tokenVerified: true };
    }
    if (input.op === "copy-token") {
      if (expected.origin !== "https://developers.line.biz") fail("wrong-target");
      await (await only(tokenRow().locator(".copy-btn"))).click({ timeoutMs: timeout });
      return { ok: true, stage, copyClicked: true };
    }
    if (input.op === "inspect-token-controls") {
      if (expected.origin !== "https://developers.line.biz") fail("wrong-target");
      // One bounded fallback; never return text, values, HTML or arbitrary attributes.
      const row = await only(tokenRow());
      const controls = await row.evaluate((root) =>
        Array.from(root.querySelectorAll("button,[role='button'],.copy-btn"))
          .slice(0, 12).map((el) => ({
            tag: el.tagName, className: el.className,
            role: el.getAttribute("role"), type: el.getAttribute("type")
          }))
      );
      return { ok: true, stage, controls };
    }
    if (input.op === "paste-save-token") {
      if (expected.origin !== "https://app.chatbotta.com") fail("wrong-target");
      const field = await only(inputField());
      await field.click({ timeoutMs: timeout });
      await field.press(input.macOS === false ? "Control+A" : "Meta+A");
      await field.press(input.macOS === false ? "Control+V" : "Meta+V");
      const save = page.getByRole("button", { name: "儲存並驗證", exact: true });
      await (await only(save)).click({ timeoutMs: timeout });
      // The form closes only after Chatbotta's save request, including LINE webhook setup, finishes.
      await field.waitFor({ state: "hidden", timeoutMs: 20000 });
      // Token storage can succeed while webhook or rich-menu synchronization fails.
      // Detect the UI alert without reading or returning its text.
      if (await page.locator(".line-connect > p[role='alert']").isVisible()) {
        fail("token-saved-partial-failure");
      }
      await page.locator('[data-testid="line-token-status"]').getByText("已啟用", { exact: true }).waitFor({
        state: "visible", timeoutMs: timeout
      });
      return { ok: true, stage, tokenVerified: true };
    }
    if (input.op === "read-webhook") {
      if (expected.origin !== "https://manager.line.biz") fail("wrong-target");
      if (typeof input.chatbotId !== "string" || !input.chatbotId.trim() ||
          /[/?#]/.test(input.chatbotId)) fail("invalid-endpoint");
      const apiOrigin = new URL(input.apiOrigin || "https://api.chatbotta.com");
      if (apiOrigin.protocol !== "https:" || apiOrigin.username || apiOrigin.password ||
          apiOrigin.pathname !== "/" || apiOrigin.search || apiOrigin.hash) fail("invalid-endpoint");
      const expectedEndpoint = new URL(
        `/webhook/line/${encodeURIComponent(input.chatbotId)}`,
        apiOrigin.origin
      ).href;
      await tab.reload();
      const row = page.locator(".form-group").filter({
        has: page.locator("label").filter({ hasText: /^Webhook網址$/ })
      });
      const field = await only(row.locator("input"));
      const currentUrl = (await field.evaluate((el) => el.value)).trim();
      return {
        ok: true,
        stage,
        configured: !!currentUrl,
        matchesProjectEndpoint: currentUrl === expectedEndpoint
      };
    }
    if (input.op === "configure-response") {
      if (expected.origin !== "https://manager.line.biz" ||
          !expected.pathname.endsWith("/setting/response")) fail("wrong-target");
      if (input.webhookConfigured !== true || input.matchesProjectEndpoint !== true) {
        fail("webhook-endpoint-unverified");
      }
      const webhook = page.locator("main.settings-content .webhook-setting shared-switch");
      const autoReply = page.locator("main.settings-content .auto-response-setting shared-switch");
      const read = async (locator) => {
        await only(locator);
        return locator.evaluate((el) => {
          if (typeof el.checked === "boolean") return el.checked;
          const aria = el.getAttribute("aria-checked");
          if (aria === "true" || aria === "false") return aria === "true";
          if (el.tagName === "SHARED-SWITCH") return el.hasAttribute("checked");
          return null;
        });
      };
      const before = { webhook: await read(webhook), autoReply: await read(autoReply) };
      if (before.webhook === null || before.autoReply === null) fail("unknown-switch-state");
      if (!before.webhook) await webhook.click({ timeoutMs: timeout });
      const wantedAuto = input.keepAutoReply === true ? before.autoReply : false;
      if (before.autoReply !== wantedAuto) await autoReply.click({ timeoutMs: timeout });
      // Supply saveSelector only when the observed page explicitly requires Save.
      if (input.saveSelector) {
        await (await only(page.locator(input.saveSelector))).click({ timeoutMs: timeout });
      }
      await tab.reload();
      const after = { webhook: await read(webhook), autoReply: await read(autoReply) };
      if (after.webhook !== true || after.autoReply !== wantedAuto) fail("state-not-saved");
      return { ok: true, stage, ...after };
    }
    fail("unsupported-operation");
  } catch (error) {
    // Browser API errors can contain page text. Return a fixed diagnostic only.
    const reason = publicErrors.has(error.message) ? error.message : "control-or-wait-failed";
    return { ok: false, stage, reason };
  }
}
