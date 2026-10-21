import { expect } from "@playwright/test"
import { openContractStory } from "./visual-shared-contracts.mjs"

/** @import { Page } from "@playwright/test" */

// Public contract values, not values scraped from a potentially broken proxy.
// Native resets are silent for EVERY adapter: uncontrolled values restore their
// defaults; controlled values re-sync to their parent, without a change proposal.
// Cancellation must preserve all channels and never notify.
export const nativeFormAdapters = [
  {
    id: "checkbox",
    kind: "check",
    role: "checkbox",
    initial: [],
    changed: ["yes"],
    visible: [false, true],
  },
  {
    id: "form-checkbox",
    kind: "check",
    role: "checkbox",
    initial: [],
    changed: ["yes"],
    visible: [false, true],
  },
  {
    id: "switch",
    kind: "check",
    role: "switch",
    initial: [],
    changed: ["yes"],
    visible: [false, true],
  },
  {
    id: "radio-group",
    kind: "radio",
    initial: ["alpha"],
    changed: ["beta"],
    visible: ["alpha", "beta"],
  },
  {
    id: "radio-card",
    kind: "radio",
    initial: ["alpha"],
    changed: ["beta"],
    visible: ["alpha", "beta"],
  },
  {
    id: "rating",
    kind: "rating",
    initial: ["2"],
    changed: ["3"],
    visible: ["2", "3"],
  },
  {
    id: "slider",
    kind: "slider",
    initial: ["20"],
    changed: ["21"],
    visible: ["20", "21"],
  },
  {
    id: "input",
    kind: "text",
    initial: ["Alpha"],
    changed: ["Beta"],
    visible: ["Alpha", "Beta"],
  },
  {
    id: "textarea",
    kind: "text",
    initial: ["Alpha"],
    changed: ["Beta"],
    visible: ["Alpha", "Beta"],
  },
  {
    id: "numeric-input",
    kind: "number",
    initial: ["20"],
    changed: ["21"],
    visible: ["20", "21"],
  },
  {
    id: "phone-input",
    kind: "phone",
    initial: ["+421900123456"],
    changed: ["+421901123456"],
    visible: ["900 123 456", "901 123 456"],
  },
  {
    id: "select",
    kind: "select",
    initial: ["alpha"],
    changed: ["beta"],
    visible: ["Alpha", "Beta"],
  },
  {
    id: "combobox",
    kind: "combobox",
    initial: ["alpha"],
    changed: ["beta"],
    visible: ["Alpha", "Beta"],
  },
  {
    id: "cascade-select",
    kind: "cascade",
    initial: ["alpha"],
    changed: ["beta"],
    visible: ["Alpha", "Beta"],
  },
  {
    id: "date-picker",
    kind: "date",
    initial: ["2026-08-20"],
    changed: ["2026-08-21"],
    visible: ["20", "21"],
  },
]

export const nativeResetCancellations = [
  "none",
  "early-native",
  "late-native",
  "early-react",
  "late-react",
]

/** @param {Page} page @param {string} control @param {Record<string, string>} [options] */
export async function openNativeFormFixture(page, control, options = {}) {
  const { brand = "base", mode = "light", baseURL, ...args } = options
  await openContractStory(page, "testing-native-form-contracts--playground", {
    brand,
    mode,
    baseURL,
    args: Object.entries({
      control,
      authority: "uncontrolled",
      cancellation: "none",
      placement: "body",
      ...args,
    })
      .map(([name, value]) => `${name}:${value}`)
      .join(";"),
  })
  await expect(page.getByTestId("change-count")).toHaveText("0")
}

/** @param {Page} page @param {(typeof nativeFormAdapters)[number]} adapter */
export function nativeValueTarget(page, adapter) {
  const root = page.getByTestId("value-control")
  switch (adapter.kind) {
    case "check":
      return root.getByRole(adapter.role)
    case "radio":
      return root.getByRole("radio").first()
    case "rating":
      return root.getByRole("radio").nth(1)
    case "slider":
      return root.getByRole("slider")
    case "number":
      return root.getByRole("spinbutton")
    case "phone":
      return root.locator('input[type="tel"]')
    case "combobox":
      return root.getByRole("combobox")
    case "select":
    case "cascade":
      return root.locator('[data-part="trigger"]').first()
    case "date":
      return root.getByRole("spinbutton", { name: /day/i })
    default:
      return root.getByRole("textbox")
  }
}

/** One user value proposal per adapter; callback counts are asserted separately.
 * @param {Page} page @param {(typeof nativeFormAdapters)[number]} adapter
 */
