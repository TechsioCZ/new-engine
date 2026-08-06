import { HydrationBoundary } from "@tanstack/react-query"
import { permanentRedirect } from "next/navigation"
import type { ReactNode } from "react"
import { ForgotPasswordPanel } from "@/app/auth/forgot-password/forgot-password-panel"
import { ResetPasswordPanel } from "@/app/auth/reset-password/reset-password-panel"
import { AccountOrderDetail } from "@/components/account-order-detail"
import { AccountOrdersList } from "@/components/account-orders-list"
import { AccountOverview } from "@/components/account-overview"
import { AccountProductLists } from "@/components/account-product-lists"
import { AccountSettings } from "@/components/account-settings"
import { resolveAfterAuthHref } from "@/components/auth/auth-helpers"
import { AuthControls } from "@/components/auth-controls"
import { CheckoutPaymentReturnPanel } from "@/components/checkout/checkout-payment-return-panel"
import { CheckoutFlow } from "@/components/checkout-flow"
import { ProductReviewTokenPage } from "@/components/reviews/product-review-token-page"
import { SearchResults } from "@/components/search-results"
import { getAppRequestServerContext } from "@/lib/storefront/market-context.app"
import { parsePlpQueryStateFromSearchParams } from "@/lib/storefront/plp-query-state"
import { prefetchSearchPageStorefrontData } from "@/lib/storefront/ssr"
import { buildCheckoutUrl } from "@/lib/url/builder"
import type { Market } from "@/lib/url/types"
import type { ParsedPublicRoute } from "./route-parser"

type SearchParams = Record<string, string | string[] | undefined>

type Input = {
  market: Market
  route: ParsedPublicRoute
  searchParams: SearchParams
}

const scalar = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

const renderAuth = (
  market: Market,
  route: Extract<ParsedPublicRoute, { type: "account" }>,
  searchParams: SearchParams
): ReactNode => {
  if (route.action === "login" || route.action === "register") {
    return (
      <main>
        <AuthControls
          afterAuthHref={resolveAfterAuthHref(
            market,
            scalar(searchParams.next)
          )}
          mode={route.action}
        />
      </main>
    )
  }
  if (route.action === "forgot") {
    return (
      <main>
        <ForgotPasswordPanel />
      </main>
    )
  }
  if (route.action === "reset") {
    return (
      <main>
        <ResetPasswordPanel
          email={scalar(searchParams.email) ?? null}
          flow={
            scalar(searchParams.flow) === "account-setup"
              ? "account-setup"
              : "reset-password"
          }
          token={route.token ?? scalar(searchParams.token) ?? null}
        />
      </main>
    )
  }
  return null
}

const renderAccount = (
  market: Market,
  route: Extract<ParsedPublicRoute, { type: "account" }>,
  searchParams: SearchParams
): ReactNode => {
  if (route.action) {
    return renderAuth(market, route, searchParams)
  }
  if (route.orderId) {
    return <AccountOrderDetail orderId={route.orderId} />
  }
  if (route.section === "orders") {
    return <AccountOrdersList />
  }
  if (route.section === "lists") {
    return <AccountProductLists />
  }
  if (route.section === "settings") {
    return <AccountSettings />
  }
  return <AccountOverview />
}

/** Render non-indexable storefront flows after the public path was validated. */
export async function renderFlowRoute({
  market,
  route,
  searchParams,
}: Input): Promise<ReactNode | null> {
  if (route.type === "search") {
    const requestContext = await getAppRequestServerContext()
    const queryState = parsePlpQueryStateFromSearchParams({
      q: searchParams.q,
      page: searchParams.strana,
      sort: searchParams.razeni,
      brand: searchParams.znacka,
    })
    const { dehydratedState } = await prefetchSearchPageStorefrontData(
      requestContext,
      queryState
    )
    return (
      <HydrationBoundary state={dehydratedState}>
        <SearchResults />
      </HydrationBoundary>
    )
  }

  if (route.type === "cart") {
    return <CheckoutFlow activeStep="kosik" />
  }

  if (route.type === "checkout") {
    if (route.route === "root") {
      permanentRedirect(buildCheckoutUrl(market, "checkout.contact"))
    }
    if (route.route === "payment-return") {
      return (
        <main>
          <CheckoutPaymentReturnPanel />
        </main>
      )
    }
    if (route.route === "contact") {
      return <CheckoutFlow activeStep="udaje" />
    }
    if (route.route === "shipping" || route.route === "payment") {
      return <CheckoutFlow activeStep="doprava-platba" />
    }
    return <CheckoutFlow activeStep="suhrn" />
  }

  if (route.type === "account") {
    return renderAccount(market, route, searchParams)
  }

  if (route.type === "review") {
    return (
      <ProductReviewTokenPage
        productId={scalar(searchParams.product_id)}
        token={route.token}
      />
    )
  }

  return null
}
