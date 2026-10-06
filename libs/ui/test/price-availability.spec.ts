import { expect, type Locator, type Page, test } from "@playwright/test"

async function openStory(page: Page, story: string) {
	await page.goto(`/iframe.html?id=${story}&viewMode=story`)
	await expect(page.locator("#storybook-root")).not.toBeEmpty()
}

function state(root: Locator, value: string) {
	return root.locator(`[data-state="${value}"]`)
}

function status(root: Locator, value: string) {
	return root.locator(`[data-status="${value}"]`)
}

test("PriceBlock preserves state semantics and localized pending copy", async ({
	page,
}) => {
	await openStory(page, "molecules-priceblock--states")
	const root = page.locator("#storybook-root")

	const known = state(root, "known")
	await expect(known).toContainText("249 Kč")
	await expect(known.locator(".text-price-block-amount-size")).toHaveCount(1)
	await expect(known.locator(".text-price-block-metadata-size")).toHaveCount(1)
	await expect(known.locator('[aria-hidden="true"]')).toHaveText("·")

	const from = state(root, "from")
	await expect(from).toContainText("Od")
	await expect(from.locator('[aria-hidden="true"]')).toHaveCount(0)

	const discounted = state(root, "discounted")
	await expect(discounted.locator("del")).toHaveText("299 Kč")
	await expect(discounted).toContainText("Akce")

	const onRequest = state(root, "on-request")
	await expect(onRequest).toContainText("Cena na dotaz")
	await expect(onRequest).toContainText("Cenu nyní nelze zobrazit.")

	const pending = state(root, "pending")
	const pendingBounds = await pending.boundingBox()
	expect(pendingBounds?.width).toBeGreaterThan(0)
	await expect(pending.locator('[aria-busy="true"]')).toHaveAttribute(
		"aria-hidden",
		"true",
	)
	await expect(pending).toMatchAriaSnapshot("- text: Načítání ceny")
	await expect(pending).not.toHaveAttribute("role", "status")
	await expect(pending).not.toHaveAttribute("aria-live")
})

test("AvailabilityStatus keeps statuses distinct and icons decorative", async ({
	page,
}) => {
	await openStory(page, "molecules-availabilitystatus--states")
	const root = page.locator("#storybook-root")

	const icons = {
		available: "token-icon-availability-status-available",
		limited: "token-icon-availability-status-limited",
		preorder: "token-icon-availability-status-preorder",
		unavailable: "token-icon-availability-status-unavailable",
		unknown: "token-icon-availability-status-unknown",
	}

	for (const [value, icon] of Object.entries(icons)) {
		await expect(status(root, value).first()).toBeVisible()
		await expect(
			status(root, value)
				.first()
				.locator(".text-availability-status-label-size"),
		).toHaveCount(1)
		const decorativeIcon = status(root, value)
			.first()
			.locator('[aria-hidden="true"]')
		await expect(decorativeIcon).toHaveCount(1)
		await expect(decorativeIcon).toHaveClass(new RegExp(icon))
	}

	const unavailable = status(root, "unavailable").first()
	const unknown = status(root, "unknown").first()
	await expect(unavailable).toContainText("Nedostupné")
	await expect(unknown).toContainText("Dostupnost neznámá")
	expect(
		await unavailable.locator('[aria-hidden="true"]').getAttribute("class"),
	).not.toBe(
		await unknown.locator('[aria-hidden="true"]').getAttribute("class"),
	)

	const overridden = status(root, "available").filter({
		hasText: "Skladem s vlastní ikonou",
	})
	await expect(overridden.locator('[aria-hidden="true"]')).toHaveClass(
		/token-icon-info/,
	)

	const hidden = status(root, "limited").filter({
		hasText: "Omezená dostupnost bez ikony",
	})
	await expect(hidden.locator('[aria-hidden="true"]')).toHaveCount(0)

	const pending = status(root, "pending")
	const pendingBounds = await pending.boundingBox()
	expect(pendingBounds?.width).toBeGreaterThan(0)
	await expect(pending.locator('[aria-busy="true"]')).toHaveAttribute(
		"aria-hidden",
		"true",
	)
	await expect(pending).toMatchAriaSnapshot("- text: Načítání dostupnosti")
	await expect(pending).not.toHaveAttribute("role", "status")
	await expect(pending).not.toHaveAttribute("aria-live")
})

test("long content fits narrow layouts without horizontal overflow", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 })

	for (const story of [
		"molecules-priceblock--long-content",
		"molecules-availabilitystatus--long-content",
	]) {
		await openStory(page, story)
		const overflow = await page.evaluate(() => ({
			clientWidth: document.documentElement.clientWidth,
			scrollWidth: document.documentElement.scrollWidth,
		}))
		expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth)
	}
})
