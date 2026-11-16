import { expect, type Page, test } from "@playwright/test"

// Functional regression for the inactive field presentation batch. Every
// expected value is resolved through the live cascade: the NumericInput
// invalid fill is compared against the fills the sibling Input and Textarea
// invalid states actually paint, and the Textarea resize mode is read from the
// real control. No raw var() text is compared to computed CSS.

const themes = [
  ["n1", "light"],
  ["business", "light"],
  ["akros", "light"],
] as const

const numericControl = '[data-scope="number-input"][data-part="control"]'
const textareaSelector = "#storybook-root textarea"
const invalidMessage = "Enter a quantity between 0 and 100."

async function openStory(
  page: Page,
  story: string,
  brand: string,
  mode: string,
  args = ""
) {
  await page.goto(
    `/iframe.html?id=${story}&globals=brand:${brand};mode:${mode}${args ? `&args=${args}` : ""}`
  )
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as Window & {
              __STORYBOOK_PREVIEW__?: { currentRender?: { phase?: string } }
            }
          ).__STORYBOOK_PREVIEW__?.currentRender?.phase
      )
    )
    .toBe("finished")
  await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${mode}\\b`))
  await expect(page.locator("html")).toHaveAttribute("data-theme", brand)
}

type FieldTokens = {
  invalidFill: string
  neutralFill: string
  disabledFill: string
  dangerFill: string
  formControlFill: string
  invalidBorder: string
}

type PresentationTokens = {
  readOnlyRole: string
  editableFill: string
  disabledForeground: string
  neutralHelperForeground: string
}

function resolveFieldTokens(page: Page): Promise<FieldTokens> {
  return page.evaluate(() => {
    const host = document.createElement("div")
    host.style.cssText =
      "position:absolute;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none"
    document.body.append(host)
    const read = (
      style: string,
      property: "backgroundColor" | "borderTopColor"
    ) => {
      const node = document.createElement("span")
      node.style.cssText = style
      host.append(node)
      return getComputedStyle(node)[property]
    }
    const tokens = {
      invalidFill: read(
        "background-color: var(--color-numeric-input-bg-invalid)",
        "backgroundColor"
      ),
      neutralFill: read(
        "background-color: var(--color-numeric-input-bg)",
        "backgroundColor"
      ),
      disabledFill: read(
        "background-color: var(--color-numeric-input-bg-disabled)",
        "backgroundColor"
      ),
      dangerFill: read(
        "background-color: var(--color-bg-danger-subtle)",
        "backgroundColor"
      ),
      formControlFill: read(
        "background-color: var(--color-form-control-bg)",
        "backgroundColor"
      ),
      invalidBorder: read(
        "border: 1px solid var(--color-numeric-input-border-invalid)",
        "borderTopColor"
      ),
    }
    host.remove()
    return tokens
  })
}

// Resolve the shared roles the inactive field states must read, so the
// assertions compare live cascade values instead of raw var() text.
function resolvePresentationTokens(page: Page): Promise<PresentationTokens> {
  return page.evaluate(() => {
    const host = document.createElement("div")
    host.style.cssText =
      "position:absolute;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none"
    document.body.append(host)
    const read = (style: string, property: "backgroundColor" | "color") => {
      const node = document.createElement("span")
      node.style.cssText = style
      host.append(node)
      return getComputedStyle(node)[property]
    }
    const tokens = {
      readOnlyRole: read(
        "background-color: var(--color-form-control-readonly)",
        "backgroundColor"
      ),
      editableFill: read(
        "background-color: var(--color-form-control-bg)",
        "backgroundColor"
      ),
      disabledForeground: read("color: var(--color-fg-disabled)", "color"),
      neutralHelperForeground: read(
        "color: var(--color-status-text-fg)",
        "color"
      ),
    }
    host.remove()
    return tokens
  })
}

for (const [brand, mode] of themes) {
  test(`${brand}/${mode}: NumericInput invalid fill stays on the shared field surface`, async ({
    page,
  }) => {
    await openStory(page, "atoms-numericinput--invalid-state", brand, mode)
    const control = page.locator(numericControl).first()
    await expect(control).toHaveAttribute("data-invalid", "true")
    await expect(control).not.toHaveAttribute("data-disabled", "")
    await expect(page.getByRole("alert")).toContainText(invalidMessage)

    const tokens = await resolveFieldTokens(page)
    const numericFill = await control.evaluate(
      (node) => getComputedStyle(node).backgroundColor
    )
    // The validation border keeps carrying the error signal.
    expect(
      await control.evaluate((node) => getComputedStyle(node).borderTopColor)
    ).toBe(tokens.invalidBorder)

    // The sibling invalid fields paint the same fill the numeric control does.
    await openStory(page, "atoms-input--variants", brand, mode)
    const inputFill = await page
      .getByRole("textbox", { name: "Contact name — error" })
      .evaluate((node) => getComputedStyle(node).backgroundColor)
    await openStory(page, "atoms-textarea--variants", brand, mode)
    const textareaFill = await page
      .getByRole("textbox", { name: "Delivery instructions — error" })
      .evaluate((node) => getComputedStyle(node).backgroundColor)
    expect(inputFill).toBe(textareaFill)
    expect(inputFill).toBe(tokens.formControlFill)

    expect(tokens.neutralFill).toBe(tokens.formControlFill)
    if (brand === "business") {
      // Business keeps the invalid fill on the same neutral surface the
      // sibling Input and Textarea invalid states paint.
      expect(numericFill).toBe(inputFill)
      expect(numericFill).toBe(tokens.neutralFill)
      expect(numericFill).not.toBe(tokens.dangerFill)
    } else {
      // Every other brand keeps the shared danger fill unchanged.
      expect(numericFill).toBe(tokens.dangerFill)
      expect(numericFill).not.toBe(inputFill)
      expect(tokens.dangerFill).not.toBe(tokens.neutralFill)
    }

    // The alias is the live knob: a caller can repaint the invalid fill on the
    // compound control, and removing the override restores the brand paint.
    await openStory(page, "atoms-numericinput--invalid-state", brand, mode)
    const overridden = page.locator(numericControl).first()
    const overrideToken =
      brand === "business"
        ? "var(--color-bg-danger-subtle)"
        : "var(--color-form-control-bg)"
    const overrideFill =
      brand === "business" ? tokens.dangerFill : tokens.neutralFill
    expect(overrideFill).not.toBe(numericFill)
    await overridden.evaluate(
      (node, value) =>
        (node as HTMLElement).style.setProperty(
          "--color-numeric-input-bg-invalid",
          value
        ),
      overrideToken
    )
    await expect(overridden).toHaveCSS("background-color", overrideFill)
    await overridden.evaluate((node) =>
      (node as HTMLElement).style.removeProperty(
        "--color-numeric-input-bg-invalid"
      )
    )
    await expect(overridden).toHaveCSS("background-color", numericFill)

    // A disabled invalid field keeps the disabled fill: disabled stays
    // authoritative over validation.
    await openStory(
      page,
      "atoms-numericinput--playground",
      brand,
      mode,
      "invalid:true;disabled:true"
    )
    const disabledControl = page.locator(numericControl).first()
    await expect(disabledControl).toHaveAttribute("data-disabled", "")
    await expect(disabledControl).toHaveAttribute("data-invalid", "true")
    expect(tokens.disabledFill).not.toBe(numericFill)
    await expect(disabledControl).toHaveCSS(
      "background-color",
      tokens.disabledFill
    )
  })

  test(`${brand}/${mode}: disabled Textarea drops the resize grip without losing native semantics`, async ({
    page,
  }) => {
    // Disabled fields are inert and no longer advertise the native resize grip.
    await openStory(page, "atoms-textarea--disabled", brand, mode)
    const disabled = page.locator(textareaSelector)
    await expect(disabled).toHaveCount(1)
    await expect(disabled).toBeDisabled()
    await expect(disabled).toHaveValue("Leave the parcel at reception.")
    await expect(disabled).toHaveCSS("resize", "none")
    await expect(disabled).toHaveCSS("cursor", "not-allowed")

    // Read-only keeps its configured mode, stays focusable and stays enabled.
    await openStory(page, "atoms-textarea--read-only", brand, mode)
    const readOnly = page.locator(textareaSelector)
    await expect(readOnly).toHaveAttribute("readonly", "")
    await expect(readOnly).not.toBeDisabled()
    await expect(readOnly).toHaveCSS("resize", "vertical")
    await readOnly.click()
    await expect(readOnly).toBeFocused()

    // Auto-sizing stays content-sized and non-resizable.
    await openStory(page, "atoms-textarea--auto-sizing", brand, mode)
    await expect(page.locator(textareaSelector)).toHaveCSS("resize", "none")

    // Every configured mode is honoured while the field stays editable.
    for (const [configured, expected] of [
      ["none", "none"],
      ["y", "vertical"],
      ["x", "horizontal"],
      ["both", "both"],
    ] as const) {
      await openStory(
        page,
        "atoms-textarea--playground",
        brand,
        mode,
        `resize:${configured}`
      )
      const field = page.locator(textareaSelector)
      await expect(field).toBeEditable()
      await expect(field).toHaveCSS("resize", expected)
    }

    // Disabled outranks a configured mode, including on a read-only field.
    await openStory(
      page,
      "atoms-textarea--playground",
      brand,
      mode,
      "resize:both;disabled:true"
    )
    await expect(page.locator(textareaSelector)).toHaveCSS("resize", "none")
    await openStory(
      page,
      "atoms-textarea--playground",
      brand,
      mode,
      "resize:both;disabled:true;readOnly:true"
    )
    await expect(page.locator(textareaSelector)).toHaveCSS("resize", "none")

    // A caller's own resize utility still lands on an editable field. Exercise
    // the compiled utility on a genuine textarea, not an undeclared URL arg.
    await openStory(page, "atoms-textarea--playground", brand, mode, "resize:y")
    const caller = page.locator(textareaSelector)
    await caller.evaluate((node) => {
      node.classList.remove("resize-y")
      node.classList.add("resize-x")
    })
    await expect(caller).toHaveCSS("resize", "horizontal")
    await expect(caller).toBeEditable()
  })

  test(`${brand}/${mode}: read-only fields read the shared read-only surface`, async ({
    page,
  }) => {
    await openStory(page, "atoms-textarea--read-only", brand, mode)
    const tokens = await resolvePresentationTokens(page)
    const readOnly = page.locator(textareaSelector)
    await expect(readOnly).toHaveAttribute("readonly", "")
    await expect(readOnly).not.toBeDisabled()
    // The read-only surface is the shared role, not the editable resting fill.
    await expect(readOnly).toHaveCSS("background-color", tokens.readOnlyRole)
    if (brand === "business") {
      expect(tokens.readOnlyRole).not.toBe(tokens.editableFill)
      await expect(readOnly).not.toHaveCSS(
        "background-color",
        tokens.editableFill
      )
    }

    // The sibling read-only Input already paints that same shared role.
    await openStory(page, "atoms-input--read-only", brand, mode)
    const readOnlyInput = page.getByRole("textbox", { name: "Contact name" })
    await expect(readOnlyInput).toHaveAttribute("readonly", "")
    await expect(readOnlyInput).toHaveCSS(
      "background-color",
      tokens.readOnlyRole
    )
  })

  test(`${brand}/${mode}: disabled examples keep their label and helper foregrounds`, async ({
    page,
  }) => {
    await openStory(page, "atoms-textarea--disabled", brand, mode)
    const tokens = await resolvePresentationTokens(page)
    const field = page.locator(textareaSelector)
    await expect(field).toBeDisabled()
    const label = page.getByText("Delivery instructions")
    const helper = page.locator('#storybook-root [data-status="default"]')
    await expect(label).toHaveCSS("color", tokens.disabledForeground)
    if (brand === "business") {
      // Business dims the neutral helper with the label's disabled foreground.
      await expect(helper).toHaveCSS("color", tokens.disabledForeground)
    } else {
      // Every other brand keeps StatusText's own neutral helper foreground.
      await expect(helper).toHaveCSS("color", tokens.neutralHelperForeground)
    }
    await expect(helper).toContainText(
      "Available after the order is confirmed."
    )

    await openStory(page, "atoms-numericinput--disabled", brand, mode)
    const numericLabel = page.getByText("Disabled Input")
    await expect(page.getByRole("spinbutton")).toBeDisabled()
    // The caller dims the external label; the atom keeps its own disabled value.
    await expect(numericLabel).toHaveCSS("color", tokens.disabledForeground)
    await expect(page.locator(numericControl)).toHaveAttribute(
      "data-disabled",
      ""
    )
  })
}

// The helper dim is Business-only. Akros must not inherit the disabled label
// foreground, which is lighter than the neutral role its helper keeps.
test("akros/light: the disabled helper keeps the neutral StatusText foreground", async ({
  page,
}) => {
  await openStory(page, "atoms-textarea--disabled", "akros", "light")
  const tokens = await resolvePresentationTokens(page)
  const helper = page.locator('#storybook-root [data-status="default"]')
  await expect(helper).toContainText("Available after the order is confirmed.")
  expect(tokens.neutralHelperForeground).not.toBe(tokens.disabledForeground)
  await expect(helper).toHaveCSS("color", tokens.neutralHelperForeground)
  await expect(helper).not.toHaveCSS("color", tokens.disabledForeground)
})
