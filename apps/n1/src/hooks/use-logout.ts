import { authHooks } from "./auth-hooks-base"
import { toError } from "@/lib/errors"

export type UseLogoutOptions = {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

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
