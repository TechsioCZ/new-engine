import type { useTranslations } from "next-intl"

import {
  formatProviderLabel,
  resolvePaymentDisplayTextKeys,
} from "./checkout-display.utils"

type CheckoutTranslator = ReturnType<typeof useTranslations<"checkout">>

export const resolveSelectedPaymentLabel = ({
  providerId,
  translate,
}: {
  providerId: string | null | undefined
  translate: CheckoutTranslator
}) => {
  if (
    providerId === undefined ||
    providerId === null ||
    providerId.length === 0
  ) {
    return null
  }

  const displayTextKeys = resolvePaymentDisplayTextKeys(providerId)
  if (
    displayTextKeys.summaryLabelKey === undefined ||
    displayTextKeys.summaryLabelKey.length === 0
  ) {
    return displayTextKeys.providerName ?? formatProviderLabel(providerId)
  }
  if (
    displayTextKeys.providerName === undefined ||
    displayTextKeys.providerName.length === 0
  ) {
    return translate(displayTextKeys.summaryLabelKey)
  }
  return translate(displayTextKeys.summaryLabelKey, {
    providerName: displayTextKeys.providerName,
  })
}
