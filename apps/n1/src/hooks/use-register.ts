import { toError } from "@/lib/errors"
import { storefront } from "./storefront-preset"

export type UseRegisterOptions = {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

const authHooks = storefront.hooks.auth

export function useRegister(options?: UseRegisterOptions) {
  return authHooks.useRegister({
    onSuccess: () => {
      options?.onSuccess?.()
    },
    onError: (error) => {
      options?.onError?.(toError(error, "Registrace se nepodařila"))
    },
  })
}
