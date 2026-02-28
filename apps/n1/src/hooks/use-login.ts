import { toError } from "@/lib/errors"
import { authHooks } from "./auth-hooks-base"
export type { LoginCredentials } from "./auth-hooks-base"

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
