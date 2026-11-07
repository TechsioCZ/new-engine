import { expect, test } from "@playwright/test"
import { openContractStory } from "./visual-shared-contracts.mjs"
import { assertWithinViewport } from "./visual-viewport.mjs"

for (const { brand, repetition } of ["base", "business"].flatMap((theme) =>
  Array.from({ length: 5 }, (_, round) => ({ brand: theme, repetition: round }))
)) {
  test(`${brand}: Command preserves rapid native typing inside its dialog (round ${repetition + 1})`, async ({
    page,
  }) => {
    await openContractStory(page, "molecules-command--in-dialog", { brand })
    const opener = page.getByRole("button", {
      name: "Open command palette",
      exact: true,
    })
    const dialog = page.getByRole("dialog", {
      name: "Command palette",
      exact: true,
    })
    await expect(dialog).toBeHidden()
    await opener.click()
    const input = dialog.getByRole("combobox", { name: "Actions", exact: true })
    await expect(input).toBeFocused()
    const status = dialog
      .getByTestId("command-result")
      .locator('xpath=ancestor::*[@aria-live="polite"][1]')
    // Business reserves enough room for this complete composition. Base keeps
    // Dialog's standard bounded scrollport, where this status can start below it.
    if (brand === "business") {
      await assertWithinViewport(status)
    }

    for (let attempt = 0; attempt < 6; attempt++) {
      await input.fill("")
      await expect(input).toHaveValue("")
      await input.pressSequentially("invoice", { delay: 0 })
      await expect(input).toHaveValue("invoice")
      const orders = dialog.getByRole("option", { name: "Orders", exact: true })
      await expect(orders).toBeVisible()
      await expect(orders).toHaveAttribute("data-highlighted", "")
      await input.press("Enter")
      await expect(dialog.getByTestId("command-result")).toHaveText("Orders")
    }

    await input.press("Escape")
    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()
  })
}
