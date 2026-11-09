import { expect, type Page, test } from "@playwright/test"

// Functional regression for the Business label hierarchy. Every expected value
// is resolved through the live cascade: the label weight is compared against
// the --font-weight-* alias the font-label utility reads, and the field sizes
// against the --text-label-* aliases the atom wears. No raw var() text is
// compared to computed CSS.

const themes = [
  ["base", "light"],
  ["base", "dark"],
  ["neo", "light"],
  ["neo", "dark"],
  ["business", "light"],
  ["akros", "light"],
] as const

const labelSelector = "#storybook-root label"
const disabledLabelClass = /text-label-fg-disabled/

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
  if (brand !== "base") {
    await expect(page.locator("html")).toHaveAttribute("data-theme", brand)
  }
}

type LabelTokens = {
  label: string
  semibold: string
  bold: string
  medium: string
  labelSm: string
  labelMd: string
  labelLg: string
  labelFgDisabled: string
}

function resolveLabelTokens(page: Page): Promise<LabelTokens> {
  return page.evaluate(() => {
    const host = document.createElement("div")
    host.style.cssText =
      "position:absolute;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none"
    document.body.append(host)
    const read = (
      style: string,
      property: "fontWeight" | "fontSize" | "color"
    ) => {
      const node = document.createElement("span")
      node.style.cssText = style
      host.append(node)
      return getComputedStyle(node)[property]
    }
    const tokens = {
      label: read("font-weight: var(--font-weight-label)", "fontWeight"),
      semibold: read("font-weight: var(--font-weight-semibold)", "fontWeight"),
      bold: read("font-weight: var(--font-weight-bold)", "fontWeight"),
      medium: read("font-weight: var(--font-weight-medium)", "fontWeight"),
      labelSm: read("font-size: var(--text-label-sm)", "fontSize"),
      labelMd: read("font-size: var(--text-label-md)", "fontSize"),
      labelLg: read("font-size: var(--text-label-lg)", "fontSize"),
      labelFgDisabled: read("color: var(--color-label-fg-disabled)", "color"),
    }
    host.remove()
    return tokens
  })
}

function labelMetrics(page: Page) {
  return page.locator(labelSelector).evaluateAll((nodes) =>
    nodes.map((node) => {
      const style = getComputedStyle(node)
      return {
        classes: Array.from(node.classList),
        color: style.color,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        parentFontSize: node.parentElement
          ? getComputedStyle(node.parentElement).fontSize
          : "",
      }
    })
  )
}

for (const [brand, mode] of themes) {
  test(`${brand}/${mode}: Label weight stays a live alias across every size`, async ({
    page,
  }) => {
    await openStory(page, "atoms-label--sizes", brand, mode)

    const labels = page.locator(labelSelector)
    await expect(labels).toHaveCount(3)

    const tokens = await resolveLabelTokens(page)
    // Business quiets the label to the existing semibold step; every other
    // brand keeps the shared bold default.
    const expectedWeight = brand === "business" ? tokens.semibold : tokens.bold
    expect(tokens.label).toBe(expectedWeight)
    expect(tokens.semibold).not.toBe(tokens.bold)

    const [sm, md, lg] = await labelMetrics(page)
    if (!(sm && md && lg)) {
      throw new Error("Label sizes story should render sm, md and lg labels")
    }
    for (const label of [sm, md, lg]) {
      expect(label.classes).toContain("font-label")
      expect(label.fontWeight).toBe(tokens.label)
    }
    expect([sm.fontSize, md.fontSize, lg.fontSize]).toEqual([
      tokens.labelSm,
      tokens.labelMd,
      tokens.labelLg,
    ])
    expect(Number.parseFloat(sm.fontSize)).toBeLessThan(
      Number.parseFloat(md.fontSize)
    )
    expect(Number.parseFloat(md.fontSize)).toBeLessThan(
      Number.parseFloat(lg.fontSize)
    )

    // `current` keeps inherited sizing but still wears the brand weight.
    await openStory(
      page,
      "atoms-label--playground",
      brand,
      mode,
      "size:current"
    )
    const current = await labelMetrics(page)
    expect(current).toHaveLength(1)
    expect(current[0]?.fontSize).toBe(current[0]?.parentFontSize)
    expect(current[0]?.fontWeight).toBe(expectedWeight)
  })

  test(`${brand}/${mode}: Label states keep association, hierarchy and a caller override`, async ({
    page,
  }) => {
    await openStory(page, "atoms-label--states", brand, mode)

    const labels = page.locator(labelSelector)
    await expect(labels).toHaveCount(2)
    const tokens = await resolveLabelTokens(page)
    const expectedWeight = brand === "business" ? tokens.semibold : tokens.bold

    const required = labels.nth(0)
    const disabled = labels.nth(1)
    await expect(required).toContainText("Full name")
    await expect(disabled).toContainText("Full name")
    await expect(disabled).toHaveClass(disabledLabelClass)
    await expect(required.locator('span[aria-hidden="true"]')).toHaveText("*")
    // Read the raw text: the spoken alternative keeps its separating space.
    expect(await required.locator("span.sr-only").textContent()).toBe(
      " (required)"
    )

    // Both labels stay natively associated with their own control.
    const association = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll<HTMLLabelElement>("#storybook-root label")
      ).map((node) => {
        const control = node.parentElement?.querySelector("input") ?? null
        return {
          controlMatches: node.control === control,
          htmlFor: node.getAttribute("for"),
          inputId: control?.id ?? null,
        }
      })
    )
    expect(association).toHaveLength(2)
    for (const entry of association) {
      expect(entry.controlMatches).toBe(true)
      expect(entry.htmlFor).toBe(entry.inputId)
    }

    const fields = page.getByRole("textbox")
    await expect(fields.nth(0)).toHaveJSProperty("required", true)
    await expect(fields.nth(1)).toBeDisabled()
    await expect(
      page.getByRole("textbox", { name: "Full name (required)" })
    ).toHaveCount(1)

    const [requiredMetrics, disabledMetrics] = await labelMetrics(page)
    if (!(requiredMetrics && disabledMetrics)) {
      throw new Error("Label states story should render both labels")
    }
    expect(requiredMetrics.fontWeight).toBe(expectedWeight)
    expect(disabledMetrics.fontWeight).toBe(expectedWeight)
    // The disabled label keeps its own quieter foreground and stays distinct
    // from the required label.
    expect(disabledMetrics.color).toBe(tokens.labelFgDisabled)
    expect(disabledMetrics.color).not.toBe(requiredMetrics.color)

    await required.click()
    await expect(fields.nth(0)).toBeFocused()

    // SSR covers the component's className merge separately. Exercise the
    // compiled caller utility on a genuine label, not an undeclared URL arg.
    await openStory(page, "atoms-label--playground", brand, mode)
    await page.locator(labelSelector).evaluate((node) => {
      node.classList.remove("font-label")
      node.classList.add("font-medium")
    })
    const [overridden] = await labelMetrics(page)
    if (!overridden) {
      throw new Error("Label playground should render a single label")
    }
    expect(overridden.classes).toContain("font-medium")
    expect(overridden.classes).not.toContain("font-label")
    expect(overridden.classes).toContain("text-label-fg")
    expect(overridden.fontWeight).toBe(tokens.medium)
    expect(overridden.fontWeight).not.toBe(expectedWeight)
  })
}
