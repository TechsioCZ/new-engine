import { toError } from "@/lib/errors"
import { storefront } from "./storefront-preset"

export type UseLogoutOptions = {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

const authHooks = storefront.hooks.auth

export function useLogout(options?: UseLogoutOptions) {
  return authHooks.useLogout({
    onSuccess: () => {
      options?.onSuccess?.()
    },
    onError: (error) => {
      options?.onError?.(toError(error, "Logout failed"))
    },
  })
}
