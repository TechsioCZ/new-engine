import { toError } from "@/lib/errors"
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
      options?.onError?.(toError(error, "Login failed"))
    },
  })
}
