import { expect, test } from "@playwright/test"
import { blockingViolations } from "../.storybook/a11y-policy.mjs"
import { openContractStory } from "./visual-shared-contracts.mjs"
import { assertWithinViewport } from "./visual-viewport.mjs"

const playErrorPattern =
  /TestingLibraryElementError|AssertionError|Error: expect/
const thumbnailNamePattern = /^Show slide \d+$/

test("arrowless pagination wraps all destinations inside a narrow consumer", async ({
  page,
}) => {
  await openContractStory(page, "molecules-pagination--playground", {
    brand: "business",
    args: "count:100;pageSize:10;siblingCount:3;showPrevNext:!false",
  })
  const pager = page.locator("#storybook-root nav").first()
  await pager.evaluate((node) => {
    node.style.width = "288px"
  })
  const list = pager.locator("ul")
  await expect(list).not.toHaveAttribute("data-responsive-pages")
  await expect(list).toHaveCSS("flex-wrap", "wrap")
  const rows = new Set<number>()
  for (let number = 1; number <= 10; number++) {
    const link = pager.getByRole("link", {
      name: number === 10 ? "last page, page 10" : `page ${number}`,
      exact: true,
    })
    await expect(link).toBeVisible()
    await assertWithinViewport(link)
    const box = await link.boundingBox()
    if (!box) {
      throw new Error(`Missing destination ${number}`)
    }
    rows.add(Math.round(box.y))
  }
  expect(rows.size).toBeGreaterThan(1)
  expect(
    await pager.evaluate((node) => node.scrollWidth - node.clientWidth)
  ).toBeLessThanOrEqual(1)
  await pager
    .getByRole("link", { name: "last page, page 10", exact: true })
    .click()
  await expect(
    pager.getByRole("link", { name: "last page, page 10", exact: true })
  ).toHaveAttribute("aria-current", "page")
})

for (const brand of ["base", "neo", "akros"]) {
  test(`${brand} readonly RadioCard retains the public hover-border override`, async ({
    page,
  }) => {
    await openContractStory(page, "molecules-radiocard--read-only", { brand })
    const item = page
      .locator('#storybook-root [data-part="item"][data-state="unchecked"]')
      .first()
    await item.evaluate((node) => {
      const scope =
        node.closest<HTMLElement>("[data-theme]") ??
        node.ownerDocument.documentElement
      scope.style.setProperty(
        "--color-radio-card-item-border-hover",
        "rgb(83, 47, 139)"
      )
    })
    await item.hover()
    await expect(item).toHaveAttribute("data-hover", "")
    await expect(item).toHaveCSS("border-top-color", "rgb(83, 47, 139)")
    await expect(item.getByRole("radio")).not.toBeChecked()
  })
}

test("GalleryTemplate accepts hidden thumbnails without a play error", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error" && playErrorPattern.test(message.text())) {
      errors.push(message.text())
    }
  })
  await openContractStory(page, "templates-gallerytemplate--playground", {
    brand: "business",
    args: "showThumbnails:!false",
  })
  await expect(
    page.getByRole("button", { name: thumbnailNamePattern })
  ).toHaveCount(0)
  await expect(page.getByRole("region")).toBeVisible()
  expect(errors).toEqual([])
})

