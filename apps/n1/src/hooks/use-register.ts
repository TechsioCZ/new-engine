import { MedusaRegistrationSignInError } from "@techsio/storefront-data/auth/medusa-service"
import { mapAuthError } from "@/lib/auth-messages"
import { storefront } from "./storefront-preset"

export type UseRegisterOptions = {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useRegister(options?: UseRegisterOptions) {
  return storefront.hooks.auth.useRegister({
    onSuccess: () => {
      options?.onSuccess?.()
    },
    onError: (error) => {
      if (error instanceof MedusaRegistrationSignInError) {
        options?.onError?.(error)
        return
      }

      options?.onError?.(new Error(mapAuthError(error)))
    },
  })
}
