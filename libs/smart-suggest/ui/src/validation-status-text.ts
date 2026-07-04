import type { ReactNode } from "react"

type ValidationStatusTextResult = {
  errors: readonly { message: ReactNode }[]
}

export const getStatusText = (
  helpText: ReactNode,
  result: ValidationStatusTextResult | undefined,
  statusText: ReactNode
) => {
  if (helpText !== undefined) {
    return helpText
  }

  if (statusText !== undefined) {
    return statusText
  }

  return result?.errors[0]?.message
}