export async function editNativeValue(page, adapter) {
  const target = nativeValueTarget(page, adapter)
  switch (adapter.kind) {
    case "check":
      await target.focus()
      await target.press(" ")
      break
    case "radio":
      await target.focus()
      await target.press("ArrowDown")
      break
    case "rating":
    case "slider":
      await target.focus()
      await target.press("ArrowRight")
      break
    case "number":
      await target.focus()
      await target.press("ArrowUp")
      break
    case "date":
      // Commit a calendar selection rather than inspect a still-focused segment
      // draft; the lifecycle matrix compares committed values across controls.
      await page
        .getByTestId("value-control")
        .locator('[data-scope="date-picker"][data-part="trigger"]')
        .click()
      await page
        .locator('[data-part="table-cell-trigger"][data-value="2026-08-21"]')
        .click()
      break
    case "select":
      await target.click()
      await page.getByRole("option", { name: "Beta", exact: true }).click()
      break
    case "cascade":
      await target.click()
      await page.getByRole("treeitem", { name: "Beta", exact: true }).click()
      break
    case "combobox":
      await target.fill("Beta")
      await page.getByRole("option", { name: "Beta", exact: true }).click()
      break
    case "phone":
      await target.fill("901123456")
      break
    default:
      await target.fill("Beta")
  }
  await page.keyboard.press("Tab")
}

/** Read independent rendered/accessibility/native channels in one browser turn.
 * @param {Page} page @param {(typeof nativeFormAdapters)[number]} adapter
 */
export function readNativeFormState(page, adapter) {
  return page.evaluate(({ kind, role }) => {
    const root = document.querySelector('[data-testid="value-control"]')
    const input = root.querySelector('input:not([type="hidden"]), textarea')
    const selectors = {
      check: `[role="${role}"], input[type="checkbox"]`,
      radio: '[role="radio"][aria-checked="true"], input[type="radio"]:checked',
      rating: '[role="radio"][aria-checked="true"]',
      slider: '[role="slider"]',
      number: '[role="spinbutton"]',
      date: '[role="spinbutton"][data-type="day"]',
      select: '[data-part="trigger"]',
      cascade: '[data-part="trigger"]',
      combobox: '[role="combobox"]',
    }
    const target = selectors[kind] ? root.querySelector(selectors[kind]) : input
    const valueText = () =>
      root.querySelector('[data-part="value-text"]').textContent.trim()
    const visibleReaders = {
      check: () => target.checked,
      radio: () =>
        target.getAttribute("value") ?? target.getAttribute("data-value"),
      rating: () => {
        const scoreId = root
          .querySelector('[role="radiogroup"]')
          .getAttribute("aria-describedby")
          .split(" ")[0]
        return document.getElementById(scoreId).textContent.split(" / ")[0]
      },
      slider: () => target.getAttribute("aria-valuenow"),
      date: () => target.textContent,
      select: valueText,
      cascade: valueText,
    }
    const visible = visibleReaders[kind]?.() ?? target.value
    const checked = () =>
      target.getAttribute("aria-checked") ?? String(target.checked)
    const valueNow = () => target.getAttribute("aria-valuenow")
    const expanded = () => target.getAttribute("aria-expanded")
    const accessibleReaders = {
      check: checked,
      radio: checked,
      rating: checked,
      slider: valueNow,
      date: valueNow,
      number: valueNow,
      select: expanded,
      cascade: expanded,
      combobox: expanded,
    }
    const accessibility =
      accessibleReaders[kind]?.() ?? (target.readOnly ? "readonly" : "editable")
    const formValues = (id) =>
      Array.from(new FormData(document.getElementById(id)))
        .filter(([name]) => /^value(?:\[.*\])?$/.test(name))
        .map(([, value]) => String(value))
    return {
      visible,
      accessibility,
      disabled: !!target?.matches(':disabled, [aria-disabled="true"]'),
      inaccessible: !!target?.closest('[inert], [aria-hidden="true"]'),
      formA: formValues("native-contract-a"),
      formB: formValues("native-contract-b"),
      callbacks: Number(
        document.querySelector('[data-testid="change-count"]').textContent
      ),
    }
  }, adapter)
}

/** Assert rendered, accessible and submitted values plus the exact proposal count.
 * @param {Page} page @param {(typeof nativeFormAdapters)[number]} adapter
 * @param {{changed?: boolean, callbacks?: number, owner?: string, disabled?: boolean}} [options]
 */
export async function assertNativeFormState(page, adapter, options = {}) {
  const {
    changed = false,
    callbacks = 0,
    owner = "a",
    disabled = false,
  } = options
  const expectedValues = disabled
    ? []
    : adapter[changed ? "changed" : "initial"]
  let accessibility
  if (adapter.kind === "check") {
    accessibility = String(changed)
  } else if (adapter.kind === "radio" || adapter.kind === "rating") {
    accessibility = "true"
  } else if (["slider", "date", "number"].includes(adapter.kind)) {
    accessibility = adapter.visible[Number(changed)]
  } else if (["select", "cascade", "combobox"].includes(adapter.kind)) {
    accessibility = "false"
  } else {
    accessibility = "editable"
  }
  await expect
    .poll(() => readNativeFormState(page, adapter), {
      message: `${adapter.id}: rendered value, accessibility, FormData and callback count must agree`,
    })
    .toEqual({
      visible: adapter.visible[Number(changed)],
      accessibility,
      disabled,
      inaccessible: false,
      formA: owner === "a" ? expectedValues : [],
      formB: owner === "b" ? expectedValues : [],
      callbacks,
    })
}

