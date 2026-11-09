import { expect, type Page, test } from "@playwright/test"

const themes = [
  ["n1", "light"],
  ["business", "light"],
  ["akros", "light"],
] as const

async function openCarousel(
  page: Page,
  story: string,
  brand: string,
  mode: string
) {
  await page.goto(
    `/iframe.html?id=molecules-carousel--${story}&globals=brand:${brand};mode:${mode}&args=controls:minimal`
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

for (const [brand, mode] of themes) {
  test(`${brand}/${mode}: disabled photo-overlay ActionIcons retain the caller surface`, async ({
    page,
  }) => {
    await openCarousel(page, "playground", brand, mode)
    const available = page.getByRole("button", {
      name: "Next slide",
      exact: true,
    })
    await expect(available).toBeEnabled()
    const expectedSurface = await available.evaluate(
      (node) => getComputedStyle(node).backgroundColor
    )

    await openCarousel(page, "single-slide", brand, mode)
    for (const name of ["Previous slide", "Next slide"]) {
      const control = page.getByRole("button", { name, exact: true })
      await expect(control).toBeDisabled()
      await expect(control).toHaveCSS("background-color", expectedSurface)
      await control.hover()
      await expect(control).toHaveCSS("background-color", expectedSurface)
    }
  })
}
