import { expect, type Locator, type Page, test } from "@playwright/test"

// Functional regression for the focused field surfaces. Every expected colour
// is resolved through the live cascade: the focused fill is compared with the
// surface the field really wears at rest and with the shared role the other
// brands keep, and the ring geometry is compared with the shared ring tokens
// instead of raw var() text.

const themes = [
  ["base", "light"],
  ["base", "dark"],
  ["neo", "light"],
  ["neo", "dark"],
  ["business", "light"],
  ["akros", "light"],
] as const

const numericControl = '[data-scope="number-input"][data-part="control"]'
const sharedFocusFill = "--color-form-control-bg-focus"

type FieldCase = {
  name: string
  story: string
  /** The element that paints the field fill; the compound control for NumericInput. */
  surface: (page: Page) => Locator
  /** The element that receives focus when it is not the painted surface. */
  focus?: (page: Page) => Locator
  restingFill: string
  focusFill: string
}

const fields: FieldCase[] = [
  {
    name: "Input",
    story: "atoms-input--variants",
    surface: (page) =>
      page.getByRole("textbox", { name: "Contact name — default" }),
    restingFill: "--color-input-bg-base",
    focusFill: "--color-input-bg-focus",
  },
  {
    name: "Textarea",
    story: "atoms-textarea--variants",
    surface: (page) =>
      page.getByRole("textbox", { name: "Delivery instructions — default" }),
    restingFill: "--color-textarea-bg",
    focusFill: "--color-textarea-bg-focus",
  },
  {
    name: "NumericInput",
    story: "atoms-numericinput--playground",
    surface: (page) => page.locator(numericControl),
    focus: (page) => page.locator('[role="spinbutton"]'),
    restingFill: "--color-numeric-input-bg",
    focusFill: "--color-numeric-input-input-bg-focus",
  },
]

