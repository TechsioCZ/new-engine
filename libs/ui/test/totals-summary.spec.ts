import { expect, type Page, test } from "@playwright/test"

async function openStory(page: Page, story: string) {
	await page.goto(
		`/iframe.html?id=molecules-totalssummary--${story}&viewMode=story`,
	)
	await expect(page.locator('[data-scope="totals-summary"]')).toBeVisible()
}

test("unselected fees stay distinct from zero and the app supplies the subtotal", async ({
	page,
}) => {
	await openStory(page, "partial")
	const summary = page.locator('[data-scope="totals-summary"]')
	await expect(
		summary.getByText("Zvolte dopravu", { exact: true }),
	).toBeVisible()
	await expect(
		summary.getByText("Zvolte platbu", { exact: true }),
	).toBeVisible()
	await expect(
		summary.getByText("Mezisoučet včetně DPH", { exact: true }),
	).toBeVisible()
	await expect(summary.getByText("0 Kč", { exact: true })).toHaveCount(0)
})

test("discount and arbitrary tax/deposit rows retain their prepared values", async ({
	page,
}) => {
	await openStory(page, "discounted")
	await expect(
		page.getByRole("definition").filter({ hasText: "−150 Kč" }),
	).toBeVisible()
	await expect(page.getByText("1 437 Kč", { exact: true })).toBeVisible()
	await openStory(page, "custom-rows")
	await expect(page.getByText("DPH 21 %", { exact: true })).toBeVisible()
	await expect(
		page.getByText("Vratná záloha za obal", { exact: true }),
	).toBeVisible()
	await expect(page.getByText("1 310 Kč", { exact: true })).toBeVisible()
})

test("pending retains the last summary and blocks even an enabled action", async ({
	page,
}) => {
	await openStory(page, "pending")
	const summary = page.locator('[data-scope="totals-summary"]')
	await expect(summary).toHaveAttribute("aria-busy", "true")
	await expect(
		summary.getByText("Aktualizujeme souhrn objednávky", { exact: true }),
	).toBeVisible()
	await expect(summary.getByText("1 587 Kč", { exact: true })).toBeVisible()
	await expect(summary.locator("[inert]")).toHaveCount(1)
	await expect(summary.locator("button")).toBeDisabled()
	await summary
		.locator("button")
		.evaluate((button) => button.removeAttribute("disabled"))
	const action = summary.locator("button")
	await expect(action).toBeEnabled()
	await action.evaluate((button) => {
		button.addEventListener("click", () =>
			button.setAttribute("data-clicked", "true"),
		)
		button.focus()
	})
	await expect(action).not.toBeFocused()
	const bounds = await action.boundingBox()
	if (!bounds) throw new Error("The pending action must remain visible")
	await page.mouse.click(
		bounds.x + bounds.width / 2,
		bounds.y + bounds.height / 2,
	)
	await expect(action).not.toHaveAttribute("data-clicked", "true")
})

test("complete summary exposes term/value relationships and fits mobile", async ({
	page,
}) => {
	await page.setViewportSize({ width: 375, height: 812 })
	await openStory(page, "complete")
	await expect(
		page.getByRole("term").filter({ hasText: "Celkem včetně DPH" }),
	).toBeVisible()
	await expect(
		page.getByRole("definition").filter({ hasText: "1 587 Kč" }),
	).toBeVisible()
	const overflow = await page
		.locator('[data-scope="totals-summary"]')
		.evaluate((element) => element.scrollWidth > element.clientWidth)
	expect(overflow).toBe(false)
})
