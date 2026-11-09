import { expect, type Page, test } from "@playwright/test"

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
  await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${mode}\\b`))
  if (brand !== "base") {
    await expect(page.locator("html")).toHaveAttribute("data-theme", brand)
  }
}

for (const [brand, mode] of themes) {
  test(`${brand}/${mode}: Rating scale, real arrows and silent reset keep focus ownership`, async ({
    page,
  }) => {
    // Finished includes the unchanged story's shrink, two real ArrowLeft edits,
    // reset assertions and exact callback count: the path that failed in CI.
    await openStory(page, "atoms-rating--changing-scale", brand, mode)
    const form = page.getByRole("form", { name: "Delivery review" })
    const score = form.locator('input[name="score"]')
    const third = form.getByRole("radio", { name: "3 stars", exact: true })
    const second = form.getByRole("radio", { name: "2 stars", exact: true })
    await expect(form.getByRole("radio")).toHaveCount(3)
    await expect(score).toHaveValue("3")
    await expect(third).toBeChecked()
    await expect(third).toHaveAttribute("tabindex", "0")
    await expect(
      form.getByText("Score changes: 3", { exact: true })
    ).toBeVisible()

    await third.focus()
    await page.keyboard.press("ArrowLeft")
    await expect(score).toHaveValue("2")
    await expect(second).toBeChecked()
    await expect(second).toHaveAttribute("tabindex", "0")
    await expect(second).toBeFocused()
    await expect(
      form.getByText("Score changes: 4", { exact: true })
    ).toBeVisible()

    const reset = form.getByRole("button", { name: "Restore original score" })
    await reset.click()
    await expect(score).toHaveValue("3")
    await expect(third).toBeChecked()
    await expect(third).toHaveAttribute("tabindex", "0")
    await expect(reset).toBeFocused()
    await expect(
      form.getByText("Score changes: 4", { exact: true })
    ).toBeVisible()
  })

  test(`${brand}/${mode}: Rating read-only and fieldset transitions retain their guards`, async ({
    page,
  }) => {
    await openStory(page, "atoms-rating--read-only", brand, mode)
    const selected = page.getByRole("radio", { checked: true })
    await expect(selected).toHaveAccessibleName("4 stars")
    await expect(selected).toHaveAttribute("tabindex", "0")
    await selected.focus()
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("Space")
    await expect(selected).toBeChecked()
    await expect(page.locator('input[name="saved-score"]')).toHaveValue("4")

    await openStory(page, "atoms-rating--fieldset-lifecycle", brand, mode)
    const nested = page.getByRole("radiogroup", { name: "Nested rating" })
    const legend = page.getByRole("radiogroup", {
      name: "Legend rating",
      exact: true,
    })
    await expect(legend.getByRole("radio", { checked: true })).toHaveAttribute(
      "tabindex",
      "0"
    )
    await expect(
      nested.getByRole("radio", { checked: true })
    ).toHaveAccessibleName("4 stars")
    for (const radio of await nested.getByRole("radio").all()) {
      await expect(radio).toHaveAttribute("aria-disabled", "true")
      await expect(radio).not.toHaveAttribute("tabindex", "0")
    }

    const toggle = page.getByRole("button", { name: "Toggle fieldset" })
    await toggle.click()
    const fourth = nested.getByRole("radio", { name: "4 stars", exact: true })
    await expect(fourth).toHaveAttribute("tabindex", "0")
    await fourth.focus()
    await page.keyboard.press("ArrowLeft")
    const third = nested.getByRole("radio", { name: "3 stars", exact: true })
    await expect(third).toBeChecked()
    await expect(third).toBeFocused()
    await toggle.click()
    for (const radio of await nested.getByRole("radio").all()) {
      await expect(radio).toHaveAttribute("aria-disabled", "true")
      await expect(radio).not.toHaveAttribute("tabindex", "0")
    }
    await expect(toggle).toBeFocused()
  })
}
