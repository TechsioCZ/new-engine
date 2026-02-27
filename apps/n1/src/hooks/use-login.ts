import { authHooks, type LoginCredentials } from "./auth-hooks-base"
import { toError } from "@/lib/errors"

export type UseLoginOptions = {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

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

export type { LoginCredentials }