for (const brand of ["base", "neo", "business", "akros"]) {
  for (const component of ["select", "cascadeselect"]) {
    test(`${brand} ${component} keeps keyboard option focus without a panel halo`, async ({
      page,
    }) => {
      await openContractStory(page, `molecules-${component}--playground`, {
        brand,
      })
      const scope = component === "select" ? "select" : "cascade-select"
      const trigger = page.locator(
        `#storybook-root [data-scope="${scope}"][data-part="trigger"]`
      )
      await trigger.focus()
      await page.keyboard.press("ArrowDown")
      const popup = page.locator(".popup-surface-base:visible").first()
      await expect(popup).toBeVisible()
      await popup.evaluate((element) => {
        element.style.setProperty(
          "--shadow-popup",
          "rgb(17, 34, 51) 0px 3px 7px 0px"
        )
      })
      await popup.focus()
      await expect(popup).toBeFocused()
      await expect(popup).toHaveCSS(
        "box-shadow",
        "rgb(17, 34, 51) 0px 3px 7px 0px"
      )
      const highlighted = popup.locator("[data-highlighted]").first()
      await expect(highlighted).toBeVisible()
      await page.emulateMedia({ forcedColors: "active" })
      if (
        await page.evaluate(() => matchMedia("(forced-colors: active)").matches)
      ) {
        await expect(highlighted).toHaveCSS("outline-style", "solid")
        await expect(highlighted).toHaveCSS("outline-width", "2px")
      }
      await page.emulateMedia({ forcedColors: "none" })
      await page.keyboard.press("Escape")
      await expect(trigger).toBeFocused()
      expect(
        await trigger.evaluate((element) => getComputedStyle(element).boxShadow)
      ).not.toBe("none")
    })
  }

  for (const host of ["dialog", "drawer"]) {
    test(`${brand} cascade hierarchy stays within its ${host} field`, async ({
      page,
    }) => {
      const errors: string[] = []
      page.on("console", (message) => {
        if (
          message.type() === "error" &&
          playErrorPattern.test(message.text())
        ) {
          errors.push(message.text())
        }
      })
      await openContractStory(
        page,
        "templates-comprehensive-form--modal-popup-contracts",
        { brand }
      )
      expect(errors).toEqual([])
      await page
        .getByRole("button", { name: `Open popup ${host}`, exact: true })
        .click()
      const modal = page.getByRole("dialog", {
        name: `Popup ${host}`,
        exact: true,
      })
      const trigger = modal.getByRole("combobox", {
        name: "Modal category",
        exact: true,
      })
      await trigger.click()
      await page.getByRole("treeitem", { name: "Group", exact: true }).click()
      const popup = modal.locator(".popup-surface-base:visible")
      await expect(popup).toBeVisible()
      await expect(popup.locator('[data-part="column"]')).toHaveCount(2)
      await expect
        .poll(async () => {
          const [panel, field, owner] = await Promise.all([
            popup.boundingBox(),
            trigger.boundingBox(),
            modal.boundingBox(),
          ])
          if (!(panel && field && owner)) {
            return Number.POSITIVE_INFINITY
          }
          return Math.max(
            panel.width - field.width,
            owner.x - panel.x,
            panel.x + panel.width - owner.x - owner.width
          )
        })
        .toBeLessThanOrEqual(1)
      await assertWithinViewport(popup)
      await expect(
        modal.getByRole("treeitem", { name: "Leaf", exact: true })
      ).toBeVisible()
    })
  }
}

for (const story of [
  "playground",
  "default",
  "on-sale",
  "out-of-stock",
  "linked-sale-card",
]) {
  test(`product card ${story} fits the padded preview without document overflow`, async ({
    page,
  }) => {
    await openContractStory(page, `templates-productcardtemplate--${story}`, {
      brand: "business",
    })
    const card = page.locator('#storybook-root > [data-layout="column"]')
    await expect(card).toHaveCount(1)
    await assertWithinViewport(card)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBeLessThanOrEqual(await page.evaluate(() => innerWidth))
  })
}

