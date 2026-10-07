import { expect, type Page, test } from "@playwright/test"

async function openStory(page: Page, story: string, args?: string) {
	const query = new URLSearchParams({
		id: `organisms-lineitem--${story}`,
		viewMode: "story",
	})
	if (args) query.set("args", args)
	await page.goto(`/iframe.html?${query}`)
	await expect(page.getByText("498 Kč", { exact: true })).toBeVisible()
}

test("read-only recap contains quantity text without mutable controls", async ({
	page,
}) => {
	await openStory(page, "read-only")
	await expect(page.getByText("2 balení", { exact: true })).toBeVisible()
	await expect(page.getByRole("spinbutton")).toHaveCount(0)
	await expect(page.getByRole("button")).toHaveCount(0)
})

test("pending prevents removal and quantity interaction", async ({ page }) => {
	await openStory(page, "pending")
	await expect(page.locator('[data-part="remove"]')).toBeDisabled()
	const input = page.locator('input[role="spinbutton"]')
	await expect(input).toBeDisabled()
	await expect(input.locator("xpath=ancestor::*[@inert]")).toHaveCount(1)
	await expect(
		page.getByText("Ukládáme položku", { exact: true }),
	).toBeVisible()
})

test("unavailable items remain removable by a product-specific accessible action", async ({
	page,
}) => {
	await openStory(page, "unavailable")
	await expect(page.getByText("Není skladem", { exact: true })).toBeVisible()
	await expect(
		page.getByRole("button", { name: "Odebrat: Montážní sada M8" }),
	).toBeEnabled()
})

test("a long title does not push the amount out of a narrow viewport", async ({
	page,
}) => {
	await page.setViewportSize({ width: 375, height: 900 })
	await openStory(page, "long-content")
	const amount = await page.getByText("498 Kč", { exact: true }).boundingBox()
	if (!amount) {
		throw new Error("The line amount must be visible")
	}
	expect(amount.x + amount.width).toBeLessThanOrEqual(375)
	expect(
		await page.evaluate(() => document.documentElement.scrollWidth),
	).toBeLessThanOrEqual(375)
})

test("custom compound actions follow root pending and read-only", async ({
	page,
}) => {
	await openStory(page, "custom-composition")
	const title = await page.locator('[data-part="title"]').boundingBox()
	const options = await page.locator('[data-part="options"]').boundingBox()
	if (!title || !options) throw new Error("The custom content must be visible")
	expect(options.y - (title.y + title.height)).toBeLessThan(32)
	await openStory(page, "custom-composition", "pending:true")
	const action = page.locator('[data-part="actions"] button').first()
	await expect(action).toBeDisabled()
	await action.evaluate((button) => {
		button.removeAttribute("disabled")
		button.addEventListener("click", () =>
			button.setAttribute("data-clicked", "true"),
		)
		button.focus()
	})
	await expect(action).not.toBeFocused()
	const bounds = await action.boundingBox()
	if (!bounds) throw new Error("The custom action must remain visible")
	await page.mouse.click(
		bounds.x + bounds.width / 2,
		bounds.y + bounds.height / 2,
	)
	await expect(action).not.toHaveAttribute("data-clicked", "true")
	await openStory(page, "custom-composition", "readOnly:true")
	await expect(page.getByText("2 balení", { exact: true })).toBeVisible()
	await expect(page.locator('[data-part="actions"]')).toHaveCount(0)
	await expect(page.getByRole("spinbutton")).toHaveCount(0)
	await expect(page.getByRole("button")).toHaveCount(0)
})