/** @param {Page} page @param {(typeof nativeFormAdapters)[number]} adapter @param {string} cancellation @param {Record<string, string>} [options] */
export async function checkNativeReset(
  page,
  adapter,
  cancellation,
  options = {}
) {
  await openNativeFormFixture(page, adapter.id, { ...options, cancellation })
  await assertNativeFormState(page, adapter)
  await editNativeValue(page, adapter)
  await assertNativeFormState(page, adapter, { changed: true, callbacks: 1 })
  await page.getByRole("button", { name: "Reset A", exact: true }).click()
  await expect(page.getByTestId("reset-count")).toHaveText("1")
  // Real native activation may flush microtasks between event listeners. Inspect
  // after the default action and deferred lifecycle reset (not dispatchEvent).
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 30)))
  await assertNativeFormState(page, adapter, {
    changed: cancellation !== "none",
    callbacks: 1,
  })
  if (cancellation === "none") {
    // A reset must update React's native value tracker too: editing the same
    // value again must not disappear as a duplicate input/change event.
    await editNativeValue(page, adapter)
    await assertNativeFormState(page, adapter, { changed: true, callbacks: 2 })
    await page.getByRole("button", { name: "Reset A", exact: true }).click()
    await expect(page.getByTestId("reset-count")).toHaveText("2")
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 30)))
    await assertNativeFormState(page, adapter, { callbacks: 2 })
  }
}

/** @param {Page} page @param {(typeof nativeFormAdapters)[number]} adapter @param {string} authority @param {Record<string, string>} [options] */
export async function checkNativeAuthority(
  page,
  adapter,
  authority,
  options = {}
) {
  await openNativeFormFixture(page, adapter.id, { ...options, authority })
  await editNativeValue(page, adapter)
  const changed = authority === "accept"
  await assertNativeFormState(page, adapter, { changed, callbacks: 1 })
  // The controlled value must differ from the default to expose an illegal
  // native reset even when the parent refused the preceding user proposal.
  if (!changed) {
    await page
      .getByRole("button", { name: "Set parent value", exact: true })
      .click()
    await assertNativeFormState(page, adapter, { changed: true, callbacks: 1 })
  }
  await page.getByRole("button", { name: "Reset A", exact: true }).click()
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 30)))
  await assertNativeFormState(page, adapter, {
    changed: true,
    callbacks: 1,
  })
}

/** Calendar selection and segmented editing are independent mutation paths.
 * Assert authority while focused AND after blur; neither may leave a refused
 * draft visible or emit a second callback for the same keyboard proposal.
 * @param {Page} page @param {string} authority @param {Record<string, string>} [options]
 */
export async function checkNativeDateKeyboardAuthority(
  page,
  authority,
  options = {}
) {
  const adapter = nativeFormAdapters.find(({ id }) => id === "date-picker")
  await openNativeFormFixture(page, adapter.id, { ...options, authority })
  await assertNativeFormState(page, adapter)
  const day = nativeValueTarget(page, adapter)
  await day.focus()
  await day.press("ArrowUp")
  await expect(day).toBeFocused()
  const state = { changed: authority === "accept", callbacks: 1 }
  await assertNativeFormState(page, adapter, state)
  await page.getByRole("button", { name: "Reset B", exact: true }).focus()
  await assertNativeFormState(page, adapter, state)
  await page.getByRole("button", { name: "Reset A", exact: true }).click()
  await expect(page.getByTestId("reset-count")).toHaveText("1")
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 30)))
  await assertNativeFormState(page, adapter, state)
}

const auditedPages = new WeakSet()

/** Count actual form-target reset subscriptions; cancellation timing remains native.
 * @param {Page} page
 */
