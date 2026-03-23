import { mapAuthError } from "@/lib/auth-messages"
import { storefront } from "./storefront-preset"

export type UseLoginOptions = {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

const authHooks = storefront.hooks.auth

export function useLogin(options?: UseLoginOptions) {
  return authHooks.useLogin({
    onSuccess: () => {
      options?.onSuccess?.()
    },
    onError: (error) => {
      options?.onError?.(new Error(mapAuthError(error)))
    },
  })
}
