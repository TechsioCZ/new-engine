import { test } from "@playwright/test"
import {
  checkRadioAndSliderKeyboard,
  checkStandaloneDocs,
  checkTabsKeyboard,
} from "./visual-shared-contracts.mjs"

for (const [brand, mode] of [
  ["akros", "light"],
  ["base", "light"],
  ["base", "dark"],
]) {
  test(`${brand}/${mode}: standalone guide initial and live themes`, async ({
    page,
  }) => {
    await checkStandaloneDocs(page, { brand, mode })
  })
  test(`${brand}/${mode}: manual/automatic Tabs, roving focus, loop and controlled authority`, async ({
    page,
  }) => {
    await checkTabsKeyboard(page, { brand, mode })
  })
  test(`${brand}/${mode}: editable radio arrows and multi-thumb keyboard constraints`, async ({
    page,
  }) => {
    await checkRadioAndSliderKeyboard(page, { brand, mode })
  })
}
