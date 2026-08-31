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
})
