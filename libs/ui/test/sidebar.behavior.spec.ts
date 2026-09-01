import { expect, type Page, test } from "@playwright/test"

const desktopViewport = { height: 800, width: 1280 }
const mobileViewport = { height: 800, width: 768 }

async function openStory(page: Page, storyId: string) {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto(`/iframe.html?id=${storyId}&viewMode=story`, {
    waitUntil: "domcontentloaded",
  })
  await page.locator("#storybook-root").waitFor()
  await expect(
    page.locator('[data-scope="sidebar"][data-part="root"]')
  ).toBeVisible()
}

async function waitForMode(page: Page, mode: "desktop" | "mobile") {
  const sentinel = page.locator(
    '[data-scope="sidebar"][data-part="breakpoint"]'
  )
  await expect
    .poll(() => sentinel.evaluate((node) => getComputedStyle(node).display))
    .toBe(mode === "desktop" ? "block" : "none")
}

test.describe("Sidebar responsive behavior", () => {
  test("preserves focus intent across repeated breakpoint changes", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Responsive behavior is covered once with explicit viewports"
    )

    await page.setViewportSize(desktopViewport)
    await openStory(page, "organisms-sidebar--breakpoint-focus-transfer")
    await waitForMode(page, "desktop")

    const primaryTrigger = page.getByRole("button", {
      name: "Toggle focus navigation primary",
    })
    const secondaryTrigger = page.getByRole("button", {
      name: "Toggle focus navigation secondary",
    })
    const panelControl = page.getByTestId("panel-focus-control")

    await panelControl.focus()
    await expect(panelControl).toBeFocused()

    await page.setViewportSize(mobileViewport)
    await waitForMode(page, "mobile")
    await expect(primaryTrigger).toBeFocused()

    await secondaryTrigger.click()
    await expect(
      page.getByRole("dialog", { name: "Focus test navigation" })
    ).toBeVisible()
    await panelControl.focus()

    await page.setViewportSize(desktopViewport)
    await waitForMode(page, "desktop")
    await expect(secondaryTrigger).toBeFocused()

    await page.setViewportSize(mobileViewport)
    await waitForMode(page, "mobile")
    await secondaryTrigger.click()
    await page.getByTestId("arm-replacement-autofocus").click()
    await panelControl.focus()

    await page.setViewportSize(desktopViewport)
    await waitForMode(page, "desktop")
    await expect(page.getByTestId("replacement-autofocus")).toBeFocused()

    await page.setViewportSize(mobileViewport)
    await waitForMode(page, "mobile")
    await expect(secondaryTrigger).toBeFocused()
  })

  test("falls back from a fixed panel to its mobile trigger", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Responsive behavior is covered once with explicit viewports"
    )

    await page.setViewportSize(mobileViewport)
    await openStory(page, "organisms-sidebar--left-and-right-sidebar-15")
    await waitForMode(page, "mobile")

    const endTrigger = page.getByRole("button", {
      name: "Toggle end navigation",
    })
    const endPanel = page.getByRole("complementary", {
      name: "Context navigation",
    })

    await endTrigger.focus()
    await page.setViewportSize(desktopViewport)
    await waitForMode(page, "desktop")
    await expect(endPanel).toBeFocused()
    await expect(endTrigger).toHaveCount(0)

    await page.setViewportSize(mobileViewport)
    await waitForMode(page, "mobile")
    await expect(endTrigger).toBeFocused()

    await endTrigger.click()
    await endPanel.getByRole("link", { name: "Orders" }).focus()

    await page.setViewportSize(desktopViewport)
    await waitForMode(page, "desktop")
    await expect(endPanel).toBeFocused()
    await expect(endTrigger).toHaveCount(0)

    await page.setViewportSize(mobileViewport)
    await waitForMode(page, "mobile")
    await expect(endTrigger).toBeFocused()
  })

  test("treats controlled null as closed despite a non-null default", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Responsive behavior is covered once with an explicit mobile viewport"
    )

    await page.setViewportSize(mobileViewport)
    await openStory(page, "organisms-sidebar--controlled-offcanvas")
    await waitForMode(page, "mobile")

    const trigger = page.getByRole("button", {
      name: "Toggle start navigation",
    })
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await expect(
      page.getByRole("dialog", { name: "Primary navigation" })
    ).toHaveCount(0)

    await trigger.click()
    const dialog = page.getByRole("dialog", {
      name: "Primary navigation",
    })
    await expect(dialog).toBeVisible()
    await page.getByRole("button", { name: "Close primary navigation" }).click()
    await expect(dialog).toHaveCount(0)
  })

  test("updates controlled desktop state", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Desktop state is covered once"
    )

    await page.setViewportSize(desktopViewport)
    await openStory(page, "organisms-sidebar--controlled-offcanvas")
    await waitForMode(page, "desktop")

    const trigger = page.getByRole("button", {
      name: "Toggle start navigation",
    })
    const panel = page.locator(
      '[data-scope="sidebar"][data-part="panel"][data-side="start"]'
    )
    const state = page.getByTestId("controlled-state")

    await expect(state).toHaveText("Desktop: none; mobile: none")
    await expect(panel).toHaveAttribute("aria-hidden", "true")
    await trigger.click()
    await expect(state).toHaveText("Desktop: start; mobile: none")
    await expect(panel).not.toHaveAttribute("aria-hidden")
    await expect(panel).toHaveAttribute("data-state", "expanded")
  })

  test("toggles the icon-collapse panel", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Desktop collapse behavior is covered once"
    )

    await page.setViewportSize(desktopViewport)
    await openStory(page, "organisms-sidebar--icon-collapse-sidebar-07")
    await waitForMode(page, "desktop")

    const trigger = page.getByRole("button", {
      name: "Toggle start navigation",
    })
    const panel = page.getByRole("complementary", {
      name: "Primary navigation",
    })

    await expect(panel).toHaveAttribute("data-state", "collapsed")
    await trigger.click()
    await expect(panel).toHaveAttribute("data-state", "expanded")
    await trigger.click()
    await expect(panel).toHaveAttribute("data-state", "collapsed")
  })

  test("restores the detail pane when a rail item is selected", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Desktop two-pane behavior is covered once"
    )

    await page.setViewportSize(desktopViewport)
    await openStory(page, "organisms-sidebar--two-pane-sidebar-09")
    await waitForMode(page, "desktop")

    const trigger = page.getByRole("button", {
      name: "Toggle start navigation",
    })
    const detailPane = page.getByTestId("detail-pane")

    await expect(detailPane).not.toHaveAttribute("hidden")
    await trigger.click()
    await expect(detailPane).toHaveAttribute("hidden")

    await page.getByRole("link", { name: "Projects" }).click()
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(detailPane).not.toHaveAttribute("hidden")
    await expect(
      detailPane.getByText("Projects", { exact: true })
    ).toBeVisible()
  })

  test("toggles a right sidebar independently", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Desktop end-panel behavior is covered once"
    )

    await page.setViewportSize(desktopViewport)
    await openStory(page, "organisms-sidebar--right-sidebar-14")
    await waitForMode(page, "desktop")

    const trigger = page.getByRole("button", {
      name: "Toggle end navigation",
    })
    const panel = page.getByRole("complementary", {
      name: "Order navigation",
    })

    await expect(panel).toHaveAttribute("data-side", "end")
    await trigger.click()
    await expect(panel).toHaveAttribute("data-state", "collapsed")
    await trigger.click()
    await expect(panel).toHaveAttribute("data-state", "expanded")
  })

  test("keeps a fixed end panel expanded", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Desktop fixed-panel behavior is covered once"
    )

    await page.setViewportSize(desktopViewport)
    await openStory(page, "organisms-sidebar--left-and-right-sidebar-15")
    await waitForMode(page, "desktop")

    const startTrigger = page.getByRole("button", {
      name: "Toggle start navigation",
    })
    const startPanel = page.getByRole("complementary", {
      name: "Primary navigation",
    })
    const endPanel = page.getByRole("complementary", {
      name: "Context navigation",
    })

    await expect(
      page.getByRole("button", { name: "Toggle end navigation" })
    ).toHaveCount(0)
    await startTrigger.click()
    await expect(startPanel).toHaveAttribute("data-state", "collapsed")
    await expect(endPanel).toHaveAttribute("data-state", "expanded")
  })

  test("maps logical RTL edges on desktop and mobile", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Logical edge behavior is covered once with explicit viewports"
    )

    await page.setViewportSize(desktopViewport)
    await openStory(page, "organisms-sidebar--logical-edges-rtl")
    await waitForMode(page, "desktop")

    const root = page.locator('[data-scope="sidebar"][data-part="root"]')
    const startPanel = page.getByRole("complementary", {
      name: "Primary navigation",
    })
    const endPanel = page.getByRole("complementary", {
      name: "Context navigation",
    })
    await expect
      .poll(async () => {
        const [rootBox, startBox, endBox] = await Promise.all([
          root.boundingBox(),
          startPanel.boundingBox(),
          endPanel.boundingBox(),
        ])
        return {
          endLeft: endBox?.x,
          rootLeft: rootBox?.x,
          rootRight: (rootBox?.x ?? 0) + (rootBox?.width ?? 0),
          startRight: (startBox?.x ?? 0) + (startBox?.width ?? 0),
        }
      })
      .toMatchObject({
        endLeft: 0,
        rootLeft: 0,
        rootRight: 1280,
        startRight: 1280,
      })

    await page.setViewportSize(mobileViewport)
    await waitForMode(page, "mobile")
    const startTrigger = page.getByRole("button", {
      name: "Toggle start navigation",
    })
    await startTrigger.click()

    const drawer = page
      .getByRole("complementary", { name: "Primary navigation" })
      .locator('xpath=ancestor::*[@data-scope="drawer"][@data-part="content"]')
    await expect(drawer).toHaveAttribute("data-swipe-direction", "right")
    await expect(drawer).toHaveAttribute("dir", "rtl")
  })

  test("keeps the site header outside the sidebar row", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Sticky header layout is covered once"
    )

    await page.setViewportSize(desktopViewport)
    await openStory(page, "organisms-sidebar--sticky-site-header-sidebar-16")

    const root = page.locator('[data-scope="sidebar"][data-part="root"]')
    const header = page.getByTestId("site-header")
    const applicationRow = page.getByTestId("application-row")

    await expect(header).toHaveCSS("position", "sticky")
    await expect
      .poll(async () =>
        Promise.all([
          header.evaluate((node) => node.parentElement?.dataset.part),
          applicationRow.evaluate((node) => node.parentElement?.dataset.part),
        ])
      )
      .toEqual(["root", "root"])

    const [rootBox, headerBox] = await Promise.all([
      root.boundingBox(),
      header.boundingBox(),
    ])
    expect(rootBox).not.toBeNull()
    expect(headerBox).not.toBeNull()
    expect(Math.abs((headerBox?.x ?? 0) - (rootBox?.x ?? 0))).toBeLessThan(1)
    expect(
      Math.abs(
        (headerBox?.x ?? 0) +
          (headerBox?.width ?? 0) -
          ((rootBox?.x ?? 0) + (rootBox?.width ?? 0))
      )
    ).toBeLessThan(1)
  })
})