async function installNativeListenerAudit(page) {
  if (auditedPages.has(page)) {
    return
  }
  auditedPages.add(page)
  await page.addInitScript(() => {
    const registrations = new Map()
    const add = EventTarget.prototype.addEventListener
    const remove = EventTarget.prototype.removeEventListener
    const track = (target, type, listener, options, adding) => {
      if (type !== "reset" || !(target instanceof HTMLFormElement)) {
        return
      }
      const capture =
        typeof options === "boolean" ? options : !!options?.capture
      let listeners = registrations.get(target)
      if (!listeners) {
        listeners = new Map()
        registrations.set(target, listeners)
      }
      const phases = listeners.get(listener) ?? new Set()
      if (adding) {
        phases.add(capture)
      } else {
        phases.delete(capture)
      }
      listeners.set(listener, phases)
    }
    EventTarget.prototype.addEventListener = function (
      type,
      listener,
      options
    ) {
      track(this, type, listener, options, true)
      return add.call(this, type, listener, options)
    }
    EventTarget.prototype.removeEventListener = function (
      type,
      listener,
      options
    ) {
      track(this, type, listener, options, false)
      return remove.call(this, type, listener, options)
    }
    window.__NATIVE_FORM_LISTENERS__ = () => {
      let count = 0
      for (const [form, listeners] of registrations) {
        if (!form.id.startsWith("native-contract-")) {
          continue
        }
        for (const phases of listeners.values()) {
          count += phases.size
        }
      }
      return count
    }
  })
}

/** @param {Page} page @param {(typeof nativeFormAdapters)[number]} adapter @param {Record<string, string>} [options] */
export async function checkNativeOwnership(page, adapter, options = {}) {
  await installNativeListenerAudit(page)
  await openNativeFormFixture(page, adapter.id, options)
  const listenerCount = () =>
    page.evaluate(() => window.__NATIVE_FORM_LISTENERS__())
  const mountedListeners = await listenerCount()
  await editNativeValue(page, adapter)
  await page
    .getByRole("button", { name: "Change form owner", exact: true })
    .click()
  await assertNativeFormState(page, adapter, {
    changed: true,
    callbacks: 1,
    owner: "b",
  })
  await page.getByRole("button", { name: "Reset A", exact: true }).click()
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 30)))
  await assertNativeFormState(page, adapter, {
    changed: true,
    callbacks: 1,
    owner: "b",
  })
  await page.getByRole("button", { name: "Reset B", exact: true }).click()
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 30)))
  await assertNativeFormState(page, adapter, {
    callbacks: 1,
    owner: "b",
  })
  await page
    .getByRole("button", { name: "Change form owner", exact: true })
    .click()
  await editNativeValue(page, adapter)
  await page.getByRole("button", { name: "Reset B", exact: true }).click()
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 30)))
  await assertNativeFormState(page, adapter, {
    changed: true,
    callbacks: 2,
  })
  await page
    .getByRole("button", { name: "Toggle control", exact: true })
    .click()
  await expect
    .poll(listenerCount, {
      message: `${adapter.id}: unmount removes form reset listeners`,
    })
    .toBe(0)
  await page.getByRole("button", { name: "Reset A", exact: true }).click()
  await page.getByRole("button", { name: "Reset B", exact: true }).click()
  await page
    .getByRole("button", { name: "Toggle control", exact: true })
    .click()
  await expect
    .poll(listenerCount, {
      message: `${adapter.id}: remount has no duplicate reset subscriptions`,
    })
    .toBe(mountedListeners)
  await assertNativeFormState(page, adapter, { callbacks: 2 })
  await editNativeValue(page, adapter)
  await page.getByRole("button", { name: "Reset A", exact: true }).click()
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 30)))
  await assertNativeFormState(page, adapter, {
    callbacks: 3,
  })
}

/** @param {Page} page @param {(typeof nativeFormAdapters)[number]} adapter @param {string} placement @param {Record<string, string>} [options] */
export async function checkNativeFieldsets(
  page,
  adapter,
  placement,
  options = {}
) {
  await openNativeFormFixture(page, adapter.id, { ...options, placement })
  await page
    .getByRole("button", { name: "Toggle outer fieldset", exact: true })
    .click()
  const disabled = placement !== "first-legend"
  await assertNativeFormState(page, adapter, { disabled })
  if (disabled) {
    // Disabled native/ARIA controls must reject keyboard proposals as well as
    // omit the submitted proxy; focusing a native disabled input is a no-op.
    const target = nativeValueTarget(page, adapter)
    await page.getByTestId("native-form-fixture").focus()
    await target.focus()
    await page.keyboard.press(adapter.kind === "check" ? " " : "ArrowRight")
    await assertNativeFormState(page, adapter, { disabled: true })
  } else {
    await editNativeValue(page, adapter)
    await assertNativeFormState(page, adapter, { changed: true, callbacks: 1 })
  }
  await page
    .getByRole("button", { name: "Toggle outer fieldset", exact: true })
    .click()
  if (placement === "nested-first-legend") {
    await page
      .getByRole("button", { name: "Toggle inner fieldset", exact: true })
      .click()
    await assertNativeFormState(page, adapter) // first legend of inner is exempt
  }
  if (disabled) {
    await editNativeValue(page, adapter)
    await assertNativeFormState(page, adapter, { changed: true, callbacks: 1 })
  }
}
