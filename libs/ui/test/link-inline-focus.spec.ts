import { expect, type Locator, type Page, test } from "@playwright/test"

const themes = [
  ["base", "light"],
  ["base", "dark"],
  ["neo", "light"],
  ["neo", "dark"],
  ["business", "light"],
  ["akros", "light"],
] as const

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

function glyphPositions(paragraph: Locator) {
  return paragraph.evaluate((node) => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
    const result: { text: string; boxes: number[][] }[] = []
    let text = walker.nextNode()
    while (text) {
      for (let i = 0; i < (text.textContent?.length ?? 0); i++) {
        const range = document.createRange()
        range.setStart(text, i)
        range.setEnd(text, i + 1)
        result.push({
          text: text.textContent?.[i] ?? "",
          boxes: Array.from(range.getClientRects(), (rect) => [
            rect.x,
            rect.y,
            rect.width,
            rect.height,
          ]),
        })
      }
      text = walker.nextNode()
    }
    return result
  })
}

async function expectNoPageOverflow(page: Page) {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    )
  ).toBe(false)
}

/** Read a theme token the way the browser computes it, so the link's paint can be
 * compared with the token it claims to consume. */
function resolveToken(page: Page, name: string, property: string) {
  return page.evaluate(
    ({ name: token, property: cssProperty }) => {
      const probe = document.createElement("span")
      probe.style.cssText = `position:absolute;visibility:hidden;${cssProperty}:var(${token})`
      document.body.append(probe)
      const value = getComputedStyle(probe).getPropertyValue(cssProperty)
      probe.remove()
      return value
    },
    { name, property }
  )
}

/** The link's own inline box: one rect per line fragment plus the geometry the
 * focus state must leave exactly as it was. */
function inlineBox(link: Locator) {
  return link.evaluate((node) => {
    const style = getComputedStyle(node)
    return {
      display: style.display,
      paddingInlineStart: style.paddingInlineStart,
      paddingInlineEnd: style.paddingInlineEnd,
      marginInlineStart: style.marginInlineStart,
      marginInlineEnd: style.marginInlineEnd,
      borderTopWidth: style.borderTopWidth,
      rects: Array.from(node.getClientRects(), (rect) => [
        rect.x,
        rect.y,
        rect.width,
        rect.height,
      ]),
    }
  })
}

