import { authHooks, type RegisterData } from "./auth-hooks-base"
import { toError } from "@/lib/errors"

export type UseRegisterOptions = {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useRegister(options?: UseRegisterOptions) {
  return authHooks.useRegister({
    onSuccess: () => {
      options?.onSuccess?.()
    },
    onError: (error) => {
      options?.onError?.(toError(error, "Registration failed"))
    },
  })
}

export type { RegisterData }
