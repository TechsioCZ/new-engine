import { expect, type Page } from "@playwright/test"

const CART_COMPLETE_PATH = /\/store\/carts\/[^/]+\/complete(?:\?|$)/u
const ORDER_WRITE_PATH = /\/store\/orders(?:\/|\?|$)/u
const FORBIDDEN_ROUTE_PATTERNS = [
  "**/store/carts/*/complete",
  "**/store/orders**",
] as const

export const installOrderWriteGuard = async (page: Page) => {
  const forbiddenWrites: string[] = []

  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      (CART_COMPLETE_PATH.test(request.url()) ||
        ORDER_WRITE_PATH.test(request.url()))
    ) {
      forbiddenWrites.push(`${request.method()} ${request.url()}`)
    }
  })

  for (const pattern of FORBIDDEN_ROUTE_PATTERNS) {
    await page.route(pattern, async (route) => {
      const request = route.request()
      if (request.method() !== "POST") {
        await route.continue()
        return
      }
      forbiddenWrites.push(`${request.method()} ${request.url()}`)
      await route.abort("blockedbyclient")
    })
  }

  return () =>
    expect(forbiddenWrites, "order writes must stay blocked").toEqual([])
}
