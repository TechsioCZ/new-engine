import { expect } from "@playwright/test"

/** @import { Page, Locator } from "@playwright/test" */

/**
 * @typedef {"info" | "success" | "warning" | "error" | "loading"} ToastType
 * @typedef {{ type: ToastType, title: string, description: string, closable?: boolean, action?: string }} ToastSpec
 * @typedef {{ control: string } | { toastButton: string }} ToastReset
 * @typedef {{
 *   appearance: string,
 *   press: string[],
 *   hover?: string,
 *   reachableControls?: string[],
 *   toasts: ToastSpec[],
 *   hold: "paused" | "persistent",
 *   check?: (page: Page) => Promise<void>,
 *   reset?: ToastReset[],
 * }} ToastStep
 */

const close = { toastButton: "Close notification" }

/** Timed toasts are held by their authored pause control or the region hover
 * pause; persistent ones (Infinity or loading) never start a dismissal timer.
 * @type {Record<string, ToastStep[]>}
 */
const toastCheckpoints = {
  "molecules-toast--playground": [
    {
      appearance: "success-hover-paused",
      press: ["Show Toast"],
      hover: "Project saved",
      toasts: [
        {
          type: "success",
          title: "Project saved",
          description: "Your teammates can see the latest changes.",
        },
      ],
      hold: "paused",
      reset: [close],
    },
  ],
  "molecules-toast--variants": [
    [
      "info",
      "Shipping rates updated",
      "New rates apply to orders placed from today.",
    ],
    ["success", "Order confirmed", "The receipt was sent to the customer."],
    ["warning", "Stock running low", "Only 3 units of this product remain."],
    [
      "error",
      "Payment failed",
      "The card was declined. Try another payment method.",
    ],
    [
      "loading",
      "Uploading product images",
      "Keep this page open until the upload finishes.",
    ],
  ].map(([type, title, description]) => ({
    appearance: `type-${type}`,
    press: [`Show ${type} toast`],
    toasts: [{ type: /** @type {ToastType} */ (type), title, description }],
    hold: "persistent",
    reset: [close],
  })),
  "molecules-toast--update-example": [
    {
      appearance: "original-info",
      press: ["Create Toast"],
      toasts: [
        {
          type: "info",
          title: "Original Toast",
          description: "This is the original message",
        },
      ],
      hold: "persistent",
    },
    {
      appearance: "updating-loading",
      press: ["Update Toast (Step 1)"],
      toasts: [
        { type: "loading", title: "Step 1", description: "Loading data..." },
      ],
      hold: "persistent",
    },
    {
      // Step 2 repeats the loading appearance; pass through it to completion.
      appearance: "updated-success",
      press: ["Update Toast (Step 2)", "Update Toast (Step 3)"],
      toasts: [
        {
          type: "success",
          title: "Complete!",
          description: "Operation successful",
        },
      ],
      hold: "persistent",
      check: async (page) => {
        await expect(control(page, "Update Toast (Step 4)")).toBeDisabled()
      },
      reset: [close],
    },
  ],
  "molecules-toast--remove-vs-dismiss": [
    {
      appearance: "instant-and-animated-stack",
      press: ["Create Toast for Remove", "Create Toast for Dismiss"],
      reachableControls: ["Remove Toast (Instant)", "Dismiss Toast (Animated)"],
      toasts: [
        {
          type: "info",
          title: "I will be removed instantly",
          description: "Click the button below to remove me",
        },
        {
          type: "info",
          title: "I will be dismissed with animation",
          description: "Click the button below to dismiss me",
        },
      ],
      hold: "persistent",
      reset: [
        { control: "Remove Toast (Instant)" },
        { control: "Dismiss Toast (Animated)" },
      ],
    },
  ],
  "molecules-toast--pause-resume-example": [
    {
      appearance: "paused-timer",
      press: ["Create Timed Toast (5s)", "Pause Timer"],
      reachableControls: ["Resume Timer"],
      toasts: [
        {
          type: "info",
          title: "Auto-closing toast",
          description: "I will close in 5 seconds unless paused",
        },
      ],
      hold: "paused",
      check: async (page) => {
        const root = page.locator("#storybook-root")
        await expect(root.getByText("Paused", { exact: true })).toBeVisible()
        await expect(control(page, "Resume Timer")).toBeVisible()
      },
      reset: [close],
    },
  ],
  "molecules-toast--batch-operations": [
    {
      appearance: "stacked-paused-batch",
      press: ["Create 3 Toasts", "Pause All"],
      reachableControls: ["Pause All", "Resume All", "Remove All"],
      toasts: ["success", "info", "warning"].map((type, index) => ({
        type: /** @type {ToastType} */ (type),
        title: `Toast ${index + 1}`,
        description: `This is toast number ${index + 1}`,
      })),
      hold: "paused",
      reset: [{ control: "Remove All" }],
    },
  ],
  "molecules-toast--promise-example": [
    {
      // The story resolves deterministically after its authored 2s delay;
      // hovering then holds the 3s success toast for the capture.
      appearance: "resolved-success",
      press: ["Start Async Operation"],
      hover: "Success!",
      toasts: [
        {
          type: "success",
          title: "Success!",
          description: "Operation completed successfully!",
        },
      ],
      hold: "paused",
      reset: [close],
    },
  ],
  "molecules-toast--with-action": [
    {
      appearance: "undo-action",
      press: ["Archive project"],
      toasts: [
        {
          type: "info",
          title: "Project archived",
          description: "You can restore it before leaving this page.",
          action: "Undo archive",
        },
      ],
      hold: "persistent",
      check: async (page) => {
        await expect(
          page.locator("#storybook-root").getByText("Project archived.", {
            exact: true,
          })
        ).toBeVisible()
      },
      reset: [{ toastButton: "Undo archive" }],
    },
  ],
  "molecules-toast--persistent-loading": [
    {
      appearance: "non-closable-loading",
      press: ["Prepare export"],
      toasts: [
        {
          type: "loading",
          title: "Preparing your project export",
          description: "We will notify you when the download is ready.",
          closable: false,
        },
      ],
      hold: "persistent",
    },
    {
      appearance: "completed-dismissible-success",
      press: ["Finish export"],
      hover: "Your export is ready",
      toasts: [
        {
          type: "success",
          title: "Your export is ready",
          description: "The download is available from your project.",
        },
      ],
      hold: "paused",
      reset: [close],
    },
  ],
  "molecules-toast--long-content": [
    {
      appearance: "wrapped-long-content",
      press: ["Show export notification"],
      toasts: [
        {
          type: "info",
          title:
            "Your project export for the autumn catalogue and all associated product attachments is ready to download",
          description:
            "This notification wraps on narrow screens and keeps its close action visible. Reference: ProjectExport_AutumnCatalogue_ProductAttachments_2026_Complete.",
        },
      ],
      hold: "persistent",
      check: async (page) => {
        const title = page.locator('[data-scope="toast"][data-part="title"]')
        await expect
          .poll(() =>
            title.evaluate(
              (element) =>
                element.getBoundingClientRect().height >
                1.5 * Number.parseFloat(getComputedStyle(element).lineHeight)
            )
          )
          .toBe(true)
      },
      reset: [close],
    },
  ],
}

