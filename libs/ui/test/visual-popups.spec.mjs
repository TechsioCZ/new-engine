import { test } from "@playwright/test"
import { checkPopupCheckpoints } from "./visual-popup-capture.mjs"

for (const [brand, mode] of [
  ["akros", "light"],
  ["base", "light"],
  ["base", "dark"],
]) {
  test(`${brand}/${mode}: popup intermediate captures contain every floating surface`, async ({
    page,
  }, testInfo) => {
    await checkPopupCheckpoints(page, { brand, mode }, async (name, body) => {
      await testInfo.attach(name, { body, contentType: "image/png" })
    })
  })
}
