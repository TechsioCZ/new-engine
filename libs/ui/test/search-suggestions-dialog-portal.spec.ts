import { expect, test } from "@playwright/test"

// Inline suggestions inside a modal must leave its scroll viewport through the
// modal's overlay container, so the popup is neither clipped nor outside the trap.
test("dialog suggestions render outside the scroll viewport but inside the modal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto(
    "/iframe.html?id=templates-searchsuggestions--in-dialog&viewMode=story&embed=true"
  )
  await page.getByRole("button", { name: "Open search" }).click()
  const dialog = page.getByRole("dialog", { name: "Search catalog" })
  const input = dialog.getByRole("combobox", { name: "Search catalog" })
  await input.click()
  await input.press("ArrowDown")
  const content = dialog.locator('[data-scope="combobox"][data-part="content"]')
  await expect(content).toBeVisible()
  await expect(content.getByRole("listbox")).toBeInViewport({ ratio: 1 })

  const placement = await content.evaluate((node) => {
    const box = node.getBoundingClientRect()
    let clippedBy: string | null = null
    for (
      let parent = node.parentElement;
      parent;
      parent = parent.parentElement
    ) {
      if (parent === document.body || parent === document.documentElement) {
        continue
      }
      const style = getComputedStyle(parent)
      const bounds = parent.getBoundingClientRect()
      const clipsX = /^(auto|scroll|hidden|clip)$/.test(style.overflowX)
      const clipsY = /^(auto|scroll|hidden|clip)$/.test(style.overflowY)
      if (
        (clipsX &&
          (box.left < bounds.left - 1 || box.right > bounds.right + 1)) ||
        (clipsY && (box.top < bounds.top - 1 || box.bottom > bounds.bottom + 1))
      ) {
        clippedBy = parent.className.toString()
      }
    }
    return {
      clippedBy,
      inScrollViewport: !!node.closest(".dialog-scroll-viewport"),
      inModal: !!node.closest('[role="dialog"][aria-modal="true"]'),
    }
  })
  expect(placement).toEqual({
    clippedBy: null,
    inScrollViewport: false,
    inModal: true,
  })

  const listbox = content.getByRole("listbox")
  const listboxId = await listbox.getAttribute("id")
  if (!listboxId) {
    throw new Error("Missing suggestions listbox id")
  }
  await expect(input).toHaveAttribute("aria-controls", listboxId)
  await expect(
    content.getByRole("option", { name: "Limited edition trainers" })
  ).toHaveAttribute("aria-disabled", "true")

  // Focus stays in the modal and Escape still closes one layer at a time.
  await expect(input).toBeFocused()
  await input.press("Escape")
  await expect(content).toBeHidden()
  await expect(dialog).toBeVisible()
  await input.press("Escape")
  await expect(dialog).toBeHidden()
})

test("standalone suggestions stay inline in the story canvas", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=templates-searchsuggestions--playground&viewMode=story&embed=true"
  )
  const input = page.getByRole("combobox", { name: "Search catalog" }).first()
  await input.click()
  await input.press("ArrowDown")
  const content = page.locator(
    '#storybook-root [data-scope="combobox"][data-part="content"]'
  )
  await expect(content).toBeVisible()
})
