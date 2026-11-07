import { expect, test } from "@playwright/test"
import { openContractStory } from "./visual-shared-contracts.mjs"

for (const [brand, mode] of [
  ["base", "light"],
  ["base", "dark"],
  ["neo", "light"],
  ["neo", "dark"],
  ["business", "light"],
  ["akros", "light"],
]) {
  for (const dir of ["ltr", "rtl"]) {
    test(`${brand} ${mode} ${dir} Cascade continuation tracks native scroll and resize`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 393, height: 844 })
      await openContractStory(page, "molecules-cascadeselect--long-labels", {
        brand,
        mode,
        args: `dir:${dir}`,
      })
      const tree = page.getByRole("tree")
      await expect(tree.locator('[data-part="column"]')).toHaveCount(3)
      await expect(tree).toHaveAttribute("data-overflow-start", "")
      await expect(tree).not.toHaveAttribute("data-overflow-end")
      const selected = tree.getByRole("treeitem", {
        name: "Weather-resistant dining sets",
        exact: true,
      })
      await expect(selected).toBeVisible()
      const expectLeafContained = async () => {
        await expect
          .poll(async () => {
            const [surface, leaf] = await Promise.all([
              tree.boundingBox(),
              selected.boundingBox(),
            ])
            if (!(surface && leaf)) {
              throw new Error("Missing Cascade continuation geometry")
            }
            return Math.max(
              surface.x - leaf.x,
              leaf.x + leaf.width - surface.x - surface.width
            )
          })
          .toBeLessThanOrEqual(1)
      }
      await expectLeafContained()
      const paint = await tree.evaluate((element) => {
        const before = getComputedStyle(element, "::before")
        return {
          content: before.content,
          opacity: before.opacity,
          background: before.backgroundImage,
          pointerEvents: before.pointerEvents,
          focusVisible: element.matches(":focus-visible"),
          focusedDescendants: element.querySelectorAll(":focus-visible").length,
        }
      })
      expect(paint.content).toBe('""')
      expect(paint.pointerEvents).toBe("none")
      expect(paint.background).not.toBe("none")
      // Auto-open panel focus owns no control ring; it must not hide the cue
      // needed in this exact resting long-label composition.
      if (!paint.focusedDescendants) {
        expect(paint.opacity, JSON.stringify(paint)).toBe("1")
      }
      await tree.evaluate((element) =>
        element.scrollTo({ left: 0, behavior: "instant" })
      )
      await expect(tree).not.toHaveAttribute("data-overflow-start")
      await expect(tree).toHaveAttribute("data-overflow-end", "")
      await tree.evaluate(
        (element, direction) =>
          element.scrollTo({
            left: element.scrollWidth * (direction === "rtl" ? -1 : 1),
            behavior: "instant",
          }),
        dir
      )
      await expect(tree).toHaveAttribute("data-overflow-start", "")
      await expect(tree).not.toHaveAttribute("data-overflow-end")
      await expectLeafContained()
      await page.setViewportSize({ width: 1280, height: 844 })
      await expect(tree).not.toHaveAttribute("data-overflow-start")
      await expect(tree).not.toHaveAttribute("data-overflow-end")
      await page.setViewportSize({ width: 393, height: 844 })
      await expect(tree).toHaveAttribute("data-overflow-start", "")
      await expectLeafContained()
      await tree.press("Escape")
      await expect(tree).toHaveCount(0)
      await expect(
        page.getByRole("combobox", { name: "Product category", exact: true })
      ).toBeFocused()
    })
  }
}
