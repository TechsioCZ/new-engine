import { expect, test } from "@playwright/test"
import {
  checkComboboxCollectionLabels,
  checkNativeAuthority,
  checkNativeDateKeyboardAuthority,
  checkNativeFieldsets,
  checkNativeOwnership,
  checkNativeReset,
  nativeFormAdapters,
  nativeResetCancellations,
} from "./native-form-contracts.mjs"
import { openContractStory } from "./visual-shared-contracts.mjs"

// Keep all lifecycle channels identical in the supported brand/color surfaces.
for (const theme of [
  { brand: "akros", mode: "light" },
  { brand: "base", mode: "light" },
  { brand: "base", mode: "dark" },
]) {
  test.describe(`${theme.brand}/${theme.mode}`, () => {
    test("rating: ProductCard aggregate is named, nonfocusable and not submitted", async ({
      page,
    }) => {
      await openContractStory(page, "atoms-rating--aggregate-display", theme)
      const image = page.getByRole("img", {
        name: "Average product rating: 4.5 out of 5",
      })
      await expect(image).toBeVisible()
      await expect(image).not.toHaveAttribute("tabindex")
      await expect(page.locator("#storybook-root input")).toHaveCount(0)
      await expect(page.getByRole("radio")).toHaveCount(0)
      const before = page.getByRole("button", { name: "Before summary" })
      await before.focus()
      await image.evaluate((node: HTMLElement) => node.focus())
      await expect(before).toBeFocused()
      await page.keyboard.press("Tab")
      await expect(
        page.getByRole("button", { name: "After summary" })
      ).toBeFocused()
      expect(
        await page
          .locator("#storybook-root form")
          .evaluate((form: HTMLFormElement) =>
            new FormData(form).get("aggregate-score")
          )
      ).toBeNull()
    })
    for (const authority of ["uncontrolled", "accept", "refuse"]) {
      test(`combobox: ${authority} collection labels remain coherent before and after reset`, async ({
        page,
      }) => {
        await checkComboboxCollectionLabels(page, authority, theme)
      })
    }
    for (const authority of ["accept", "refuse"]) {
      test(`date-picker: controlled keyboard ${authority} stays coherent while focused and after blur`, async ({
        page,
      }) => {
        await checkNativeDateKeyboardAuthority(page, authority, theme)
      })
    }

    // The normal component projects execute every case in desktop Chromium AND
    // mobile WebKit. Keep cases separate so failures retain component/scenario IDs.
    for (const adapter of nativeFormAdapters) {
      for (const cancellation of nativeResetCancellations) {
        test(`${adapter.id}: native reset ${cancellation}`, async ({
          page,
        }) => {
          await checkNativeReset(page, adapter, cancellation, theme)
        })
      }
      for (const authority of ["accept", "refuse"]) {
        test(`${adapter.id}: controlled ${authority} remains authoritative across native reset`, async ({
          page,
        }) => {
          await checkNativeAuthority(page, adapter, authority, theme)
        })
      }
      test(`${adapter.id}: form=id reassociation and listener cleanup`, async ({
        page,
      }) => {
        await checkNativeOwnership(page, adapter, theme)
      })
      for (const placement of [
        "body",
        "first-legend",
        "second-legend",
        "nested-first-legend",
      ]) {
        test(`${adapter.id}: disabled fieldset ${placement}`, async ({
          page,
        }) => {
          await checkNativeFieldsets(page, adapter, placement, theme)
        })
      }
    }
  })
}