for (const [brand, mode] of themes) {
  test(`${brand}/${mode}: inline focus highlights the linked text without painting outside it`, async ({
    page,
  }) => {
    for (const direction of ["ltr", "rtl"]) {
      await openStory(page, "atoms-link--in-content", brand, mode)
      const paragraph = page.locator("#storybook-root p")
      const link = paragraph.getByRole("link")
      await paragraph.evaluate((node, dir) => {
        node.setAttribute("dir", dir)
      }, direction)

      const before = await glyphPositions(paragraph)
      const beforeBox = await inlineBox(link)
      const resting = await link.evaluate((node) => {
        const style = getComputedStyle(node)
        return {
          background: style.backgroundColor,
          color: style.color,
          outlineStyle: style.outlineStyle,
          boxShadow: style.boxShadow,
        }
      })
      // The new treatment adds nothing while the link is at rest.
      expect(resting.outlineStyle).toBe("none")
      expect(resting.boxShadow).toBe("none")
      await expectNoPageOverflow(page)

      await expect(page.locator("body")).toBeFocused()
      await page.keyboard.press("Tab")
      await expect(link).toBeFocused()
      expect(
        await link.evaluate((node) => node.matches(":focus-visible"))
      ).toBe(true)

      // Nothing moves: same inline box, same line fragments, same glyphs.
      expect(beforeBox.display).toBe("inline")
      expect(await inlineBox(link)).toEqual(beforeBox)
      expect(await glyphPositions(paragraph)).toEqual(before)
      await expectNoPageOverflow(page)

      // No outer paint at all — no ring and no halo — so no focus edge can reach
      // the punctuation that follows the link.
      const focus = await link.evaluate((node) => {
        const style = getComputedStyle(node)
        return {
          background: style.backgroundColor,
          color: style.color,
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          boxShadow: style.boxShadow,
          halo: style.getPropertyValue("--color-focus-contrast").trim(),
          radius: style.borderTopLeftRadius,
          decoration: style.textDecorationLine,
        }
      })
      expect(focus.outlineStyle).toBe("none")
      expect(Number.parseFloat(focus.outlineWidth)).toBe(0)
      expect(focus.halo).toBe("transparent")
      const shadowColors = focus.boxShadow.match(/rgba?\([^)]*\)/g) ?? []
      expect(shadowColors.length).toBeGreaterThan(0)
      expect(shadowColors.every((color) => color === "rgba(0, 0, 0, 0)")).toBe(
        true
      )
      expect(focus.decoration).toContain("underline")

      // The highlight is a live consumer of the Link aliases: its background is the
      // colour the link rests in, and its text is that colour's reverse.
      const restingInk = await resolveToken(
        page,
        "--color-link-fg-readable",
        "color"
      )
      const reverseInk = await resolveToken(page, "--color-fg-reverse", "color")
      const ownedRadius = await resolveToken(
        page,
        "--radius-link",
        "border-top-left-radius"
      )
      expect(resting.color).toBe(restingInk)
      expect(resting.background).not.toBe(restingInk)
      expect(focus.background).toBe(restingInk)
      expect(focus.color).toBe(reverseInk)
      expect(focus.color).not.toBe(focus.background)
      expect(focus.radius).toBe(ownedRadius)
      expect(Number.parseFloat(focus.radius)).toBeGreaterThan(0)

      // A caller may retarget the highlight through the Link-owned alias.
      await link.evaluate((node) => {
        ;(node as HTMLElement).style.setProperty(
          "--color-link-focus-bg",
          "var(--color-fg-secondary)"
        )
      })
      const secondary = await resolveToken(
        page,
        "--color-fg-secondary",
        "background-color"
      )
      await expect(link).toHaveCSS("background-color", secondary)
      await link.evaluate((node) =>
        (node as HTMLElement).style.removeProperty("--color-link-focus-bg")
      )
      await expect(link).toHaveCSS("background-color", restingInk)

      const beforeActivation = page.url()
      await page.keyboard.press("Enter")
      expect(page.url()).toBe(beforeActivation)
    }
  })

  test(`${brand}/${mode}: size navigation and the live radius override keep native link semantics`, async ({
    page,
    browserName,
  }) => {
    await openStory(page, "atoms-link--sizes", brand, mode)
    const links = page.locator("#storybook-root a")
    await expect(links).toHaveCount(3)
    const sizes = await links.evaluateAll((nodes) =>
      nodes.map((node) => Number.parseFloat(getComputedStyle(node).fontSize))
    )
    const [small, medium, large] = sizes
    if (small === undefined || medium === undefined || large === undefined) {
      throw new Error("All three rendered link sizes are required")
    }
    expect(small).toBeLessThan(medium)
    expect(medium).toBeLessThan(large)
    for (let index = 0; index < 3; index++) {
      await page.keyboard.press("Tab")
      await expect(links.nth(index)).toBeFocused()
    }

    // The focused radius is the Link-owned alias, and a caller can retarget it.
    const link = links.last()
    const ownedRadius = await resolveToken(
      page,
      "--radius-link",
      "border-top-left-radius"
    )
    await expect(link).toHaveCSS("border-top-left-radius", ownedRadius)
    const callerRadius = await resolveToken(
      page,
      "--radius-lg",
      "border-top-left-radius"
    )
    await link.evaluate((node) =>
      (node as HTMLElement).style.setProperty(
        "--radius-link",
        "var(--radius-lg)"
      )
    )
    await expect(link).toHaveCSS("border-top-left-radius", callerRadius)
    await link.evaluate((node) =>
      (node as HTMLElement).style.removeProperty("--radius-link")
    )
    await expect(link).toHaveCSS("border-top-left-radius", ownedRadius)
    await expectNoPageOverflow(page)

    await openStory(page, "atoms-link--external", brand, mode)
    const external = page.getByRole("link")
    await expect(external).toHaveAttribute("target", "_blank")
    await expect(external).toHaveAttribute("rel", "noopener noreferrer")
    const beforeActivation = page.url()
    await external.click()
    expect(page.url()).toBe(beforeActivation)

    // These are genuine React caller props in a declared story, not URL args
    // or classes added to the rendered element by the test.
    await openStory(page, "atoms-link--caller-focus", brand, mode)
    const caller = page.locator("#storybook-root a")
    await page.keyboard.press("Tab")
    await expect(caller).toBeFocused()
    await expect(caller).toHaveCSS("outline-style", "solid")
    expect(
      await caller.evaluate((node) =>
        Number.parseFloat(getComputedStyle(node).outlineWidth)
      )
    ).toBeGreaterThan(0)
    const callerShadowColors = await caller.evaluate(
      (node) => getComputedStyle(node).boxShadow.match(/rgba?\([^)]*\)/g) ?? []
    )
    expect(callerShadowColors.length).toBeGreaterThan(0)
    expect(
      callerShadowColors.some((color) => color !== "rgba(0, 0, 0, 0)")
    ).toBe(true)

    // Chromium supports forced-colors emulation here; WebKit's regular focus
    // path is covered above rather than claiming unsupported media emulation.
    if (browserName === "chromium") {
      await page.emulateMedia({ forcedColors: "active" })
      await openStory(page, "atoms-link--in-content", brand, mode)
      const highContrast = page.locator("#storybook-root a")
      await page.keyboard.press("Tab")
      await expect(highContrast).toBeFocused()
      await expect(highContrast).toHaveCSS("outline-style", "solid")
      await expect(highContrast).toHaveCSS("forced-color-adjust", "auto")
      const outline = await highContrast.evaluate((node) => {
        const style = getComputedStyle(node)
        return {
          width: Number.parseFloat(style.outlineWidth),
          offset: Number.parseFloat(style.outlineOffset),
        }
      })
      expect(outline.width).toBeGreaterThan(0)
      expect(outline.offset).toBe(-outline.width)
    }
  })
}