for (const direction of ["ltr", "rtl"]) {
  test(`compact ${direction} filters retain the upper-bound control and focus through width changes`, async ({
    page,
  }) => {
    await openContractStory(
      page,
      "organisms-datatable--narrow-column-filters",
      {
        brand: "business",
        args: `dir:${direction}`,
      }
    )
    const table = page.getByRole("table", { name: "fixed layout filters" })
    const trigger = table.getByRole("button", {
      name: "Filter Age",
      exact: true,
    })
    await trigger.click()
    const popup = page.getByRole("dialog", { name: "Filter Age", exact: true })
    await popup.getByLabel("Filter value for Age", { exact: true }).fill("36")
    await popup
      .getByRole("button", { name: /^Filter condition for Age:/ })
      .click()
    await page
      .getByRole("menuitemradio", { name: "Between", exact: true })
      .click()
    const upper = popup.getByLabel("Filter upper bound for Age", {
      exact: true,
    })
    await upper.fill("40")
    await expect(upper).toHaveValue("40")
    await upper.focus()
    await upper.evaluate((field) =>
      field.setAttribute("data-resize-owner", "upper")
    )
    const column = table.locator("colgroup col").first()
    await column.evaluate((element) => {
      ;(element as HTMLElement).style.width = "320px"
    })
    const retained = page.locator('[data-resize-owner="upper"]')
    await expect(trigger).toHaveCount(0)
    await expect(retained).toBeFocused()
    await expect(
      table.getByLabel("Filter upper bound for Age", { exact: true })
    ).toHaveAttribute("data-resize-owner", "upper")
    await retained.fill("42")
    await expect(
      table.getByLabel("Filter value for Age", { exact: true })
    ).toHaveValue("36")
    await column.evaluate((element) => {
      ;(element as HTMLElement).style.width = "80px"
    })
    await expect(popup).toBeVisible()
    await expect(retained).toBeFocused()
    await expect(retained).toHaveValue("42")
    await expect(
      popup.getByLabel("Filter value for Age", { exact: true })
    ).toHaveValue("36")
    await page.keyboard.press("Escape")
    await expect(trigger).toBeFocused()
  })
}

const accessibilityStories = [
  "molecules-breadcrumb--playground",
  "molecules-cascadeselect--long-labels",
  "organisms-datatable--grouped-fixed-widths",
  "overview-component-comparison--side-by-side",
  "molecules-slider--disabled",
  "molecules-slider--all-variants",
  "molecules-formcheckbox--disabled",
  "molecules-formcheckbox--indeterminate",
  "molecules-switch--disabled",
  "molecules-popover--long-content",
  "templates-comprehensive-form--disabled",
  "templates-facetfilterpanel--disabled",
  "templates-facetfilterpanel--pending",
]

for (const [brand, mode] of [
  ["base", "light"],
  ["base", "dark"],
  ["neo", "light"],
  ["neo", "dark"],
  ["business", "light"],
  ["akros", "light"],
]) {
  test(`${brand} ${mode} Popover supports keyboard scrolling without stealing initial focus`, async ({
    page,
  }) => {
    await openContractStory(page, "molecules-popover--long-content", {
      brand,
      mode,
    })
    const trigger = page.getByRole("button", {
      name: "Review attachment",
      exact: true,
    })
    await trigger.focus()
    await trigger.press("Enter")
    const panel = page.getByRole("dialog", { name: "Attachment details" })
    const close = panel.getByRole("button", {
      name: "Dismiss attachment details",
    })
    const viewport = panel.locator(".popover-scroll-viewport")
    await expect(close).toBeFocused()
    await page.keyboard.press("Shift+Tab")
    await expect(viewport).toBeFocused()
    await expect(
      panel.getByRole("region", { name: "Attachment details" })
    ).toHaveCount(1)
    const focusPaint = await viewport.evaluate((element) => {
      const style = getComputedStyle(element)
      return element.matches(":focus-visible") && style.boxShadow !== "none"
    })
    expect(focusPaint).toBe(true)
    await viewport.press("ArrowDown")
    await expect
      .poll(() => viewport.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0)
    await viewport.press("End")
    await expect
      .poll(() =>
        viewport.evaluate(
          (element) =>
            element.scrollHeight - element.clientHeight - element.scrollTop
        )
      )
      .toBeLessThanOrEqual(1)
    await expect(close).toBeVisible()
    await assertWithinViewport(close)
    await page.keyboard.press("Escape")
    await expect(panel).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })

  for (const storyId of accessibilityStories) {
    test(`${brand} ${mode} ${storyId} passes the required accessibility policy`, async ({
      page,
    }) => {
      await openContractStory(page, storyId, { brand, mode })
      if (storyId === "overview-component-comparison--side-by-side") {
        const inventory = page.getByRole("region", {
          name: "Product inventory table",
        })
        await expect(inventory).toHaveAttribute("tabindex", "0")
        await expect(inventory).toHaveCSS("overflow-x", "auto")
      }
      await page.waitForFunction(
        (id) =>
          (
            window as unknown as {
              __TECHSIO_A11Y_RESULTS__?: { storyId: string }
            }
          ).__TECHSIO_A11Y_RESULTS__?.storyId === id,
        storyId,
        { timeout: 30_000 }
      )
      const result = await page.evaluate(
        () =>
          (
            window as unknown as {
              __TECHSIO_A11Y_RESULTS__?: {
                storyId: string
                results: { violations: { id: string }[] }
              }
            }
          ).__TECHSIO_A11Y_RESULTS__
      )
      expect(result?.storyId).toBe(storyId)
      if (!Array.isArray(result?.results?.violations)) {
        throw new Error("Missing browser accessibility results")
      }
      const blocking = blockingViolations(result.results.violations)
      expect(
        blocking,
        JSON.stringify(
          result.results.violations.filter((violation) =>
            blocking.includes(violation.id)
          )
        )
      ).toEqual([])
    })
  }
}

