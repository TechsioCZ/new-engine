import { expect, test } from "@playwright/test"

const schemes = [
  ["akros", "light"],
  ["base", "light"],
  ["base", "dark"],
] as const

for (const [brand, mode] of schemes) {
  const globals = `&globals=mode:${mode};brand:${brand}`

  test(`${brand}/${mode}: pending submit retains focus and blocks duplicate native submission`, async ({
    page,
  }) => {
    await page.goto(
      `/iframe.html?id=atoms-button--pending-action&viewMode=story${globals}`
    )
    // The story play completes its initial success/failure/retry demonstration.
    await expect(
      page.getByText("Changes saved.", { exact: true })
    ).toBeVisible()
    const save = page.locator('#storybook-root button[type="submit"]')
    const before = Number(await page.getByTestId("save-attempts").textContent())
    await save.focus()
    await page.keyboard.press("Enter")
    await expect(save).toBeFocused()
    await expect(save).toHaveAttribute("aria-busy", "true")
    expect(
      await save.evaluate((node) => (node as HTMLButtonElement).disabled)
    ).toBe(false)
    await page.keyboard.press("Space")
    await page.keyboard.press("Enter")
    await save.click({ force: true })
    await page.getByRole("textbox", { name: "Project name" }).focus()
    await page.keyboard.press("Enter")
    const prevented = await save.evaluate((node) => {
      const event = new SubmitEvent("submit", {
        cancelable: true,
        bubbles: true,
        submitter: node as HTMLButtonElement,
      })
      ;(node as HTMLButtonElement).form?.dispatchEvent(event)
      return event.defaultPrevented
    })
    expect(prevented).toBe(true)
    await expect(page.getByTestId("save-attempts")).toHaveText(
      String(before + 1)
    )
    const field = page.getByRole("textbox", { name: "Project name" })
    await field.fill("Edited project")
    const reset = page.locator('#storybook-root button[type="reset"]')
    await reset.click({ force: true })
    await expect(field).toHaveValue("Edited project")
    const fail = page.getByRole("button", { name: "Fail save" })
    await fail.click()
    await expect(fail).toBeFocused()
    await expect(save).not.toHaveAttribute("aria-busy")
    await reset.click()
    await expect(field).toHaveValue("Autumn collection")
    await save.focus()
    await page.keyboard.press("Space")
    await expect(save).toBeFocused()
    await expect(page.getByTestId("save-attempts")).toHaveText(
      String(before + 2)
    )
  })

  test(`${brand}/${mode}: native Tab and Shift+Tab skip every loading placeholder`, async ({
    page,
  }) => {
    await page.goto(
      `/iframe.html?id=atoms-skeleton--interaction-isolation&viewMode=story&embed=true${globals}`
    )
    const toggle = page.getByRole("button", { name: "Toggle loading" })
    await expect(toggle).toBeVisible()
    // Embed mode leaves loading state and keyboard input owned by this spec,
    // rather than racing the story's independent interaction demonstration.
    await expect(page.getByTestId("skeleton-group")).toHaveAttribute(
      "aria-busy",
      "true"
    )
    await toggle.focus()
    await page.keyboard.press("Tab")
    await expect(
      page.getByRole("button", { name: "After placeholders" })
    ).toBeFocused()
    await page.keyboard.press("Shift+Tab")
    await expect(toggle).toBeFocused()
    const group = page.getByTestId("skeleton-group")
    await expect(group).toHaveCSS("animation-name", "none")
    await expect(group).toHaveCSS("opacity", "1")
    await page.emulateMedia({ reducedMotion: "reduce" })
    for (const id of ["group-rectangle", "standalone-rectangle"]) {
      await expect(page.getByTestId(id)).toHaveCSS("opacity", "0.7")
      await expect(page.getByTestId(id)).toHaveCSS("animation-name", "none")
    }
    await toggle.click()
    await expect(
      page.locator("#storybook-root [inert], #storybook-root [aria-busy=true]")
    ).toHaveCount(0)
    await page.keyboard.press("Tab")
    await expect(
      page.getByRole("button", { name: "Root action" })
    ).toBeFocused()
    await page.keyboard.press("Enter")
    await page.keyboard.press("Tab")
    await expect(
      page.getByRole("button", { name: "Rectangle action" })
    ).toBeFocused()
    await page.keyboard.press("Space")
  })

  test(`${brand}/${mode}: native and adapter media recover with composed callbacks`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(
      `/iframe.html?id=atoms-image--failed-and-recovery&viewMode=story${globals}`
    )
    await expect(
      page.getByRole("button", { name: "Break photo" })
    ).toBeVisible()
    await page.getByRole("button", { name: "Break photo" }).click()
    await expect(page.locator("[data-image-fallback]")).toHaveCount(3)
    await expect(
      page.getByRole("img", {
        name: "Mountain landscape — photo unavailable",
        exact: true,
      })
    ).toBeVisible()
    for (const image of await page.locator("#storybook-root img").all()) {
      await expect(image).toHaveCSS("opacity", "0")
      await expect(image).toHaveAttribute("aria-hidden", "true")
    }
    await page.getByRole("button", { name: "Load working photo" }).click()
    await expect(page.locator("[data-image-fallback]")).toHaveCount(1)
    await expect(page.getByTestId("image-errors")).toHaveText("4")
    await expect(page.getByTestId("image-loads")).toHaveText("4")
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true)
  })
}

