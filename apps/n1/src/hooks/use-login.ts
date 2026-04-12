import { mapAuthError } from "@/lib/auth-messages"
import { storefront } from "./storefront-preset"

export type UseLoginOptions = {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useLogin(options?: UseLoginOptions) {
  return storefront.hooks.auth.useLogin({
    onSuccess: () => {
      options?.onSuccess?.()
    },
    onError: (error) => {
      options?.onError?.(new Error(mapAuthError(error)))
    },
  })
}