/** Pure capture inventory for integration checks; no browser work on import. */
export const stateCheckpointAppearances = Object.fromEntries(
  Object.entries(toastCheckpoints).map(([id, steps]) => [
    id,
    steps.map(({ appearance }) => appearance),
  ])
)

/** Exact capture suffixes passed to the parent's capture callback. */
export const stateCheckpointSuffixes = Object.fromEntries(
  Object.entries(stateCheckpointAppearances).map(([id, appearances]) => [
    id,
    appearances.map((appearance) => `--state-${appearance}-open`),
  ])
)

/** Authored story text the checkpoints rely on: controls and toast copy. */
export const stateCheckpointText = Object.fromEntries(
  Object.entries(toastCheckpoints).map(([id, steps]) => [
    id,
    [
      ...new Set(
        steps.flatMap(
          ({ press, toasts, reset = [], reachableControls = [] }) => [
            ...press,
            ...reachableControls,
            ...reset.flatMap((item) =>
              "control" in item ? [item.control] : []
            ),
            ...toasts.flatMap(({ title, description, action }) =>
              action ? [title, description, action] : [title, description]
            ),
          ]
        )
      ),
    ],
  ])
)

export const stateCheckpointStories = Object.keys(toastCheckpoints)

const rootSelector = '[data-scope="toast"][data-part="root"]'

/** @param {Page} page */
function toastRoots(page) {
  return page.locator(rootSelector)
}

/** @param {Page} page @param {string} title */
function toastByTitle(page, title) {
  return toastRoots(page).filter({
    has: page
      .locator('[data-scope="toast"][data-part="title"]')
      .getByText(title, { exact: true }),
  })
}

/** @param {Page} page @param {string} name */
function control(page, name) {
  return page
    .locator("#storybook-root")
    .getByRole("button", { name, exact: true })
}

/** @param {Locator} locator */
async function assertAccessible(locator) {
  await expect
    .poll(() =>
      locator.evaluate(
        (element) => !!element.closest('[inert], [aria-hidden="true"]')
      )
    )
    .toBe(false)
}

