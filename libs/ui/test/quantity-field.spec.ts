import { expect, type Page, test } from "@playwright/test"

const descriptionSeparator = /\s+/

async function openStory(page: Page, story: string) {
  await page.goto(
    `/iframe.html?id=molecules-quantityfield--${story}&viewMode=story`
  )
  await expect(page.getByRole("spinbutton").first()).toBeVisible()
}

async function describedText(page: Page, inputName: string) {
  const ids =
    (
      await page
        .getByRole("spinbutton", { name: inputName })
        .getAttribute("aria-describedby")
    )?.split(descriptionSeparator) ?? []
  return Promise.all(ids.map((id) => page.locator(`[id="${id}"]`).innerText()))
}

test("a rejected draft stays visible, then accepts an authoritative parent update", async ({
  page,
}) => {
  await openStory(page, "rejected-update")
  const input = page.getByRole("spinbutton", { name: "Order quantity" })
  await input.fill("5")
  await page.getByRole("button", { name: "Reject update" }).click()
  await expect(input).toHaveValue("5")
  await expect(input).toHaveAttribute("aria-invalid", "true")
  expect(await describedText(page, "Order quantity")).toEqual(
    expect.arrayContaining([
      "pieces",
      "Choose the quantity to order.",
      "This quantity cannot be supplied. Please choose another quantity.",
    ])
  )
  await page.getByRole("button", { name: "Reset from parent" }).click()
  await expect(input).toHaveValue("2")
  await input.fill("")
  await expect(input).toHaveValue("")
  await input.press("Tab")
  await expect(input).toHaveValue("")
  await input.fill("0")
  await input.press("Tab")
  await expect(input).toHaveValue("0")
})

test("localized decimals parse and step through the Zag engine", async ({
  page,
}) => {
  await openStory(page, "decimal-quantity")
  const input = page.getByRole("spinbutton", { name: "Délka" })
  await expect(input).toHaveValue("1,5")
  await input.fill("2,5")
  await expect(input).toHaveValue("2,5")
  await expect(input).toHaveAttribute("aria-valuenow", "2.5")
  await input.press("ArrowUp")
  await expect(input).toHaveValue("3")
  await input.fill("2,")
  await expect(input).toHaveValue("2,")
  await input.press("Tab")
  // Zag normalizes incomplete fragments at commit; no application parser is added.
  await expect(input).toHaveValue("2")
})

test("step controls respect bounds while typing overflow remains editable", async ({
  page,
}) => {
  await openStory(page, "bounds")
  const minimum = page.getByRole("spinbutton", { name: "At minimum" })
  const maximum = page.getByRole("spinbutton", { name: "At maximum" })
  const outside = page.getByRole("spinbutton", { name: "Outside bounds" })
  const minimumId = await minimum.getAttribute("id")
  const maximumId = await maximum.getAttribute("id")
  await expect(
    page.locator(
      `[data-part="decrement-trigger"][aria-controls="${minimumId}"]`
    )
  ).toBeDisabled()
  await expect(
    page.locator(
      `[data-part="increment-trigger"][aria-controls="${maximumId}"]`
    )
  ).toBeDisabled()
  await outside.fill("15")
  await outside.press("Tab")
  await expect(outside).toHaveValue("15")
  await expect(outside).toHaveAttribute("aria-invalid", "true")
})

