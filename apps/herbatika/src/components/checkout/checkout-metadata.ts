import {
  type CheckoutConsentSnapshot,
  parseCheckoutConsentSnapshot,
} from "@/lib/storefront/checkout-consent"
import {
  buildAccountSetupRequestedMetadata,
  isRecord,
  readAccountSetupRequested,
} from "./account-setup-metadata"

const ORDER_NOTE_METADATA_KEY = "order_note"

type CheckoutMetadataInput = {
  accountSetupRequested: boolean
  consent: CheckoutConsentSnapshot
  metadata: unknown
  orderNote: unknown
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
}: CheckoutMetadataInput): Record<string, unknown> => ({
  ...buildAccountSetupRequestedMetadata(metadata, accountSetupRequested),
  checkout_consent: consent,
  [ORDER_NOTE_METADATA_KEY]: normalizeOrderNote(orderNote) ?? "",
})

export const isCheckoutMetadataSynced = ({
  accountSetupRequested,
  consent,
  metadata,
  orderNote,
}: CheckoutMetadataInput) => {
  const storedConsent = isRecord(metadata)
    ? parseCheckoutConsentSnapshot(metadata.checkout_consent, {
        market: consent.market,
      })
    : null

  return (
    readAccountSetupRequested(metadata) === accountSetupRequested &&
    readOrderNote(metadata) === normalizeOrderNote(orderNote) &&
    JSON.stringify(storedConsent) === JSON.stringify(consent)
  )
}