test("native and custom-adapter refs retain their real DOM targets", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=atoms-image--primitive-refs&viewMode=story")
  await expect(page.getByTestId("primitive-ref-targets")).toHaveText(
    "A,BUTTON,SPAN,IMG,IMG"
  )
})

test("grouped skeletons have one pulse owner and independent local timing", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.goto(
    "/iframe.html?id=atoms-skeleton--interaction-isolation&viewMode=story&embed=true"
  )
  const toggle = page.getByRole("button", { name: "Toggle loading" })
  await expect(toggle).toBeVisible()
  const group = page.getByTestId("skeleton-group")
  await expect(group).toHaveAttribute("aria-busy", "true")
  await expect(group).toHaveCSS("animation-name", "none")
  const sampled = await page.evaluate(() =>
    ["group-rectangle", "standalone-rectangle"].map((id) => {
      const element = document.querySelector(
        `[data-testid="${id}"]`
      ) as HTMLElement
      const animation = element.getAnimations()[0]
      if (!animation) {
        throw new Error("Visible skeleton shape must own its pulse")
      }
      animation.pause()
      animation.currentTime = 500
      return {
        opacity: getComputedStyle(element).opacity,
        duration: getComputedStyle(element).animationDuration,
      }
    })
  )
  expect(sampled).toEqual([
    { opacity: "0.5", duration: "1s" },
    { opacity: "0.5", duration: "1s" },
  ])
  await expect(group).toHaveCSS("opacity", "1")
})

for (const [brand, mode] of [
  ...schemes,
  ["neo", "light"],
  ["neo", "dark"],
  ["business", "light"],
]) {
  test(`${brand}/${mode}: destructive glyph contrast survives overlapping hover and active`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto(
      `/iframe.html?id=atoms-actionicon--variants&viewMode=story&globals=mode:${mode};brand:${brand}`
    )
    const button = page.getByRole("button", { name: "Remove attachment" })
    const ratio = () =>
      button.evaluate((node) => {
        const canvas = document.createElement("canvas")
        canvas.width = 1
        canvas.height = 1
        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D
        const ancestors: Element[] = []
        for (let el: Element | null = node; el; el = el.parentElement) {
          ancestors.unshift(el)
        }
        ctx.fillStyle = "white"
        ctx.fillRect(0, 0, 1, 1)
        for (const el of ancestors) {
          ctx.fillStyle = getComputedStyle(el).backgroundColor
          ctx.fillRect(0, 0, 1, 1)
        }
        const background = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3)
        ctx.fillStyle = getComputedStyle(node).color
        ctx.fillRect(0, 0, 1, 1)
        const foreground = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3)
        const luminance = (rgb: number[]) =>
          rgb
            .map((value) => {
              const channel = value / 255
              return channel <= 0.040_45
                ? channel / 12.92
                : ((channel + 0.055) / 1.055) ** 2.4
            })
            .reduce(
              (sum, value, index) =>
                sum + value * ([0.2126, 0.7152, 0.0722][index] ?? 0),
              0
            )
        const a = luminance(foreground)
        const b = luminance(background)
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
      })
    for (const elevated of [false, true]) {
      if (elevated) {
        await button.evaluate((node) => {
          if (node.parentElement) {
            node.parentElement.style.backgroundColor =
              "var(--color-fill-surface)"
          }
        })
      }
      await page.mouse.move(1, 1)
      expect(await ratio()).toBeGreaterThanOrEqual(3)
      await button.hover()
      expect(await ratio()).toBeGreaterThanOrEqual(3)
      await page.mouse.down()
      expect(await ratio()).toBeGreaterThanOrEqual(3)
      await page.mouse.up()
      await page.mouse.move(1, 1)
      await button.focus()
      await page.keyboard.down("Space")
      expect(await ratio()).toBeGreaterThanOrEqual(3)
      await page.keyboard.up("Space")
    }
    await button.evaluate((node) => {
      ;(node as HTMLButtonElement).disabled = true
    })
    await button.hover({ force: true })
    await page.mouse.down()
    expect(await button.evaluate((node) => node.matches(":disabled"))).toBe(
      true
    )
    await page.mouse.up()
  })
}
