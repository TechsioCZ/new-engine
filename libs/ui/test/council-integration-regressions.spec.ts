import { expect, test } from "@playwright/test"
import { openContractStory } from "./visual-shared-contracts.mjs"
import { assertWithinViewport } from "./visual-viewport.mjs"

const playErrorPattern = /TestingLibraryElementError|AssertionError/
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
