import { expect, type Page, test } from "@playwright/test"

const unknownPropWarning = /Unknown event handler|does not recognize.*prop/i

async function openStory(page: Page, story: string) {
  await page.goto(
    `/iframe.html?id=atoms-numericinput--${story}&viewMode=story`,
    { waitUntil: "domcontentloaded" }
  )
  await expect(page.getByRole("spinbutton").first()).toBeVisible()
}

async function callbackCounts(page: Page) {
  return JSON.parse(await page.getByTestId("callback-counts").innerText()) as {
    numeric: number
    change: number
    commit: number
    invalid: number
    focus: number
  }
}

test("controlled strings retain empty/rejected drafts and honor parent updates", async ({
  page,
}) => {
  await openStory(page, "controlled-draft")
  const input = page.getByRole("spinbutton", { name: "Draft quantity" })
  await input.fill("")
  await expect(input).toHaveValue("")
  await expect(page.getByTestId("draft-value")).toHaveText("Draft: (empty)")
  await input.fill("12")
  await input.press("Tab")
  await expect(input).toHaveValue("12")
  await expect(page.getByTestId("committed-value")).toHaveText("Committed: 12")
  await page.getByRole("button", { name: "Set parent value to 7" }).click()
  await expect(input).toHaveValue("7")
})

test("legacy numeric and Zag callbacks each fire once, including NaN on clear", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text())
    }
  })
  await openStory(page, "callback-compatibility")
  const input = page.getByRole("spinbutton", { name: "Callback quantity" })
  await expect(input).toHaveAttribute("form", "numeric-callback-form")
  await expect(input).toHaveAttribute("name", "callbackQuantity")
  await expect(
    page.getByRole("button", { name: "Increase callback quantity" })
  ).toBeVisible()
  await input.focus()
  await expect.poll(async () => (await callbackCounts(page)).focus).toBe(1)
  const before = await callbackCounts(page)
  await input.fill("4")
  await expect(page.getByTestId("numeric-value")).toHaveText("Numeric: 4")
  await expect
    .poll(async () => (await callbackCounts(page)).numeric)
    .toBe(before.numeric + 1)
  await expect
    .poll(async () => (await callbackCounts(page)).change)
    .toBe(before.change + 1)
  await input.fill("")
  await expect(input).toHaveValue("")
  await expect(page.getByTestId("numeric-value")).toHaveText("Numeric: NaN")
  await input.fill("12")
  await input.press("Tab")
  await expect(input).toHaveValue("10")
  await expect.poll(async () => (await callbackCounts(page)).commit).toBe(1)
  await expect.poll(async () => (await callbackCounts(page)).focus).toBe(2)
  await expect
    .poll(async () => (await callbackCounts(page)).invalid)
    .toBeGreaterThan(0)
  expect(errors.filter((error) => unknownPropWarning.test(error))).toEqual([])
})

test("numeric controlled and uncontrolled consumers keep legacy defaults", async ({
  page,
}) => {
  await openStory(page, "with-label")
  const controlled = page.getByRole("spinbutton", {
    name: "Quantity",
    exact: true,
  })
  await expect(controlled).toHaveValue("42")
  await controlled.press("ArrowUp")
  await expect(controlled).toHaveValue("43")
  await openStory(page, "all-sizes")
  const uncontrolled = page.getByRole("spinbutton", { name: "Small (sm)" })
  await expect(uncontrolled).toHaveValue("10")
  await uncontrolled.press("ArrowDown")
  await expect(uncontrolled).toHaveValue("9")
})

test("uncontrolled numeric and string defaults support clearing and retyping", async ({
  page,
}) => {
  await openStory(page, "uncontrolled-defaults")
  const numeric = page.getByRole("spinbutton", {
    name: "Numeric default quantity",
  })
  const text = page.getByRole("spinbutton", { name: "String default quantity" })
  await expect(numeric).toHaveValue("2")
  await expect(text).toHaveValue("2")
  await numeric.fill("")
  await numeric.press("Tab")
  await expect(numeric).toHaveValue("")
  await text.fill("")
  await expect(text).toHaveValue("")
  await text.fill("4")
  await text.press("ArrowUp")
  await expect(text).toHaveValue("5")
})

test("explicit undefined props keep legacy step, wheel and blur defaults", async ({
  page,
}) => {
  await openStory(page, "explicit-undefined-defaults")
  const input = page.getByRole("spinbutton", {
    name: "Undefined defaults quantity",
  })
  await expect(input).toHaveValue("200%")
  await input.press("ArrowUp")
  await expect(input).toHaveValue("300%")
  await input.evaluate((node) =>
    node.dispatchEvent(
      new WheelEvent("wheel", { deltaY: -100, bubbles: true, cancelable: true })
    )
  )
  await expect(input).toHaveValue("400%")
  await input.fill("1200%")
  await input.press("Tab")
  await expect(input).toHaveValue("1,000%")
})

test("FormNumericInput preserves localized drafts, rejected overflow and parent updates", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-formnumericinput--controlled-draft&viewMode=story",
    { waitUntil: "domcontentloaded" }
  )
  const input = page.getByRole("spinbutton", { name: "Form draft quantity" })
  const draft = page.getByTestId("form-draft-value")
  const committed = page.getByTestId("form-committed-value")
  const numeric = page.getByTestId("form-numeric-value")
  await expect(input).toHaveValue("2")
  await expect(input).toHaveAccessibleDescription(
    "Zadejte požadované množství. Desetinná čísla oddělujte čárkou."
  )

  await input.fill("")
  await expect(input).toHaveValue("")
  await expect(draft).toHaveText("Draft: (empty)")
  await expect(numeric).toHaveText("Numeric: NaN")

  await input.fill("1,")
  await expect(input).toHaveValue("1,")
  await expect(draft).toHaveText("Draft: 1,")
  await input.press("Enter")
  await expect(input).toHaveValue("1")
  await expect(draft).toHaveText("Draft: 1")
  await expect(committed).toHaveText("Committed: 1")

  await input.fill("1,")
  await expect(input).toHaveValue("1,")
  await input.press("Tab")
  await expect(input).toHaveValue("1")

  await input.fill("2,5")
  await expect(input).toHaveValue("2,5")
  await expect(draft).toHaveText("Draft: 2,5")
  await expect(numeric).toHaveText("Numeric: 2.5")
  await expect(input).toHaveAttribute("aria-valuenow", "2.5")
  await input.press("Tab")
  await expect(committed).toHaveText("Committed: 2,5")

  await input.fill("12")
  await input.press("Tab")
  await expect(input).toHaveValue("12")
  await expect(draft).toHaveText("Draft: 12")
  await expect(committed).toHaveText("Committed: 12")
  await page.getByRole("button", { name: "Reject draft" }).click()
  await expect(input).toHaveValue("12")
  await expect(draft).toHaveText("Draft: 12")
  await expect(input).toHaveAttribute("aria-invalid", "true")
  await expect(input).toHaveAccessibleDescription(
    "Toto množství nelze dodat. Zvolte prosím jiné množství."
  )

  await page.getByRole("button", { name: "Reset from parent" }).click()
  await expect(input).toHaveValue("2")
  await expect(draft).toHaveText("Draft: 2")
  await expect(input).not.toHaveAttribute("aria-invalid", "true")
  await expect(input).toHaveAccessibleDescription(
    "Zadejte požadované množství. Desetinná čísla oddělujte čárkou."
  )
})
