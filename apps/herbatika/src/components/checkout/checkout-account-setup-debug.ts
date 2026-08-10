import { useSyncExternalStore } from "react"

const CHECKOUT_ACCOUNT_SETUP_DEBUG_STORAGE_KEY =
  "herbatika_checkout_account_setup_debug"

const DEBUG_PREFIX = "[checkout-account-setup-debug]"

const isCheckoutAccountSetupDebugEnabled = () => {
  if (typeof window === "undefined") {
    return false
  }

  const params = new URLSearchParams(window.location.search)

  return (
    params.get("debugAccountSetup") === "1" ||
    window.localStorage.getItem(CHECKOUT_ACCOUNT_SETUP_DEBUG_STORAGE_KEY) ===
      "1"
  )
}

const subscribeToDebugPreference = (onStoreChange: () => void) => {
  window.addEventListener("popstate", onStoreChange)
  window.addEventListener("storage", onStoreChange)

  return () => {
    window.removeEventListener("popstate", onStoreChange)
    window.removeEventListener("storage", onStoreChange)
  }
}

export const useCheckoutAccountSetupDebugEnabled = () =>
  useSyncExternalStore(
    subscribeToDebugPreference,
    isCheckoutAccountSetupDebugEnabled,
    () => false,
  )

export const logCheckoutAccountSetupDebug = (message: string, data: object) => {
  if (!isCheckoutAccountSetupDebugEnabled()) {
    return
  }

  console.info(DEBUG_PREFIX, message, data)
}
