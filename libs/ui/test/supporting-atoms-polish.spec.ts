import { expect, type Page, test } from "@playwright/test"

// Functional regression for the Hotkeys/Tooltip supporting-atom polish.
// Every expected value is resolved through the live cascade: the keycap scale
// is compared against the --text-* aliases the --text-hotkeys-* tokens point at,
// and the popup shadow against the shadow-tooltip-surface utility the popup
// actually wears plus the aliases --shadow-tooltip resolves to. No raw var()
// text is compared to computed CSS.

const themes = [
  ["n1", "light"],
  ["business", "light"],
  ["akros", "light"],
] as const

const hotkeysRoot = '#storybook-root [data-scope="hotkeys"][data-part="root"]'
const hotkeysKey = '#storybook-root [data-scope="hotkeys"][data-part="key"]'
const hotkeysSeparator =
  '#storybook-root [data-scope="hotkeys"][data-part="separator"]'

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

type FontAliases = {
  xs: string
  sm: string
  base: string
  md: string
  lg: string
  businessSm: string
  tokenSm: string
  tokenMd: string
  tokenLg: string
}

function resolveFontAliases(page: Page): Promise<FontAliases> {
  return page.evaluate(() => {
    const host = document.createElement("div")
    host.style.cssText =
      "position:absolute;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none"
    document.body.append(host)
    const read = (style: string) => {
      const node = document.createElement("span")
      node.style.cssText = style
      host.append(node)
      return getComputedStyle(node).fontSize
    }
    const aliases = {
      xs: read("font-size: var(--text-xs)"),
      sm: read("font-size: var(--text-sm)"),
      base: read("font-size: var(--text-base)"),
      md: read("font-size: var(--text-md)"),
      lg: read("font-size: var(--text-lg)"),
      businessSm: read(
        "font-size: calc((var(--text-xs) + var(--text-sm)) / 2)"
      ),
      tokenSm: read("font-size: var(--text-hotkeys-sm)"),
      tokenMd: read("font-size: var(--text-hotkeys-md)"),
      tokenLg: read("font-size: var(--text-hotkeys-lg)"),
    }
    host.remove()
    return aliases
  })
}

type ShadowAliases = {
  tooltip: string
  popup: string
  large: string
}

function resolveShadowAliases(page: Page): Promise<ShadowAliases> {
  return page.evaluate(() => {
    const host = document.createElement("div")
    host.style.cssText =
      "position:absolute;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none"
    document.body.append(host)
    const read = (className: string) => {
      const node = document.createElement("span")
      node.className = className
      host.append(node)
      return getComputedStyle(node).boxShadow
    }
    const aliases = {
      tooltip: read("shadow-tooltip-surface"),
      popup: read("shadow-popup"),
      large: read("shadow-lg"),
    }
    host.remove()
    return aliases
  })
}

// An ordinary shadow utility (for example `hover:shadow-none`) writes
// --tw-shadow on the same element. The probe replays that write, which a base
// declaration marked important would swallow.
function resolveCallerShadowWrite(
  page: Page
): Promise<{ base: string; override: string }> {
  return page.evaluate(() => {
    const host = document.createElement("div")
    host.style.cssText =
      "position:absolute;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none"
    document.body.append(host)
    const node = document.createElement("span")
    node.className = "shadow-tooltip-surface"
    host.append(node)
    const base = getComputedStyle(node).boxShadow
    node.style.setProperty("--tw-shadow", "0 0 #0000")
    const override = getComputedStyle(node).boxShadow
    host.remove()
    return { base, override }
  })
}

function popupMetrics(page: Page) {
  return page.getByRole("tooltip").evaluate((node) => {
    const rect = node.getBoundingClientRect()
    return {
      shadow: getComputedStyle(node).boxShadow,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    }
  })
}

