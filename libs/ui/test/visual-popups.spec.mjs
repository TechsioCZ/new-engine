import { expect, test } from "@playwright/test"
import {
  captureFloatingPage,
  checkPopupCheckpoints,
  checkStoryPopupCheckpoints,
  visibleFloatingSurfaces,
} from "./visual-popup-capture.mjs"
import { openContractStory } from "./visual-shared-contracts.mjs"

for (const [brand, mode] of [
  ["akros", "light"],
  ["business", "light"],
  ["base", "light"],
  ["base", "dark"],
]) {
  test(`${brand}/${mode}: dialog scroll content is not a separate popup`, async ({
    page,
  }) => {
    await openContractStory(
      page,
      "pages-akros-admin-customer-emails--edit-unpaid-reminder",
      { brand, mode }
    )
    await expect(
      page.getByRole("dialog", { name: "Payment not completed" })
    ).toBeVisible()
    await expect(page.getByRole("tabpanel", { name: "Edit" })).toBeVisible()
    const surfaces = await visibleFloatingSurfaces(page)
    expect(surfaces.some((surface) => surface.scope === "dialog")).toBe(true)
    expect(surfaces.some((surface) => surface.scope === "tabs")).toBe(false)
    await captureFloatingPage(page)
  })
  test(`${brand}/${mode}: hierarchy captures reject clipped descendants inside intact panels`, async ({
    page,
  }) => {
    const id = "molecules-cascadeselect--playground"
    await openContractStory(page, id, { brand, mode })
    await checkStoryPopupCheckpoints(page, id, async () => {
      await captureFloatingPage(page)
    })
    await page.addStyleTag({
      content:
        '[data-scope="cascade-select"][data-part="content"] { height: 48px !important; overflow: hidden !important; }',
    })
    const surfaces = await visibleFloatingSurfaces(page)
    const hierarchy = surfaces.find(
      (surface) =>
        surface.scope === "cascade-select" && surface.part === "content"
    )
    expect(hierarchy.clipped).toBe(false)
    expect(hierarchy.clippedDescendants).toContain("Phones")
    await expect(captureFloatingPage(page)).rejects.toThrow(
      /descendants are clipped by an ancestor/
    )
  })
  test(`${brand}/${mode}: popup intermediate captures contain every floating surface`, async ({
    page,
  }, testInfo) => {
    await checkPopupCheckpoints(page, { brand, mode }, async (name, body) => {
      await testInfo.attach(name, { body, contentType: "image/png" })
    })
  })
}