test("pending and read only block focused wheel, keys, triggers and held triggers", async ({
  page,
}) => {
  await openStory(page, "pending-and-read-only")
  const input = page.getByRole("spinbutton", { name: "Toggle quantity" })
  await input.focus()
  await page.getByRole("button", { name: "Toggle read only" }).click()
  await expect(input).toHaveAttribute("readonly", "")
  await input.press("ArrowUp")
  await input.evaluate((node) =>
    node.dispatchEvent(
      new WheelEvent("wheel", {
        deltaY: -100,
        bubbles: true,
        cancelable: true,
      })
    )
  )
  await expect(input).toHaveValue("2")
  await expect(
    page.getByRole("button", { name: "Increment value" })
  ).toBeDisabled()
  await page.getByRole("button", { name: "Toggle read only" }).click()
  await input.fill("5")
  await input.focus()
  await page.getByRole("button", { name: "Toggle pending" }).click()
  await expect(input).toBeDisabled()
  await expect(page.getByRole("status")).toHaveText("Updating quantity")
  expect(
    await page
      .getByRole("status")
      .evaluate((node) => node.closest('[aria-busy="true"]') === null)
  ).toBe(true)
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(1)
  await expect(
    page.getByRole("button", { name: "Increment value" })
  ).toBeDisabled()
  await input.evaluate((node) =>
    node.dispatchEvent(
      new WheelEvent("wheel", {
        deltaY: -100,
        bubbles: true,
        cancelable: true,
      })
    )
  )
  await expect(input).toHaveValue("5")
  await page.getByRole("button", { name: "Toggle pending" }).click()
  await expect(input).toBeEnabled()
  await expect(input).toHaveValue("5")
  const increment = page.getByRole("button", { name: "Increment value" })
  await increment.evaluate(async (node: HTMLButtonElement) => {
    node.dispatchEvent(
      new PointerEvent("pointerdown", {
        button: 0,
        pointerType: "mouse",
        bubbles: true,
      })
    )
    // Process the first queued Zag increment, then lock before its repeat
    // timer. Separate browser commands can exceed the repeat delay under load.
    await new Promise<void>((resolve) => queueMicrotask(resolve))
    const pendingButton = [
      ...document.querySelectorAll<HTMLButtonElement>("button"),
    ].find((button) => button.textContent === "Toggle pending")
    pendingButton?.click()
  })
  await expect(input).toBeDisabled()
  await page.waitForTimeout(450)
  await expect(input).toHaveValue("6")
  await expect(page.getByTestId("commit-count")).toHaveText("Commits: 0")
})

test("form identity, both external descriptions and the input ref are preserved", async ({
  page,
}) => {
  await openStory(page, "form-identity")
  const input = page.getByRole("spinbutton", { name: "Form quantity" })
  await expect(input).toHaveAttribute("id", "quantity-order")
  await expect(input).toHaveAttribute("name", "orderQuantity")
  expect(await describedText(page, "Form quantity")).toEqual(
    expect.arrayContaining([
      "Quantity requested for this order.",
      "Your saved quantity is unchanged until submitted.",
      "pieces",
      "Choose the quantity to order.",
    ])
  )
  await page.getByRole("button", { name: "Focus quantity" }).click()
  await expect(input).toBeFocused()
  await input.fill("4")
  await page.getByRole("button", { name: "Submit quantity" }).click()
  await expect(page.getByTestId("submitted-value")).toHaveText("Submitted: 4")
})

test("compact long unit text fits narrow screens and retains its hidden name", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await openStory(page, "compact-long-unit")
  await expect(
    page.getByRole("spinbutton", {
      name: "Quantity for stainless steel screws",
    })
  ).toBeVisible()
  const inputWidth = await page
    .getByRole("spinbutton")
    .evaluate((node) => node.getBoundingClientRect().width)
  expect(inputWidth).toBeGreaterThan(60)
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    )
    .toBe(true)
})

test("pending preserves a partial controlled draft until an explicit commit", async ({
  page,
}) => {
  await openStory(page, "pending-and-read-only")
  const input = page.getByRole("spinbutton", { name: "Toggle quantity" })
  await input.fill("5,")
  await page.getByRole("button", { name: "Toggle pending" }).click()
  await expect(input).toBeDisabled()
  // Wait through Zag's queued DOM synchronization, rather than checking only
  // the React value before its next animation frame.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  )
  await expect(input).toHaveValue("5,")
  await expect(page.getByTestId("draft-value")).toHaveText("Draft: 5,")
  await expect(page.getByTestId("commit-count")).toHaveText("Commits: 0")
  await page.getByRole("button", { name: "Toggle pending" }).click()
  await expect(input).toBeEnabled()
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  )
  await expect(input).toHaveValue("5,")
  await input.press("Enter")
  await expect(input).toHaveValue("5")
  await expect(page.getByTestId("commit-count")).toHaveText("Commits: 1")
})
test("a rapid parent reset supersedes draft synchronization queued by blur", async ({
  page,
}) => {
  await openStory(page, "rejected-update")
  const input = page.getByRole("spinbutton", { name: "Order quantity" })
  await input.fill("05")
  await input.evaluate(async (node: HTMLInputElement) => {
    node.blur()
    // Let the machine process blur/normalization, then replace the parent prop
    // before its previously queued DOM frame can restore the older draft.
    await new Promise<void>((resolve) => queueMicrotask(resolve))
    const reset = [
      ...document.querySelectorAll<HTMLButtonElement>("button"),
    ].find((button) => button.textContent === "Reset from parent")
    reset?.click()
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    )
  })
  await expect(input).toHaveValue("2")
  await expect(page.getByTestId("draft-value")).toHaveText("Draft: 2")
})
