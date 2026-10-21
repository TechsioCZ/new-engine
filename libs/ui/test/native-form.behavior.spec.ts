import { test } from "@playwright/test"
import {
  checkNativeAuthority,
  checkNativeDateKeyboardAuthority,
  checkNativeFieldsets,
  checkNativeOwnership,
  checkNativeReset,
  nativeFormAdapters,
  nativeResetCancellations,
} from "./native-form-contracts.mjs"

for (const authority of ["accept", "refuse"]) {
  test(`date-picker: controlled keyboard ${authority} stays coherent while focused and after blur`, async ({
    page,
  }) => {
    await checkNativeDateKeyboardAuthority(page, authority)
  })
}

// The normal component projects execute every case in desktop Chromium AND
// mobile WebKit. Keep cases separate so failures retain component/scenario IDs.
for (const adapter of nativeFormAdapters) {
  for (const cancellation of nativeResetCancellations) {
    test(`${adapter.id}: native reset ${cancellation}`, async ({ page }) => {
      await checkNativeReset(page, adapter, cancellation)
    })
  }
  for (const authority of ["accept", "refuse"]) {
    test(`${adapter.id}: controlled ${authority} remains authoritative across native reset`, async ({
      page,
    }) => {
      await checkNativeAuthority(page, adapter, authority)
    })
  }
  test(`${adapter.id}: form=id reassociation and listener cleanup`, async ({
    page,
  }) => {
    await checkNativeOwnership(page, adapter)
  })
  for (const placement of [
    "body",
    "first-legend",
    "second-legend",
    "nested-first-legend",
  ]) {
    test(`${adapter.id}: disabled fieldset ${placement}`, async ({ page }) => {
      await checkNativeFieldsets(page, adapter, placement)
    })
  }
}
