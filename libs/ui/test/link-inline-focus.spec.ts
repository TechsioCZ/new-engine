import { expect, type Locator, type Page, test } from "@playwright/test"

const themes = [
  ["n1", "light"],
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
  await expect(page.locator("html")).toHaveAttribute("data-theme", brand)
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
      // The probe carries a decoration line so decoration properties read back
      // their computed value rather than a resting keyword.
      probe.style.cssText = `position:absolute;visibility:hidden;text-decoration-line:underline;${cssProperty}:var(${token})`
      document.body.append(probe)
      const value = getComputedStyle(probe).getPropertyValue(cssProperty)
      probe.remove()
      return value
    },
    { name, property }
  )
}

/** Same read, but inside a real consumer element, so scoped overrides (the
 * Footer's own foreground roles) are honoured instead of the page root's. */
function resolveTokenIn(scope: Locator, name: string, property: string) {
  return scope.evaluate(
    (node, { name: token, property: cssProperty }) => {
      const probe = document.createElement("span")
      probe.style.cssText = `position:absolute;visibility:hidden;text-decoration-line:underline;${cssProperty}:var(${token})`
      node.append(probe)
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
  test(`${brand}/${mode}: inline focus strengthens the link underline without painting outside it`, async ({
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
          decorationLine: style.textDecorationLine,
          decorationStyle: style.textDecorationStyle,
          decorationThickness: style.textDecorationThickness,
          decorationOffset: style.textUnderlineOffset,
          decorationSkipInk: style.textDecorationSkipInk,
        }
      })
      // The new treatment adds nothing while the link is at rest.
      expect(resting.outlineStyle).toBe("none")
      expect(resting.boxShadow).toBe("none")
      expect(resting.background).toBe("rgba(0, 0, 0, 0)")
      expect(resting.decorationStyle).toBe("solid")
      expect(resting.decorationSkipInk).toBe("auto")
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

      // No outer paint and no fill at all — no ring, no halo and no box — so no
      // focus edge can reach the punctuation that follows the link.
      const focus = await link.evaluate((node) => {
        const style = getComputedStyle(node)
        return {
          background: style.backgroundColor,
          color: style.color,
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          boxShadow: style.boxShadow,
          halo: style.getPropertyValue("--color-focus-contrast").trim(),
          decorationLine: style.textDecorationLine,
          decorationStyle: style.textDecorationStyle,
          decorationColor: style.textDecorationColor,
          decorationThickness: style.textDecorationThickness,
          decorationOffset: style.textUnderlineOffset,
          decorationSkipInk: style.textDecorationSkipInk,
        }
      })
      expect(focus.outlineStyle).toBe("none")
      expect(Number.parseFloat(focus.outlineWidth)).toBe(0)
      expect(focus.halo).toBe("transparent")
      expect(focus.background).toBe("rgba(0, 0, 0, 0)")
      const shadowColors = focus.boxShadow.match(/rgba?\([^)]*\)/g) ?? []
      expect(shadowColors.length).toBeGreaterThan(0)
      expect(shadowColors.every((color) => color === "rgba(0, 0, 0, 0)")).toBe(
        true
      )

      // Focus is the link's own underline made unmistakable: one continuous
      // solid rule, one border step heavier and dropped clear of the glyphs,
      // that leaves the label colour and the inline box alone.
      expect(focus.decorationLine).toContain("underline")
      expect(focus.decorationStyle).toBe("solid")
      expect(focus.decorationThickness).not.toBe(resting.decorationThickness)
      expect(Number.parseFloat(focus.decorationThickness)).toBeGreaterThan(1)
      // The single rule is painted without skip-ink gaps and sits lower than
      // the resting hairline, so descenders no longer split it into blocks.
      expect(focus.decorationSkipInk).toBe("none")
      expect(focus.decorationOffset).not.toBe(resting.decorationOffset)
      expect(Number.parseFloat(focus.decorationOffset)).toBeGreaterThan(
        Number.parseFloat(resting.decorationOffset)
      )
      expect(focus.color).toBe(resting.color)

      // The strengthened underline is a live consumer of the Link aliases.
      const restingInk = await resolveToken(
        page,
        "--color-link-fg-readable",
        "color"
      )
      const decorationInk = await resolveToken(
        page,
        "--color-link-focus-decoration",
        "text-decoration-color"
      )
      expect(resting.color).toBe(restingInk)
      expect(focus.decorationColor).toBe(decorationInk)

      // A caller may retarget the focus underline through the Link-owned alias.
      await link.evaluate((node) => {
        ;(node as HTMLElement).style.setProperty(
          "--color-link-focus-decoration",
          "var(--color-fg-secondary)"
        )
      })
      const secondary = await resolveToken(
        page,
        "--color-fg-secondary",
        "text-decoration-color"
      )
      await expect(link).toHaveCSS("text-decoration-color", secondary)
      await link.evaluate((node) =>
        (node as HTMLElement).style.removeProperty(
          "--color-link-focus-decoration"
        )
      )
      await expect(link).toHaveCSS("text-decoration-color", decorationInk)

      const beforeActivation = page.url()
      await page.keyboard.press("Enter")
      expect(page.url()).toBe(beforeActivation)
    }

    // Footer adds its own hover foreground. Focus must keep the strengthened
    // underline in this real consumer, including when both states match
    // simultaneously, and must not repaint the label the caller colours.
    await openStory(page, "organisms-footer--playground", brand, mode)
    const footerLink = page.locator("#storybook-root footer a").first()
    await page.mouse.move(0, 0)
    const footerRestingColor = await footerLink.evaluate(
      (node) => getComputedStyle(node).color
    )
    const footerRestingThickness = await footerLink.evaluate(
      (node) => getComputedStyle(node).textDecorationThickness
    )
    const footerHoverColor = await resolveTokenIn(
      footerLink,
      "--color-footer-link-fg-hover",
      "color"
    )
    const hoverPaintEnabled = await page.evaluate(
      () => matchMedia("(hover: hover) and (pointer: fine)").matches
    )
    const footerDecoration = await resolveTokenIn(
      footerLink,
      "--color-link-focus-decoration",
      "text-decoration-color"
    )
    await page.keyboard.press("Tab")
    await expect(footerLink).toBeFocused()
    expect(
      await footerLink.evaluate((node) => node.matches(":focus-visible"))
    ).toBe(true)
    // The underline is painted in a real, non-transparent colour.
    expect(footerDecoration).not.toBe("rgba(0, 0, 0, 0)")
    const footerThickness = await footerLink.evaluate(
      (node) => getComputedStyle(node).textDecorationThickness
    )
    expect(footerThickness).not.toBe(footerRestingThickness)
    expect(Number.parseFloat(footerThickness)).toBeGreaterThan(1)
    await expect(footerLink).toHaveCSS("color", footerRestingColor)
    await expect(footerLink).toHaveCSS("text-decoration-style", "solid")
    await expect(footerLink).toHaveCSS(
      "text-decoration-color",
      footerDecoration
    )
    await footerLink.hover()
    expect(
      await footerLink.evaluate(
        (node) => node.matches(":focus-visible") && node.matches(":hover")
      )
    ).toBe(true)
    await expect(footerLink).toBeFocused()
    // The shared hover variant requires a hover-capable fine pointer. Touch
    // WebKit may match :hover without enabling that media-gated colour rule.
    await expect(footerLink).toHaveCSS(
      "color",
      hoverPaintEnabled ? footerHoverColor : footerRestingColor
    )
    await expect(footerLink).toHaveCSS("text-decoration-style", "solid")
    await expect(footerLink).toHaveCSS(
      "text-decoration-color",
      footerDecoration
    )
    await expect(footerLink).toHaveCSS(
      "text-decoration-thickness",
      footerThickness
    )
    await page.mouse.move(0, 0)
    await expect(footerLink).toBeFocused()
    await expect(footerLink).toHaveCSS("color", footerRestingColor)
  })

  test(`${brand}/${mode}: size navigation and the live focus-underline override keep native link semantics`, async ({
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

    // The focused underline weight is the Link-owned alias, and a caller can
    // retarget it through the same alias the component consumes.
    const link = links.last()
    const ownedThickness = await link.evaluate(
      (node) => getComputedStyle(node).textDecorationThickness
    )
    expect(Number.parseFloat(ownedThickness)).toBeGreaterThan(1)
    const callerThickness = await resolveToken(
      page,
      "--border-width-sm",
      "text-decoration-thickness"
    )
    await link.evaluate((node) =>
      (node as HTMLElement).style.setProperty(
        "--border-width-link-focus",
        "var(--border-width-sm)"
      )
    )
    await expect(link).toHaveCSS("text-decoration-thickness", callerThickness)
    await link.evaluate((node) =>
      (node as HTMLElement).style.removeProperty("--border-width-link-focus")
    )
    await expect(link).toHaveCSS("text-decoration-thickness", ownedThickness)
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
