import {
  type CheckoutConsentSnapshot,
  parseCheckoutConsentSnapshot,
} from "@/lib/storefront/checkout-consent"
import {
  type CheckoutPurchaseAcceptanceSnapshot,
  parseCheckoutPurchaseAcceptance,
} from "@/lib/storefront/checkout-purchase-acceptance"
import {
  buildAccountSetupRequestedMetadata,
  isRecord,
  readAccountSetupRequested,
} from "./account-setup-metadata"

const ORDER_NOTE_METADATA_KEY = "order_note"

type CheckoutMetadataInput = {
  accountSetupRequested: boolean
  cartId: string
  consent: CheckoutConsentSnapshot
  metadata: unknown
  orderNote: unknown
  purchaseAcceptance: CheckoutPurchaseAcceptanceSnapshot | null
}

const normalizeOrderNote = (value: unknown) => {
  if (typeof value !== "string") {
    return
  }

  const note = value.trim()
  return note.length > 0 ? note : undefined
}

export const readOrderNote = (metadata: unknown) =>
  isRecord(metadata)
    ? normalizeOrderNote(metadata[ORDER_NOTE_METADATA_KEY])
    : undefined

export const resolveOrderNoteFormValue = (
  metadata: unknown,
  legacyAddressNote: string
) => readOrderNote(metadata) ?? legacyAddressNote

export const buildCheckoutMetadata = ({
  accountSetupRequested,
  consent,
  metadata,
  orderNote,
  purchaseAcceptance,
}: CheckoutMetadataInput): Record<string, unknown> => ({
  ...buildAccountSetupRequestedMetadata(metadata, accountSetupRequested),
  checkout_consent: consent,
  checkout_purchase_acceptance: purchaseAcceptance,
  [ORDER_NOTE_METADATA_KEY]: normalizeOrderNote(orderNote) ?? "",
})

export const isCheckoutMetadataSynced = ({
  accountSetupRequested,
  cartId,
  consent,
  metadata,
  orderNote,
  purchaseAcceptance,
}: CheckoutMetadataInput) => {
  const storedConsent = isRecord(metadata)
    ? parseCheckoutConsentSnapshot(metadata.checkout_consent, {
        market: consent.market,
      })
    : null
  const storedPurchaseAcceptance = isRecord(metadata)
    ? parseCheckoutPurchaseAcceptance(metadata.checkout_purchase_acceptance, {
        cartId,
        market: consent.market,
      })
    : null

  return (
    readAccountSetupRequested(metadata) === accountSetupRequested &&
    readOrderNote(metadata) === normalizeOrderNote(orderNote) &&
    JSON.stringify(storedConsent) === JSON.stringify(consent) &&
    JSON.stringify(storedPurchaseAcceptance) ===
      JSON.stringify(purchaseAcceptance)
  )
}