/** @param {Page} page @param {Locator[]} locators */
async function assertStableGeometry(page, locators) {
  await expect
    .poll(
      async () => {
        const before = await Promise.all(
          locators.map((item) => item.boundingBox())
        )
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve))
            )
        )
        const after = await Promise.all(
          locators.map((item) => item.boundingBox())
        )
        return (
          before.every(Boolean) &&
          JSON.stringify(before) === JSON.stringify(after)
        )
      },
      { message: "Toast surfaces must finish positioning" }
    )
    .toBe(true)
}

/** A capture must not race a dismissal timer.
 * @param {Locator} root @param {ToastSpec} spec @param {ToastStep["hold"]} hold
 */
async function assertHeld(root, spec, hold) {
  if (hold === "paused") {
    await expect(root).toHaveAttribute("data-paused", "")
    return
  }
  if (spec.type === "loading") {
    return
  }
  await expect
    .poll(() =>
      root.evaluate(
        (element) =>
          !Number.isFinite(
            Number.parseFloat(
              getComputedStyle(element).getPropertyValue("--duration")
            )
          )
      )
    )
    .toBe(true)
}

/** Assert exact on-screen anatomy of every expected toast and nothing else.
 * @param {Page} page @param {ToastStep} step
 */
async function assertToasts(page, step) {
  await expect(toastRoots(page)).toHaveCount(step.toasts.length)
  /** @type {Locator[]} */
  const measured = []
  for (const spec of step.toasts) {
    const root = toastByTitle(page, spec.title)
    await expect(root).toHaveCount(1)
    await expect(root).toBeVisible()
    await expect(root).toHaveAttribute("role", "status")
    await expect(root).toHaveAttribute("data-state", "open")
    await expect(root).toHaveAttribute("data-mounted", "")
    await expect(root).toHaveAttribute("data-type", spec.type)
    await expect(root).toHaveCSS("opacity", "1")
    await expect(root).toBeInViewport({ ratio: 1 })
    await assertAccessible(root)
    await expect(
      root.locator(`[aria-hidden="true"] > [data-type="${spec.type}"]`)
    ).toBeVisible()
    await expect(
      root.locator('[data-scope="toast"][data-part="description"]')
    ).toHaveText(spec.description)
    const closeButton = root.getByRole("button", {
      name: "Close notification",
      exact: true,
    })
    if (spec.closable === false) {
      await expect(closeButton).toHaveCount(0)
    } else {
      await expect(closeButton).toBeInViewport({ ratio: 1 })
      measured.push(closeButton)
    }
    const action = root.locator(
      '[data-scope="toast"][data-part="action-trigger"]'
    )
    if (spec.action) {
      await expect(action).toHaveText(spec.action)
      await expect(action).toBeInViewport({ ratio: 1 })
      measured.push(action)
    } else {
      await expect(action).toHaveCount(0)
    }
    await assertHeld(root, spec, step.hold)
    measured.push(root)
  }
  await step.check?.(page)
  await assertStableGeometry(page, measured)
  for (const name of step.reachableControls ?? []) {
    const button = control(page, name)
    await expect(button).toBeInViewport({ ratio: 1, timeout: 5000 })
    // Trial clicks perform real pointer hit testing without changing the
    // captured state. Visibility alone misses notification/control overlap.
    await button.click({ trial: true, timeout: 5000 })
  }
}

/** @param {Page} page @param {ToastReset[]} reset */
async function resetToasts(page, reset) {
  for (const item of reset) {
    if ("control" in item) {
      await control(page, item.control).click({ timeout: 5000 })
    } else {
      await toastRoots(page)
        .getByRole("button", { name: item.toastButton, exact: true })
        .click({ timeout: 5000 })
    }
  }
  await expect(toastRoots(page)).toHaveCount(0)
  await page.mouse.move(0, 0)
}

/** @param {Page} page @param {string} id @param {(suffix: string, beforeCapture?: () => Promise<void>) => Promise<void>} capture */
export async function checkStateCheckpoints(page, id, capture) {
  if (!Object.hasOwn(toastCheckpoints, id)) {
    return false
  }
  // Plays that end by dismissing their toast must finish before a checkpoint.
  await expect(toastRoots(page)).toHaveCount(0)
  for (const step of toastCheckpoints[id]) {
    for (const name of step.press) {
      const button = control(page, name)
      await expect(button).toBeEnabled({ timeout: 5000 })
      await button.click({ timeout: 5000 })
    }
    if (step.hover) {
      // Region hover is Zag's authored pause; keep the pointer on the title
      // rather than the close action so no hover state enters the capture.
      await page
        .locator('[data-scope="toast"][data-part="title"]')
        .getByText(step.hover, { exact: true })
        .hover()
    } else if (step.hold === "persistent") {
      await page.mouse.move(0, 0)
    }
    const ready = () => assertToasts(page, step)
    await ready()
    await capture(`--state-${step.appearance}-open`, ready)
    if (step.reset) {
      await resetToasts(page, step.reset)
    }
  }
  return true
}
