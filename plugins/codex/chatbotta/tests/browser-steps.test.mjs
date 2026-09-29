import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const helperPath = new URL('../skills/chatbotta-line-onboarding/scripts/browser-steps.js', import.meta.url)
const source = await readFile(helperPath, 'utf8')
const context = { URL, globalThis: {} }
vm.runInNewContext(`${source}\nglobalThis.chatbottaStep = chatbottaStep`, context)

function makeTab(currentWebhookUrl) {
  const state = { currentWebhookUrl, nextWebhookUrl: currentWebhookUrl }
  class Locator {
    constructor(selector) { this.selector = selector }
    first() { return this }
    filter() { return this }
    locator(selector) { return new Locator(`${this.selector} ${selector}`) }
    getByText(text) { return new Locator(`${this.selector} text:${text}`) }
    async waitFor() {}
    async count() { return 1 }
    async evaluate(fn) { return fn({ value: state.currentWebhookUrl }) }
    async fill(value) { state.nextWebhookUrl = value }
    async click() { state.currentWebhookUrl = state.nextWebhookUrl }
  }
  const tab = {
    playwright: { locator: (selector) => new Locator(selector) },
    async url() { return 'https://manager.line.biz/account/@example' },
    async reload() {}
  }
  return { tab, state }
}

function makeChatbottaTabWithWaitEvents({ inputVisible = false, partialSetupFailure = false } = {}) {
  const waits = []
  const clicks = []
  const state = { inputVisible, dialogVisible: false, partialSetupFailure }
  class Locator {
    constructor(selector) { this.selector = selector }
    first() { return this }
    filter() { return this }
    locator(selector) { return new Locator(`${this.selector} ${selector}`) }
    async waitFor(options) {
      waits.push({ selector: this.selector, state: options.state })
      if (this.selector.includes("貼上 Messaging API 的 Channel Access Token") && options.state === 'visible') {
        state.inputVisible = true
      }
    }
    async count() { return 1 }
    async isVisible() {
      if (this.selector.includes('貼上 Messaging API 的 Channel Access Token')) return state.inputVisible
      if (this.selector.includes(".line-connect > p[role='alert']")) return state.partialSetupFailure
      if (this.selector.includes('更換 Token')) return state.dialogVisible
      if (this.selector.includes('重新驗證')) return state.dialogVisible
      return true
    }
    getByText(text) { return new Locator(`${this.selector} text:${text}`) }
    async click() {
      clicks.push(this.selector)
      if (this.selector.includes('connection-card')) state.dialogVisible = true
      if (this.selector.includes('button.provider-option')) state.dialogVisible = true
      if (this.selector.includes('更換 Token')) state.inputVisible = true
      if (this.selector.includes('儲存並驗證')) state.inputVisible = false
    }
    async press() {}
  }
  const page = {
    locator: (selector) => new Locator(selector),
    getByRole: (role, options) => new Locator(`role:${role}:${options.name}`),
    getByText: (text) => new Locator(`text:${text}`)
  }
  const tab = {
    playwright: page,
    async url() { return 'https://app.chatbotta.com/project/settings?section=channels' },
    async reload() {}
  }
  return { tab, waits, clicks }
}

function makeResponseTab() {
  const state = { webhook: false, autoReply: true, clicks: 0 }
  class Locator {
    constructor(selector) { this.selector = selector }
    first() { return this }
    async waitFor() {}
    async count() { return 1 }
    async evaluate(fn) {
      const checked = this.selector.includes('webhook-setting') ? state.webhook : state.autoReply
      return fn({ checked })
    }
    async click() {
      state.clicks++
      if (this.selector.includes('webhook-setting')) state.webhook = true
      if (this.selector.includes('auto-response-setting')) state.autoReply = false
    }
  }
  const tab = {
    playwright: { locator: (selector) => new Locator(selector) },
    async url() { return 'https://manager.line.biz/account/@example/setting/response' },
    async reload() {}
  }
  return { tab, state }
}

const expectedUrl = 'https://manager.line.biz/account/@example'

test('read-webhook reports state without returning a URL that contains a credential', async () => {
  const sensitiveUrl = 'https://collector.example/webhook/opaque-secret'
  const { tab } = makeTab(sensitiveUrl)
  const result = await context.globalThis.chatbottaStep(tab, {
    op: 'read-webhook', expectedUrl, chatbotId: 'project-id'
  })

  assert.equal(result.ok, true)
  assert.equal(result.configured, true)
  assert.equal(result.matchesProjectEndpoint, false)
  assert.equal(JSON.stringify(result).includes(sensitiveUrl), false)
})

