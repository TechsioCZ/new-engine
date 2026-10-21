// biome-ignore-all lint/suspicious/noMisplacedAssertion: Shared-browser callback, never a local browser launcher.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const guide = readFileSync(
  new URL("../skills/app-token-overrides/SKILL.md", import.meta.url),
  "utf8"
)
// Exercise the actual consumer example so documentation and the regression
// cannot quietly drift to different foreground-token names.
const documentedOverride = guide
  .split("### Override the shipped semantic source")[1]
  .match(/```css\n([\s\S]*?)```/)[1]

export default async function verifyFoundationRepairs({ page, sb, shot }) {
  const index = await (
    await page.request.get("http://127.0.0.1:6108/index.json")
  ).json()
  const results = []
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  async function open(id, brand, mode) {
    assert.ok(index.entries[id], `Story exists: ${id}`)
    await page.goto(sb(id, { brand, mode }))
    await page.locator("#storybook-root > *").first().waitFor()
    await page.waitForTimeout(1000)
  }
  async function measureButton(button) {
    return await button.evaluate((el) => {
      const cs = getComputedStyle(el)
      const context = document.createElement("canvas").getContext("2d")
      const rgb = (color) => {
        context.fillStyle = color
        context.fillRect(0, 0, 1, 1)
        return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)
      }
      const luminance = (channels) =>
        channels
          .map((channel) => {
            const c = channel / 255
            return c <= 0.040_45 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
          })
          .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0)
      const a = luminance(rgb(cs.color))
      const b = luminance(rgb(cs.backgroundColor))
      return {
        foreground: rgb(cs.color),
        background: rgb(cs.backgroundColor),
        contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      }
    })
  }
  for (const [brand, mode] of [
    ["akros", "light"],
    ["base", "light"],
    ["base", "dark"],
  ]) {
    await page.setViewportSize({ width: 1440, height: 900 })
    await open("molecules-popover--custom-trigger", brand, mode)
    const dialogs = []
    for (const [triggerName, name] of [
      ["Info", "Delivery information"],
      ["Click this custom area", "Custom area details"],
    ]) {
      await page.getByRole("button", { name: triggerName, exact: true }).click()
      const dialog = page.getByRole("dialog", { name, exact: true })
      await dialog.waitFor()
      assert.equal(await dialog.count(), 1)
      dialogs.push({ trigger: triggerName, name })
      await page.keyboard.press("Escape")
      await dialog.waitFor({ state: "hidden" })
    }
    await page.setViewportSize({ width: 390, height: 844 })
    await open("overview-component-comparison--side-by-side", brand, mode)
    for (const name of ["Order quantity", "Quantity (sm)", "Quantity (md)"]) {
      assert.equal(
        await page.getByRole("spinbutton", { name, exact: true }).count(),
        1
      )
    }
    const carousel = page.getByRole("region", { name: "Landscape photos" })
    const box = await carousel.boundingBox()
    assert.ok(box.x >= 0 && box.x + box.width <= 390, JSON.stringify(box))
    const documentWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    )
    assert.ok(
      documentWidth <= 390,
      `${brand}/${mode}: document width ${documentWidth}`
    )
    await carousel.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: shot(`foundations-repair-carousel-${brand}-${mode}-mobile`),
    })

    await page.setViewportSize({ width: 1440, height: 900 })
    await open("atoms-button--playground", brand, mode)
    await page.addStyleTag({ content: documentedOverride })
    const button = page.getByRole("button").first()
    await page.mouse.move(0, 0)
    await page.waitForTimeout(250)
    const states = []
    for (const state of ["rest", "hover", "active"]) {
      if (state === "hover") {
        await button.hover()
      }
      if (state === "active") {
        await page.mouse.down()
      }
      await page.waitForTimeout(250)
      const measured = await measureButton(button)
      assert.deepEqual(
        measured.foreground,
        [255, 255, 255],
        `${brand}/${mode}/${state}: documented white foreground`
      )
      assert.ok(
        measured.contrast >= 4.5,
        `${brand}/${mode}/${state}: ${JSON.stringify(measured)}`
      )
      states.push({ state, ...measured })
    }
    await page.mouse.up()
    assert.notDeepEqual(states[0].background, states[1].background)
    assert.notDeepEqual(states[1].background, states[2].background)
    // Magenta is an intentionally different surface: white fails, black passes.
    await page.addStyleTag({
      content:
        ":root,[data-theme]{--color-bg-primary-base:#ff00ff;--color-bg-primary-hover:#ff00ff;--color-bg-primary-active:#ff00ff;--color-fg-on-primary-solid:#000;--color-fg-on-primary-solid-neo:#000;}",
    })
    await page.mouse.move(0, 0)
    await page.waitForTimeout(250)
    const magenta = await measureButton(button)
    assert.deepEqual(magenta.background, [255, 0, 255])
    assert.deepEqual(magenta.foreground, [0, 0, 0])
    assert.ok(magenta.contrast >= 4.5)
    results.push({
      brand,
      mode,
      dialogs,
      mobile: { documentWidth, carousel: box },
      documentedOverride: states,
      magenta,
    })
  }
  assert.deepEqual(errors, [])
  return { passed: true, results }
}
