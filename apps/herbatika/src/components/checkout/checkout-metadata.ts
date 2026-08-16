import {
  buildAccountSetupRequestedMetadata,
  isRecord,
  readAccountSetupRequested,
} from "./account-setup-metadata"

const ORDER_NOTE_METADATA_KEY = "order_note"

type CheckoutMetadataInput = {
  accountSetupRequested: boolean
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
  metadata,
  orderNote,
}: CheckoutMetadataInput): Record<string, unknown> => ({
  ...buildAccountSetupRequestedMetadata(metadata, accountSetupRequested),
  [ORDER_NOTE_METADATA_KEY]: normalizeOrderNote(orderNote) ?? "",
})

export const isCheckoutMetadataSynced = ({
  accountSetupRequested,
  metadata,
  orderNote,
}: CheckoutMetadataInput) =>
  readAccountSetupRequested(metadata) === accountSetupRequested &&
  readOrderNote(metadata) === normalizeOrderNote(orderNote)
