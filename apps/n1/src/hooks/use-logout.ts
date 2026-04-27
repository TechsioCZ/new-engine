import { toError } from "@/lib/errors"
import { storefront } from "./storefront-preset"

export type UseLogoutOptions = {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useLogout(options?: UseLogoutOptions) {
  return storefront.hooks.auth.useLogout({
    onSuccess: () => {
      options?.onSuccess?.()
    },
    onError: (error) => {
      options?.onError?.(toError(error, "Nepodařilo se odhlásit"))
    },
  })
}
