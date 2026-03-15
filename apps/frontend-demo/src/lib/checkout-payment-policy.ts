import type { PaymentMethod } from "@/types/checkout"

type PaymentProviderLike = {
  id?: string | null
  is_enabled?: boolean | null
}

const PAYMENT_PROVIDER_UI: Record<string, Omit<PaymentMethod, "id">> = {
  pp_system_default: {
    name: "Online platba",
    fee: 0,
    image: "/assets/card.webp",
  },
  pp_stripe_stripe: {
    name: "Stripe",
    fee: 0,
    image: "/assets/stripe.webp",
  },
}

function formatFallbackName(providerId: string): string {
  return providerId.replace(/^pp_/, "").replace(/_/g, " ")
}

export function resolveCheckoutPaymentMethods(
  providers: PaymentProviderLike[] | undefined
): PaymentMethod[] {
  if (!providers?.length) {
    return []
  }

  const dedup = new Map<string, PaymentMethod>()

  for (const provider of providers) {
    const providerId = provider.id?.trim()
    if (!providerId || provider.is_enabled === false) {
      continue
    }

    const mapped = PAYMENT_PROVIDER_UI[providerId]
    dedup.set(providerId, {
      id: providerId,
      name: mapped?.name ?? formatFallbackName(providerId),
      fee: mapped?.fee ?? 0,
      image: mapped?.image ?? "/assets/card.webp",
    })
  }

  return Array.from(dedup.values())
}
