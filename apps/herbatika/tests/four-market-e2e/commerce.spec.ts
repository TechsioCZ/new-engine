import { expect, test } from "@playwright/test"
import { reachPreOrderBoundary } from "./checkout-journey"
import {
  addProductAndOpenCart,
  findCatalogProduct,
  updateAndRemoveCartLine,
  verifySearchJourney,
} from "./journey-helpers"
import { fixtureForProject } from "./market-fixtures"
import { installOrderWriteGuard } from "./order-write-guard"

test("search, product, cart and checkout stop at the pre-order boundary", async ({
  page,
}, testInfo) => {
  const fixture = fixtureForProject(testInfo.project.name)
  const assertNoOrderWrites = await installOrderWriteGuard(page)
  const product = await findCatalogProduct(page, fixture)

  await verifySearchJourney(page, fixture, product)
  await addProductAndOpenCart(page, fixture, product.href)
  await updateAndRemoveCartLine(page)
  await addProductAndOpenCart(page, fixture, product.href)
  await reachPreOrderBoundary(page, fixture)

  await expect(page.locator("main")).toContainText(fixture.currencyPattern)
  assertNoOrderWrites()
})