for (const [brand, mode] of themes) {
  test(`${brand}/${mode}: Hotkeys size steps keep their keycaps and brand scale`, async ({
    page,
  }) => {
    await openStory(page, "atoms-hotkeys--sizes", brand, mode)

    const roots = page.locator(hotkeysRoot)
    await expect(roots).toHaveCount(3)
    await expect(page.locator(hotkeysKey)).toHaveCount(3)
    await expect(page.locator(hotkeysSeparator)).toHaveCount(0)
    for (const root of await roots.all()) {
      await expect(root.locator(':scope > kbd[data-part="key"]')).toHaveCount(1)
    }

    const rendered = await roots.evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).fontSize)
    )
    const keycaps = await page
      .locator(hotkeysKey)
      .evaluateAll((nodes) =>
        nodes.map((node) => getComputedStyle(node).fontSize)
      )
    const [sm, md, lg] = rendered
    if (sm === undefined || md === undefined || lg === undefined) {
      throw new Error("Hotkeys sizes story should render three keycaps")
    }
    expect(keycaps).toEqual(rendered)
    expect(Number.parseFloat(sm)).toBeLessThan(Number.parseFloat(md))
    expect(Number.parseFloat(md)).toBeLessThan(Number.parseFloat(lg))

    const aliases = await resolveFontAliases(page)
    expect([sm, md, lg]).toEqual([
      aliases.tokenSm,
      aliases.tokenMd,
      aliases.tokenLg,
    ])
    expect(lg).toBe(aliases.md)
    if (brand === "business") {
      expect(sm).toBe(aliases.businessSm)
      expect(md).toBe(aliases.base)
    } else {
      expect(sm).toBe(aliases.xs)
      expect(md).toBe(aliases.sm)
    }

    // A caller override of the public size token resolves on the keycap root.
    const mdRoot = roots.nth(1)
    await mdRoot.evaluate((node) =>
      (node as HTMLElement).style.setProperty(
        "--text-hotkeys-md",
        "var(--text-lg)"
      )
    )
    await expect(mdRoot).toHaveCSS("font-size", aliases.lg)
    await expect(roots.nth(0)).toHaveCSS("font-size", sm)
    await expect(roots.nth(2)).toHaveCSS("font-size", lg)
    await mdRoot.evaluate((node) =>
      (node as HTMLElement).style.removeProperty("--text-hotkeys-md")
    )
    await expect(mdRoot).toHaveCSS("font-size", md)

    // The compound story keeps two keycaps around a decorative separator, all
    // inheriting the keycap root scale.
    await openStory(page, "atoms-hotkeys--compound", brand, mode)
    const compound = page.locator(hotkeysRoot)
    await expect(compound).toHaveCount(1)
    await expect(compound.locator(':scope > [data-part="key"]')).toHaveCount(2)
    const separator = compound.locator(':scope > [data-part="separator"]')
    await expect(separator).toHaveCount(1)
    await expect(separator).toHaveAttribute("aria-hidden", "true")
    const parts = await compound.evaluate((node) => {
      const children = Array.from(node.children)
      return {
        root: getComputedStyle(node).fontSize,
        parts: children.map((child) => getComputedStyle(child).fontSize),
        firstTag: children[0]?.tagName,
      }
    })
    expect(parts.firstTag).toBe("KBD")
    expect(parts.parts).toEqual([parts.root, parts.root, parts.root])
    expect(parts.root).toBe(md)
  })

  test(`${brand}/${mode}: Tooltip keeps its real popup and brand elevation`, async ({
    page,
  }) => {
    await openStory(page, "atoms-tooltip--playground", brand, mode, "size:md")

    const trigger = page.getByRole("button", {
      name: "Download order",
      exact: true,
    })
    await expect(trigger).toBeVisible()
    await trigger.hover()

    const popup = page.getByRole("tooltip")
    await expect(popup).toBeVisible()
    await expect(popup).toHaveAttribute("role", "tooltip")
    await expect(popup).toContainText("Download a copy of this order as a PDF.")
    expect(
      await popup.evaluate(
        (node) => node.closest('[data-part="trigger"]') === null
      )
    ).toBe(true)
    const describedBy = await trigger.getAttribute("aria-describedby")
    if (describedBy === null) {
      throw new Error("Tooltip trigger should describe its popup")
    }
    expect(await popup.getAttribute("id")).toBe(describedBy)
    await expect
      .poll(() =>
        popup.evaluate((node) => Math.round(node.getBoundingClientRect().width))
      )
      .toBeGreaterThan(0)

    const aliases = await resolveShadowAliases(page)
    // The popup resolves its elevation through the public --shadow-tooltip
    // alias: Business raises it to --shadow-lg, every other brand keeps the
    // unchanged --shadow-popup.
    const expectedShadow = brand === "business" ? aliases.large : aliases.popup
    const override =
      brand === "business" ? "var(--shadow-popup)" : "var(--shadow-lg)"
    const overrideShadow = brand === "business" ? aliases.popup : aliases.large
    const before = await popupMetrics(page)
    expect(before.shadow).toBe(aliases.tooltip)
    expect(before.shadow).toBe(expectedShadow)

    // A caller override of the public shadow token resolves on the open popup
    // without changing its box or hiding it.
    expect(before.shadow).not.toBe(overrideShadow)
    await popup.evaluate(
      (node, value) =>
        (node as HTMLElement).style.setProperty("--shadow-tooltip", value),
      override
    )
    await expect(popup).toHaveCSS("box-shadow", overrideShadow)
    await expect(popup).toBeVisible()
    await expect(popup).toHaveAttribute("role", "tooltip")
    await expect(popup).toContainText("Download a copy of this order as a PDF.")
    const after = await popupMetrics(page)
    expect({ width: after.width, height: after.height }).toEqual({
      width: before.width,
      height: before.height,
    })
    await popup.evaluate((node) =>
      (node as HTMLElement).style.removeProperty("--shadow-tooltip")
    )
    await expect(popup).toHaveCSS("box-shadow", before.shadow)

    // A caller's ordinary shadow utility still lands: the popup elevation is
    // not pinned by an important base declaration.
    const caller = await resolveCallerShadowWrite(page)
    expect(caller.base).toBe(expectedShadow)
    expect(caller.override).not.toBe(caller.base)
    expect(caller.override).not.toBe(expectedShadow)
  })
}