test("linked product titles clamp text without clipping their focus outline", async ({
  page,
}) => {
  await openContractStory(
    page,
    "templates-productcardtemplate--linked-sale-card",
    {
      brand: "business",
    }
  )
  const link = page.getByRole("link", { name: "Montážní sada M8", exact: true })
  await link.focus()
  await expect(link).toBeFocused()
  const before = await link.evaluate((node) => {
    const heading = node.parentElement
    if (!heading) {
      throw new Error("Missing product heading")
    }
    const style = getComputedStyle(node)
    return {
      ancestorOverflow: getComputedStyle(heading).overflow,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      outlineStyle: style.outlineStyle,
      underline: style.textDecorationLine,
      clamp: style.webkitLineClamp,
      reservation: getComputedStyle(heading).minHeight,
    }
  })
  expect(before.ancestorOverflow).toBe("visible")
  expect(before.outlineWidth).toBeGreaterThan(0)
  expect(before.outlineStyle).not.toBe("none")
  expect(before.underline).toContain("underline")
  expect(before.clamp).toBe("2")
  await assertWithinViewport(link)
  const fullName =
    "Montážní sada M8 s kompletním příslušenstvím pro profesionální montáž a bezpečné upevnění velkých konstrukcí"
  await page.evaluate((name) => {
    const channel = (
      window as unknown as {
        __STORYBOOK_ADDONS_CHANNEL__: {
          emit: (event: string, payload: unknown) => void
        }
      }
    ).__STORYBOOK_ADDONS_CHANNEL__
    channel.emit("updateStoryArgs", {
      storyId: "templates-productcardtemplate--linked-sale-card",
      updatedArgs: { name },
    })
  }, fullName)
  const longLink = page.getByRole("link", { name: fullName, exact: true })
  await longLink.focus()
  await expect(longLink).toBeFocused()
  await assertWithinViewport(longLink)
  const dimensions = await longLink.evaluate((node) => {
    const heading = node.parentElement
    if (!heading) {
      throw new Error("Missing product heading")
    }
    return {
      height: node.getBoundingClientRect().height,
      lineHeight: Number.parseFloat(getComputedStyle(node).lineHeight),
      minHeight: getComputedStyle(heading).minHeight,
      text: node.textContent,
    }
  })
  expect(dimensions.height).toBeLessThanOrEqual(dimensions.lineHeight * 2 + 1)
  expect(dimensions.minHeight).toBe(before.reservation)
  expect(dimensions.text).toBe(fullName)
})
