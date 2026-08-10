import type { useAppToast } from "@/hooks/use-app-toast"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"

const MISSING_VARIANT_ERROR_PATTERN = /has no variant selected|no variant/iu

export interface ListCartErrorMessages {
  addListFailed: string
  allAvailableFailed: string
  missingVariant: string
  partiallyAvailableFailed: string
}

export const resolveListCartErrorMessage = (
  error: unknown,
  messages: ListCartErrorMessages,
) => {
  const errorMessage = resolveErrorMessage(error, messages.addListFailed)
  return MISSING_VARIANT_ERROR_PATTERN.test(errorMessage)
    ? messages.missingVariant
    : errorMessage
}

export const showPartialListCartResult = ({
  failedCount,
  messages,
  toast,
  totalCount,
}: {
  failedCount: number
  messages: ListCartErrorMessages
  toast: ReturnType<typeof useAppToast>
  totalCount: number
}) => {
  if (failedCount === 0) {
    return
  }
  if (failedCount === totalCount) {
    toast.error({ title: messages.allAvailableFailed })
    return
  }
  toast.warning({ title: messages.partiallyAvailableFailed })
}