async function openStory(
  page: Page,
  story: string,
  brand: string,
  mode: string
) {
  await page.goto(
    `/iframe.html?id=${story}&globals=brand:${brand};mode:${mode}`
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
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${mode}\\b`))
  if (brand !== "base") {
    await expect(page.locator("html")).toHaveAttribute("data-theme", brand)
  }
}

/** Resolve a live token through a real element, so the value follows the theme. */
function resolveStyle(page: Page, style: string, property: string) {
  return page.evaluate(
    ({ style: css, property: prop }) => {
      const probe = document.createElement("span")
      probe.style.cssText = `position:absolute;visibility:hidden;${css}`
      document.body.append(probe)
      const value = getComputedStyle(probe).getPropertyValue(prop)
      probe.remove()
      return value
    },
    { style, property }
  )
}

function resolveFill(page: Page, token: string) {
  return resolveStyle(
    page,
    `background-color: var(${token})`,
    "background-color"
  )
}

/** Box geometry only: the focus ring must not move or resize the field. */
function boxGeometry(node: Locator) {
  return node.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    }
  })
}

function ringGeometry(node: Locator) {
  return node.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineOffset: style.outlineOffset,
    }
  })
}

function fillOf(node: Locator) {
  return node.evaluate((element) => getComputedStyle(element).backgroundColor)
}

for (const [brand, mode] of themes) {
  test(`${brand}/${mode}: focus keeps each field on the surface its brand owns`, async ({
    page,
  }) => {
    const business = brand === "business"
    for (const field of fields) {
      await test.step(field.name, async () => {
        await openStory(page, field.story, brand, mode)
        const surface = field.surface(page)
        const target = field.focus ? field.focus(page) : surface
        await page.mouse.move(0, 0)

        const restingFill = await resolveFill(page, field.restingFill)
        const focusFill = await resolveFill(page, field.focusFill)
        const sharedFill = await resolveFill(page, sharedFocusFill)
        const before = await boxGeometry(surface)
        expect(await fillOf(surface)).toBe(restingFill)

        await target.focus()
        expect(
          await target.evaluate((node) => node.matches(":focus-visible"))
        ).toBe(true)

        // The focused surface is exactly the alias the atom consumes...
        expect(await fillOf(surface)).toBe(focusFill)
        // ...and that alias is the brand's own choice: Business keeps the
        // resting fill, every other brand keeps the shared form-control focus
        // fill.
        expect(await fillOf(surface)).toBe(business ? restingFill : sharedFill)
        if (business) {
          expect(focusFill).not.toBe(sharedFill)
          expect(await fillOf(surface)).not.toBe(sharedFill)
        } else {
          expect(focusFill).toBe(sharedFill)
          expect(await fillOf(surface)).not.toBe(restingFill)
        }

        // Focus adds no paint outside the field and moves nothing.
        expect(await boxGeometry(surface)).toEqual(before)
        const ring = await ringGeometry(surface)
        expect(ring.outlineStyle).toBe("solid")
        expect(ring.outlineWidth).toBe(
          await resolveStyle(
            page,
            "outline-style: solid; outline-width: var(--default-ring-width)",
            "outline-width"
          )
        )
        expect(ring.outlineOffset).toBe(
          await resolveStyle(
            page,
            "outline-style: solid; outline-offset: var(--default-ring-offset)",
            "outline-offset"
          )
        )
      })
    }

    if (business) {
      // NumericInput keeps one compound fill: focusing the editor leaves the
      // editor's own surface exactly as it rests and keeps the group on the
      // resting alias, so no second darkened surface is painted.
      await openStory(page, "atoms-numericinput--playground", brand, mode)
      const editor = page.locator('[role="spinbutton"]')
      const compound = page.locator(numericControl)
      const editorResting = await fillOf(editor)
      const compoundResting = await fillOf(compound)
      expect(compoundResting).toBe(
        await resolveFill(page, "--color-numeric-input-bg")
      )
      await editor.focus()
      expect(await fillOf(editor)).toBe(editorResting)
      expect(await fillOf(compound)).toBe(compoundResting)
    }
  })
}

test("business: read-only, disabled and validation keep their precedence", async ({
  page,
}) => {
  await openStory(page, "atoms-input--variants", "business", "light")
  const editableFill = await resolveFill(page, "--color-input-bg-base")

  // Read-only keeps the read-only surface, not the editable resting fill.
  await openStory(page, "atoms-input--read-only", "business", "light")
  const readOnly = page.getByRole("textbox")
  const readOnlyFill = await resolveFill(page, "--color-input-readonly")
  await readOnly.focus()
  expect(
    await readOnly.evaluate((node) => node.matches(":focus-visible"))
  ).toBe(true)
  await expect(readOnly).toHaveCSS("background-color", readOnlyFill)
  expect(readOnlyFill).not.toBe(editableFill)

  // Disabled wins over focus: the field cannot be focused and keeps its own
  // fill rather than either editable surface.
  await openStory(page, "atoms-input--disabled", "business", "light")
  const disabled = page.getByRole("textbox")
  const disabledFill = await resolveFill(page, "--color-input-bg-disabled")
  await expect(disabled).toBeDisabled()
  await disabled.evaluate((node) => (node as HTMLElement).focus())
  expect(
    await disabled.evaluate((node) => node.ownerDocument.activeElement === node)
  ).toBe(false)
  await expect(disabled).toHaveCSS("background-color", disabledFill)
  expect(disabledFill).not.toBe(editableFill)

  // Validation keeps the danger border authoritative while the fill stays the
  // resting surface this brand chose.
  await openStory(page, "atoms-input--variants", "business", "light")
  const invalid = page.getByRole("textbox", { name: "Contact name — error" })
  await invalid.focus()
  await expect(invalid).toHaveCSS(
    "border-top-color",
    await resolveStyle(
      page,
      "border: 1px solid var(--color-input-border-danger-focus)",
      "border-top-color"
    )
  )
  await expect(invalid).toHaveCSS("background-color", editableFill)

  // A caller may still retarget the focus surface through the atom's alias.
  const editable = page.getByRole("textbox", { name: "Contact name — default" })
  await editable.focus()
  await expect(editable).toHaveCSS("background-color", editableFill)
  const overrideFill = await resolveFill(page, "--color-fill-active")
  expect(overrideFill).not.toBe(editableFill)
  await editable.evaluate((node) =>
    (node as HTMLElement).style.setProperty(
      "--color-input-bg-focus",
      "var(--color-fill-active)"
    )
  )
  await expect(editable).toHaveCSS("background-color", overrideFill)
  await editable.evaluate((node) =>
    (node as HTMLElement).style.removeProperty("--color-input-bg-focus")
  )
  await expect(editable).toHaveCSS("background-color", editableFill)
})

test("business: the stepper keeps its own pointer paints", async ({ page }) => {
  await openStory(page, "atoms-numericinput--playground", "business", "light")
  const compound = page.locator(numericControl)
  const increment = page.locator(
    '[data-scope="number-input"][data-part="increment-trigger"]'
  )
  const restingFill = await resolveFill(page, "--color-numeric-input-bg")
  const hoverPaint = await resolveFill(
    page,
    "--color-numeric-input-trigger-bg-hover"
  )
  const activePaint = await resolveFill(
    page,
    "--color-numeric-input-trigger-bg-active"
  )
  // The shared hover variant only matches a fine pointer, so a touch device
  // keeps the transparent resting pill instead of the hover colour.
  const pointerPaints = await page.evaluate(
    () => matchMedia("(hover: hover) and (pointer: fine)").matches
  )
  await expect(increment).toHaveCSS("background-color", "rgba(0, 0, 0, 0)")
  await increment.hover()
  await expect(increment).toHaveCSS(
    "background-color",
    pointerPaints ? hoverPaint : "rgba(0, 0, 0, 0)"
  )
  // The stepper paint never doubles the compound field fill.
  await expect(compound).toHaveCSS("background-color", restingFill)
  if (pointerPaints) {
    await increment.hover()
    await page.mouse.down()
    await expect(increment).toHaveCSS("background-color", activePaint)
    await page.mouse.up()
    await expect(compound).toHaveCSS("background-color", restingFill)
  }
})
