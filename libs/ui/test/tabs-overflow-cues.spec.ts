import { expect, type Locator, test } from "@playwright/test"
import { PNG } from "pngjs"
import { openContractStory } from "./visual-shared-contracts.mjs"
import { assertWithinViewport } from "./visual-viewport.mjs"

async function cueEnergy(list: Locator) {
  const actual = await list.screenshot({ animations: "disabled", scale: "css" })
  const host = list.locator("..")
  const before = await list.evaluate((element) => ({
    left: element.scrollLeft,
    width: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  const saved = await host.evaluate((element) => ({
    value: element.style.getPropertyValue("--color-tabs-overflow-bg-veil"),
    priority: element.style.getPropertyPriority(
      "--color-tabs-overflow-bg-veil"
    ),
  }))
  let contrast: Buffer
  try {
    // Contrast calibration measures white veils even over blank white padding.
    // Only the unmodified frame above is review evidence; geometry must not move.
    await host.evaluate((element) =>
      element.style.setProperty("--color-tabs-overflow-bg-veil", "rgb(0 0 0)")
    )
    contrast = await list.screenshot({ animations: "disabled", scale: "css" })
  } finally {
    await host.evaluate((element, previous) => {
      if (previous.value) {
        element.style.setProperty(
          "--color-tabs-overflow-bg-veil",
          previous.value,
          previous.priority
        )
      } else {
        element.style.removeProperty("--color-tabs-overflow-bg-veil")
      }
    }, saved)
  }
  expect(
    await list.evaluate((element) => ({
      left: element.scrollLeft,
      width: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }))
  ).toEqual(before)
  const a = PNG.sync.read(actual)
  const b = PNG.sync.read(contrast)
  expect([a.width, a.height]).toEqual([b.width, b.height])
  const strip = Math.min(12, Math.floor(a.width / 4))
  const energy = { left: 0, right: 0 }
  for (let y = 0; y < a.height; y++) {
    for (let x = 0; x < strip; x++) {
      for (const side of ["left", "right"] as const) {
        const column = side === "left" ? x : a.width - 1 - x
        const offset = (y * a.width + column) * 4
        for (let channel = 0; channel < 3; channel++) {
          energy[side] += Math.abs(
            (a.data[offset + channel] ?? 0) - (b.data[offset + channel] ?? 0)
          )
        }
      }
    }
  }
  return { actual, energy }
}

for (const round of [1, 2, 3, 4, 5]) {
  for (const direction of ["ltr", "rtl"]) {
    for (const justify of ["center", "end"]) {
      test(`Business Tabs ${direction}/${justify} round ${round}: cue follows the actual overflow edge`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" })
        await openContractStory(page, "molecules-tabs--scrollable-alignment", {
          brand: "business",
        })
        await page.evaluate(async () => {
          await document.fonts.ready
        })
        const list = page.getByRole("tablist", {
          name: `${direction} ${justify} project views`,
          exact: true,
        })
        await list.evaluate((element) =>
          element.scrollIntoView({
            block: "center",
            inline: "nearest",
            behavior: "instant",
          })
        )
        await assertWithinViewport(list)
        const range = await list.evaluate(
          (element) => element.scrollWidth - element.clientWidth
        )
        expect(range).toBeGreaterThan(20)
        const sign = direction === "rtl" ? -1 : 1
        for (const fraction of [0, 0.5, 1]) {
          const offset = sign * Math.round(range * fraction)
          await list.evaluate(
            (element, left) => element.scrollTo({ left, behavior: "instant" }),
            offset
          )
          // scrollWidth/clientWidth round independently; RTL can clamp 1px short.
          await expect
            .poll(async () =>
              Math.abs(
                (await list.evaluate((element) => element.scrollLeft)) - offset
              )
            )
            .toBeLessThanOrEqual(1)
          const { actual, energy } = await cueEnergy(list)
          await testInfo.attach(`${direction}-${justify}-${fraction}`, {
            body: actual,
            contentType: "image/png",
          })
          await testInfo.attach(`paint-${fraction}`, {
            body: JSON.stringify({
              direction,
              justify,
              fraction,
              offset,
              energy,
            }),
            contentType: "application/json",
          })
          if (fraction === 0.5) {
            expect.soft(energy.left).toBeGreaterThan(30)
            expect.soft(energy.right).toBeGreaterThan(30)
          } else {
            const active =
              (fraction === 0) === (direction === "ltr") ? "right" : "left"
            const covered = active === "left" ? "right" : "left"
            expect.soft(energy[active]).toBeGreaterThan(30)
            expect.soft(energy[covered]).toBeLessThan(energy[active] / 5)
          }
        }
        const tabs = list.getByRole("tab")
        await tabs.nth(0).focus()
        await tabs
          .nth(0)
          .press(direction === "rtl" ? "ArrowLeft" : "ArrowRight")
        await expect(tabs.nth(1)).toBeFocused()
        if (justify === "end") {
          await tabs.nth(1).press("Enter")
        }
        await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true")
        await assertWithinViewport(tabs.nth(1))
        await expect(tabs.nth(1)).toHaveCSS("z-index", "2")
        await expect(tabs.nth(1)).toHaveCSS("outline-style", "solid")
        await testInfo.attach("keyboard-focus", {
          body: await tabs
            .nth(1)
            .screenshot({ animations: "disabled", scale: "css" }),
          contentType: "image/png",
        })
      })
    }
  }
  test(`Business disabled Tabs round ${round}: veils preserve full labels and keyboard focus`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 393, height: 659 })
    await page.emulateMedia({ reducedMotion: "reduce" })
    await openContractStory(page, "molecules-tabs--disabled-tabs", {
      brand: "business",
    })
    await page.evaluate(async () => {
      await document.fonts.ready
    })
    const list = page.getByRole("tablist")
    const tabs = list.getByRole("tab")
    await expect(tabs).toHaveCount(3)
    await expect(tabs.nth(1)).toBeDisabled()
    await expect(tabs.nth(2)).toHaveText("Another Active Tab")
    await assertWithinViewport(list)
    const range = await list.evaluate(
      (element) => element.scrollWidth - element.clientWidth
    )
    expect(range).toBeGreaterThan(20)
    for (const fraction of [0, 0.5, 1]) {
      const offset = Math.round(range * fraction)
      await list.evaluate(
        (element, left) => element.scrollTo({ left, behavior: "instant" }),
        offset
      )
      await expect
        .poll(async () =>
          Math.abs(
            (await list.evaluate((element) => element.scrollLeft)) - offset
          )
        )
        .toBeLessThanOrEqual(1)
      const { actual, energy } = await cueEnergy(list)
      await testInfo.attach(`disabled-${fraction}`, {
        body: actual,
        contentType: "image/png",
      })
      if (fraction === 0) {
        expect.soft(energy.right).toBeGreaterThan(30)
        expect.soft(energy.left).toBeLessThan(energy.right / 5)
      } else if (fraction === 1) {
        expect.soft(energy.left).toBeGreaterThan(30)
        expect.soft(energy.right).toBeLessThan(energy.left / 5)
      } else {
        expect.soft(energy.left).toBeGreaterThan(30)
        expect.soft(energy.right).toBeGreaterThan(30)
      }
    }
    await tabs.nth(0).focus()
    await tabs.nth(0).press("ArrowRight")
    await expect(tabs.nth(2)).toBeFocused()
    await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true")
    await assertWithinViewport(tabs.nth(2))
    await expect(tabs.nth(2)).toHaveCSS("z-index", "2")
    await expect(tabs.nth(2)).toHaveCSS("outline-style", "solid")
    await testInfo.attach("disabled-keyboard-focus", {
      body: await tabs
        .nth(2)
        .screenshot({ animations: "disabled", scale: "css" }),
      contentType: "image/png",
    })
  })
}