test('the Browser helper does not manually set a Webhook URL in LINE Manager', async () => {
  const sensitiveUrl = 'https://collector.example/webhook/opaque-secret'
  const { tab, state } = makeTab(sensitiveUrl)
  const result = await context.globalThis.chatbottaStep(tab, {
    op: 'set-webhook', expectedUrl, chatbotId: 'project-id'
  })

  assert.equal(result.ok, false)
  assert.equal(result.reason, 'unsupported-operation')
  assert.equal(state.currentWebhookUrl, sensitiveUrl)
  assert.equal(JSON.stringify(result).includes(sensitiveUrl), false)
})

test('prepare-token opens the existing LINE card and the new Change Token form', async () => {
  const { tab, clicks } = makeChatbottaTabWithWaitEvents()
  const result = await context.globalThis.chatbottaStep(tab, {
    op: 'prepare-token',
    expectedUrl: 'https://app.chatbotta.com/project/settings?section=channels',
    existingConnection: true
  })

  assert.equal(result.ok, true)
  assert.equal(result.inputReady, true)
  assert.ok(clicks.some((selector) => selector.includes('connection-card')))
  assert.ok(clicks.some((selector) => selector.includes('更換 Token')))
})

test('prepare-token starts a new connection through Add Connection and LINE', async () => {
  const { tab, clicks } = makeChatbottaTabWithWaitEvents()
  const result = await context.globalThis.chatbottaStep(tab, {
    op: 'prepare-token',
    expectedUrl: 'https://app.chatbotta.com/project/settings?section=channels'
  })

  assert.equal(result.ok, true)
  assert.equal(result.inputReady, true)
  assert.ok(clicks.some((selector) => selector.includes('新增連線')))
  assert.ok(clicks.some((selector) => selector.includes('button.provider-option')))
})

test('verify-token uses the current Reverify action without opening token replacement', async () => {
  const { tab, clicks, waits } = makeChatbottaTabWithWaitEvents()
  const result = await context.globalThis.chatbottaStep(tab, {
    op: 'verify-token',
    expectedUrl: 'https://app.chatbotta.com/project/settings?section=channels'
  })

  assert.equal(result.ok, true)
  assert.equal(result.tokenVerified, true)
  assert.ok(clicks.some((selector) => selector.includes('connection-card')))
  assert.ok(clicks.some((selector) => selector.includes('重新驗證')))
  assert.equal(clicks.some((selector) => selector.includes('更換 Token')), false)
  assert.ok(waits.some((wait) => wait.selector.includes('line-token-status') && wait.selector.includes('已啟用')))
})

test('paste-save-token uses the new field and waits for the form to close before token status', async () => {
  const { tab, waits, clicks } = makeChatbottaTabWithWaitEvents({ inputVisible: true })
  const result = await context.globalThis.chatbottaStep(tab, {
    op: 'paste-save-token', expectedUrl: 'https://app.chatbotta.com/project/settings?section=channels'
  })

  assert.equal(result.ok, true)
  const inputSelector = "input[placeholder='貼上 Messaging API 的 Channel Access Token']"
  const formClosed = waits.findIndex((wait) => wait.selector === inputSelector && wait.state === 'hidden')
  const tokenConfirmed = waits.findIndex((wait) => wait.selector.includes('已啟用') && wait.state === 'visible')
  assert.notEqual(formClosed, -1)
  assert.notEqual(tokenConfirmed, -1)
  assert.ok(formClosed < tokenConfirmed)
  assert.ok(clicks.some((selector) => selector.includes('儲存並驗證')))
})

test('paste-save-token reports partial setup failure without exposing alert text', async () => {
  const { tab } = makeChatbottaTabWithWaitEvents({ inputVisible: true, partialSetupFailure: true })
  const result = await context.globalThis.chatbottaStep(tab, {
    op: 'paste-save-token', expectedUrl: 'https://app.chatbotta.com/project/settings?section=channels'
  })

  assert.equal(result.ok, false)
  assert.equal(result.reason, 'token-saved-partial-failure')
  assert.equal(JSON.stringify(result).includes('Webhook 網址設定失敗'), false)
})

test('configure-response will not enable LINE Webhook before its target is verified', async () => {
  const { tab, state } = makeResponseTab()
  const result = await context.globalThis.chatbottaStep(tab, {
    op: 'configure-response',
    expectedUrl: 'https://manager.line.biz/account/@example/setting/response',
    webhookConfigured: true,
    matchesProjectEndpoint: false
  })

  assert.equal(result.ok, false)
  assert.equal(result.reason, 'webhook-endpoint-unverified')
  assert.equal(state.webhook, false)
  assert.equal(state.clicks, 0)
})
