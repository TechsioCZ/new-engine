// biome-ignore-all lint/suspicious/noMisplacedAssertion: Assertions run in the custom shared-browser callback, not a local test/browser launcher.
// Run only through the supplied shared-browser ds-page.mjs runner.
// This module connects to no browser and starts no server of its own.
import assert from "node:assert/strict"

const EMAIL_LABEL = /email address/i

export default async function verifyFoundations({ page, sb, shot }) {
  const index = await (
    await page.request.get(
      `${new URL(sb("atoms-statustext--all-statuses")).origin}/index.json`
    )
  ).json()
  const results = []
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))

  async function open(story, brand, mode) {
    assert.ok(index.entries[story], `Story exists: ${story}`)
    console.error(`foundations: ${brand}/${mode}/${story}`)
    await page.goto(sb(story, { brand, mode }))
    await page.locator("#storybook-root > *").first().waitFor()
  }

  for (const [brand, mode] of [
    ["akros", "light"],
    ["base", "light"],
    ["base", "dark"],
  ]) {
    await open("atoms-statustext--all-statuses", brand, mode)
    for (const status of ["error", "warning", "success"]) {
      const message = page.locator(`[data-status="${status}"]`)
      assert.equal(await message.locator('[aria-hidden="true"]').count(), 2)
      assert.equal(
        await message
          .locator('[class*="token-icon-status-text"]')
          .evaluate((icon) => getComputedStyle(icon).maskImage !== "none"),
        true,
        `${brand}/${mode}: ${status} must render a real decorative glyph`
      )
    }
    assert.equal(
      await page
        .locator('[data-status="default"] [aria-hidden="true"]')
        .count(),
      0
    )
    await page.screenshot({ path: shot(`foundations-status-${brand}-${mode}`) })

    // The shared base composes the read-only and disabled utilities. These DOM
    // fixtures test the foundation, not an individual component's handlers.
    const fixture = await page.evaluate(() => {
      const host = document.createElement("div")
      host.innerHTML =
        '<div class="form-control-base" data-readonly><input readonly value="PO-2048" aria-label="Read-only purchase order"><button data-readonly-affordance>Clear</button></div><input class="form-control-base" readonly disabled value="Unavailable">'
      document.body.append(host)
      const surface = host.firstElementChild
      const input = surface.querySelector("input")
      const disabled = host.lastElementChild
      const style = getComputedStyle(surface)
      input.focus()
      input.select()
      const value = {
        cursor: style.cursor,
        selection: style.userSelect,
        opacity: style.opacity,
        affordance: getComputedStyle(surface.querySelector("button")).display,
        textCursor: getComputedStyle(input).cursor,
        focused: document.activeElement === input,
        selected: input.selectionEnd - input.selectionStart,
        disabledCursor: getComputedStyle(disabled).cursor,
        distinct:
          style.backgroundColor !== getComputedStyle(disabled).backgroundColor,
      }
      host.remove()
      return value
    })
    assert.equal(fixture.cursor, "default")
    assert.equal(fixture.textCursor, "text")
    assert.equal(fixture.selection, "text")
    assert.equal(fixture.opacity, "1")
    assert.equal(fixture.affordance, "none")
    assert.equal(fixture.focused, true)
    assert.equal(fixture.selected, 7)
    assert.equal(fixture.disabledCursor, "not-allowed")
    assert.equal(fixture.distinct, true)

    await page.setViewportSize({ width: 390, height: 844 })
    await open("atoms-statustext--long-text", brand, mode)
    const wrapping = await page
      .locator('[data-status="error"]')
      .evaluate((message) => {
        const [icon, text] = message.children
        const lineHeight = Number.parseFloat(
          getComputedStyle(message).lineHeight
        )
        return {
          iconHeight: icon.getBoundingClientRect().height,
          lineHeight,
          textHeight: text.getBoundingClientRect().height,
          textStart: text.getBoundingClientRect().left,
          iconEnd: icon.getBoundingClientRect().right,
          overflow: document.documentElement.scrollWidth > innerWidth,
        }
      })
    assert.ok(Math.abs(wrapping.iconHeight - wrapping.lineHeight) < 1)
    assert.ok(wrapping.textHeight > wrapping.lineHeight)
    assert.ok(wrapping.textStart > wrapping.iconEnd)
    assert.equal(wrapping.overflow, false)
    await page.screenshot({
      path: shot(`foundations-wrapping-${brand}-${mode}`),
    })
    await page.setViewportSize({ width: 1440, height: 900 })

    await open("atoms-statustext--form-validation-context", brand, mode)
    // This story has a play function that edits/blurs the field. Assert its
    // settled state as well as all references resolving to mounted messages.
    const field = page.getByRole("textbox", { name: EMAIL_LABEL })
    await page.waitForFunction(
      () =>
        document
          .getElementById("status-text-email")
          ?.getAttribute("aria-invalid") === "false"
    )
    await page.waitForTimeout(100)
    await field.fill("mara@example.com")
    await field.press("Tab")
    await page.locator('[data-status="success"]').waitFor()
    assert.equal(await field.getAttribute("aria-invalid"), "false")
    assert.equal(await field.getAttribute("aria-errormessage"), null)
    assert.equal(
      await field.evaluate((input) =>
        input
          .getAttribute("aria-describedby")
          .split(" ")
          .every((id) => document.getElementById(id))
      ),
      true
    )
    await field.fill("mara@")
    await field.press("Tab")
    await page.locator('[data-status="error"]').waitFor()
    assert.equal(
      await field.getAttribute("aria-errormessage"),
      "status-text-email-message"
    )
    assert.equal(await field.getAttribute("aria-invalid"), "true")

    const panels = []
    for (const story of [
      "molecules-select--playground",
      "molecules-combobox--playground",
      "molecules-menu--playground",
      "molecules-popover--playground",
      "molecules-datepicker--playground",
    ]) {
      await open(story, brand, mode)
      await page.locator('[data-part="trigger"]').first().click()
      const content = page.locator('[data-part="content"]:visible').first()
      await content.waitFor()
      await page.waitForTimeout(350)
      const surface = await content.evaluate((element) => {
        const style = getComputedStyle(element)
        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d")
        context.fillStyle = style.backgroundColor
        context.fillRect(0, 0, 1, 1)
        return {
          alpha: context.getImageData(0, 0, 1, 1).data[3],
          border: Number.parseFloat(style.borderTopWidth),
          shadow: style.boxShadow,
          zIndex: style.zIndex,
          positionerZ: getComputedStyle(
            element.closest('[data-part="positioner"]') ?? element
          ).zIndex,
        }
      })
      assert.equal(
        surface.alpha,
        255,
        `${brand}/${mode}/${story}: opaque panel`
      )
      assert.ok(surface.border > 0, `${story}: visible border`)
      assert.notEqual(surface.shadow, "none", `${story}: elevation`)
      panels.push({ story, ...surface })
      await page.screenshot({
        path: shot(`foundations-popup-${brand}-${mode}-${story}`),
      })
    }
    results.push({ brand, mode, fixture, wrapping, panels })
  }
  assert.deepEqual(errors, [], "Stories must render without browser errors")
  return { passed: true, results }
}
