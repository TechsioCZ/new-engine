import type { MarketCode } from "@/lib/market/market-runtime"
import { transactionalFlowReader } from "@/lib/routing/private-flows/transactional-page.server"
import { isProductReviewMarketSupported } from "@/lib/storefront/review-market-policy"

export const loadReviewInvitationSource = async ({
  market,
  productId,
  token,
}: Readonly<{
  market: MarketCode
  productId?: string
  token: string
}>) => {
  if (!isProductReviewMarketSupported(market)) {
    return { kind: "missing" } as const
  }
  const invitation = await transactionalFlowReader.readReviewInvitation(
    market,
    token
  )
  if (invitation.kind !== "found") {
    return invitation
  }
  if (productId && productId !== invitation.value.productId) {
    return { kind: "missing" } as const
  }
  return {
    kind: "found" as const,
    value: { productId: invitation.value.productId, token },
  }
}
