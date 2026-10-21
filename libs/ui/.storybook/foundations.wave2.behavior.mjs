// biome-ignore-all lint/suspicious/noMisplacedAssertion: Shared-browser regression callback, never a local browser launcher.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const TOKENS = new URL("../src/tokens/", import.meta.url)
const BRIDGE = readFileSync(
  new URL("_foundation-overrides.css", TOKENS),
  "utf8"
).replace("@theme static", ":root")

export default async function verifyFoundationsWave2({ page, sb, shot }) {
  const index = await (
    await page.request.get("http://127.0.0.1:6108/index.json")
  ).json()
  const results = []
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  async function open(id, brand = "base", mode = "light") {
    assert.ok(index.entries[id], `Story exists: ${id}`)
    await page.goto(sb(id, { brand, mode }))
    await page.locator("#storybook-root > *").first().waitFor()
    await page.waitForTimeout(500)
  }
  async function measure() {
    return await page.evaluate(() => {
      const root = document.documentElement
      function token(name) {
        const el = document.createElement("span")
        el.style.color = `var(${name})`
        root.append(el)
        const color = getComputedStyle(el).color
        el.remove()
        return color
      }
      function pixel(color, under) {
        const context = document.createElement("canvas").getContext("2d")
        if (under) {
          context.fillStyle = under
          context.fillRect(0, 0, 1, 1)
        }
        context.fillStyle = color
        context.fillRect(0, 0, 1, 1)
        return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)
      }
      function luminance(rgb) {
        return rgb
          .map((channel) => {
            const v = channel / 255
            return v <= 0.040_45 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
          })
          .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
      }
      function contrast(fg, background, backdrop = token("--color-base")) {
        const a = luminance(pixel(fg, background))
        const b = luminance(pixel(background, backdrop))
        return +((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2)
      }
      const links = Object.fromEntries(
        ["base", "hover", "active", "visited"].map((state) => [
          state,
          contrast(token(`--color-link-fg-${state}`), token("--color-base")),
        ])
      )
      const fields = document.createElement("div")
      fields.style.background = "var(--color-form-control-bg)"
      root.append(fields)
      const bg = getComputedStyle(fields).backgroundColor
      const base = token("--color-base")
      const bgComposite = `rgb(${pixel(bg, base).join(",")})`
      fields.remove()
      const hover = contrast(
        token("--color-form-control-border-hover"),
        bgComposite
      )
      const rest = contrast(token("--color-form-control-border"), bgComposite)
      return {
        links,
        hover,
        rest,
        checked: contrast(
          token("--color-popup-item-fg-checked"),
          token("--color-popup-item-bg-hover")
        ),
        required: contrast(token("--color-label-fg-required"), base),
        headerDuration: getComputedStyle(root)
          .getPropertyValue("--duration-header")
          .trim(),
      }
    })
  }
  for (const [brand, mode] of [
    ["base", "light"],
    ["base", "dark"],
    ["neo", "light"],
    ["neo", "dark"],
    ["business", "light"],
    ["akros", "light"],
  ]) {
    await open("atoms-statustext--sizes", brand, mode)
    const tokens = await measure()
    for (const [state, ratio] of Object.entries(tokens.links)) {
      assert.ok(ratio >= 4.5, `${brand}/${mode} link ${state}: ${ratio}`)
    }
    assert.ok(
      tokens.checked >= 4.5,
      `${brand}/${mode} checked + hover: ${tokens.checked}`
    )
    assert.ok(
      tokens.required >= 4.5,
      `${brand}/${mode} required: ${tokens.required}`
    )
    assert.ok(
      tokens.hover >= 3 && tokens.hover > tokens.rest,
      `${brand}/${mode} hover border ${tokens.hover} stronger than ${tokens.rest}`
    )
    assert.ok([".2s", "0.2s", "200ms"].includes(tokens.headerDuration))
    const sizes = await page
      .locator("#storybook-root label")
      .evaluateAll((labels) =>
        labels.map((label) => {
          const box = label.parentElement
          return {
            label: getComputedStyle(label).fontSize,
            weight: getComputedStyle(label).fontWeight,
            feedback: getComputedStyle(box.querySelector("[data-status]"))
              .fontSize,
          }
        })
      )
    assert.equal(sizes.length, 3)
    for (const size of sizes) {
      assert.equal(size.weight, "700")
      assert.ok(
        Number.parseFloat(size.feedback) < Number.parseFloat(size.label)
      )
    }
    results.push({ brand, mode, ...tokens, sizes })
    if (brand === "akros") {
      await page.screenshot({ path: shot("foundations-feedback-akros-sizes") })
    }
  }
  // Cyber is explicitly demo-only, absent from the runtime registry. Test its
  // exported primitive palette with the same local runtime bridge applied last.
  for (const mode of ["light", "dark"]) {
    await open("atoms-statustext--sizes", "base", mode)
    const fixture = readFileSync(
      new URL(
        `figma/${mode === "dark" ? "cyber-dark" : "cyber"}/variables.css`,
        TOKENS
      ),
      "utf8"
    )
    await page.addStyleTag({ content: fixture + BRIDGE })
    const tokens = await measure()
    assert.ok(tokens.checked >= 4.5)
    assert.ok(tokens.required >= 4.5)
    for (const ratio of Object.values(tokens.links)) {
      assert.ok(ratio >= 4.5)
    }
    results.push({ brand: "cyber-fixture", mode, ...tokens })
  }
  for (const mode of ["light", "dark"]) {
    await open("atoms-statustext--sizes", "base", mode)
    const nested = await page.evaluate(() => {
      const root = document.createElement("div")
      root.className = "dark"
      root.innerHTML =
        '<div class="light"><div class="reverse"><div class="reverse"></div></div></div><div class="always-dark"></div><div class="always-light"></div>'
      document.body.append(root)
      const result = [root, ...root.querySelectorAll("div")].map((el) => {
        el.style.background = "var(--color-base)"
        el.style.color = "var(--color-fg-primary)"
        const cs = getComputedStyle(el)
        return { scheme: cs.colorScheme, bg: cs.backgroundColor, fg: cs.color }
      })
      root.remove()
      return result
    })
    assert.deepEqual(
      nested.map((entry) => entry.scheme),
      ["dark", "light", "dark", "light", "dark", "light"]
    )
    assert.equal(nested[0].bg, nested[2].bg)
    assert.equal(nested[1].bg, nested[3].bg)
    assert.notEqual(nested[0].bg, nested[1].bg)
    results.push({ mode, nested })
  }
  for (const [brand, mode] of [
    ["akros", "light"],
    ["base", "light"],
    ["base", "dark"],
  ]) {
    await open("molecules-popover--positioning-behaviors", brand, mode)
    await page.getByRole("button", { name: "Flip Demo" }).click()
    const popup = page.getByRole("dialog", { name: "Auto Flip" })
    await popup.waitFor()
    await page.waitForTimeout(350)
    const rect = await popup.boundingBox()
    assert.ok(rect.x >= 0 && rect.x + rect.width <= 1440)
    const surface = await popup.evaluate((el) => {
      const cs = getComputedStyle(el)
      return {
        bg: cs.backgroundColor,
        shadow: cs.boxShadow,
        z: cs.zIndex,
        positionerZ: getComputedStyle(el.closest('[data-part="positioner"]'))
          .zIndex,
      }
    })
    assert.ok(Number.parseInt(surface.z, 10) >= 60)
    assert.ok(Number.parseInt(surface.positionerZ, 10) >= 60)
    assert.notEqual(surface.shadow, "none")
    results.push({ brand, mode, popover: { rect, ...surface } })
    await page.screenshot({
      path: shot(`foundations-popover-${brand}-${mode}`),
    })
  }
  await open("atoms-button--playground", "akros")
  await page.addStyleTag({
    content:
      readFileSync(new URL("theme.css", TOKENS), "utf8") +
      ':root,[data-theme]{--color-bg-primary-base:#ff00ff;--font-sans:"Courier New",monospace;}',
  })
  await page.mouse.move(0, 0)
  await page.waitForTimeout(350)
  const override = await page
    .getByRole("button")
    .first()
    .evaluate((el) => ({
      bg: getComputedStyle(el).backgroundColor,
      font: getComputedStyle(document.body).fontFamily,
    }))
  assert.equal(override.bg, "rgb(255, 0, 255)", JSON.stringify(override))
  assert.ok(override.font.includes("Courier New"))
  results.push({ override })
  await page.setViewportSize({ width: 390, height: 844 })
  for (const [brand, mode] of [
    ["akros", "light"],
    ["base", "light"],
    ["base", "dark"],
  ]) {
    await open("molecules-popover--playground", brand, mode)
    await page.getByRole("button").first().click()
    const mobilePanel = page.getByRole("dialog")
    await mobilePanel.waitFor()
    await page.waitForTimeout(350)
    const rect = await mobilePanel.boundingBox()
    assert.ok(rect.x >= 0 && rect.x + rect.width <= 390)
    await page.screenshot({
      path: shot(`foundations-popover-mobile-${brand}-${mode}`),
    })
    results.push({ brand, mode, mobilePopover: rect })
  }
  await open("atoms-tooltip--long-content", "akros")
  await page.mouse.move(0, 0)
  await page.getByRole("button").focus()
  await page.getByRole("tooltip").waitFor()
  await page.waitForTimeout(350)
  const tooltip = await page.getByRole("tooltip").boundingBox()
  assert.ok(
    tooltip.width <= 374 && tooltip.x >= 0 && tooltip.x + tooltip.width <= 390
  )
  await page.screenshot({ path: shot("foundations-tooltip-akros-mobile") })
  await open("overview-color-palette--default", "akros")
  assert.equal(await page.getByRole("radiogroup").count(), 0)
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth
  )
  assert.equal(overflow, false)
  await page.screenshot({ path: shot("foundations-palette-akros-mobile") })
  results.push({ tooltip, paletteNoOverflow: !overflow })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(
    sb("atoms-tooltip--docs", { brand: "base", mode: "dark", docs: true })
  )
  await page.locator(".sbdocs-wrapper").waitFor()
  await page.waitForTimeout(800)
  const docs = await page.locator(".sbdocs-wrapper").evaluate((el) => ({
    bg: getComputedStyle(el).backgroundColor,
    fg: getComputedStyle(el).color,
    mode: document.documentElement.className,
  }))
  assert.ok(docs.mode.includes("dark"))
  assert.notEqual(docs.bg, "rgb(255, 255, 255)")
  docs.verified = true
  await page.screenshot({ path: shot("foundations-docs-base-dark") })
  results.push({ docs })
  assert.deepEqual(errors, [])
  return { passed: true, results }
}
