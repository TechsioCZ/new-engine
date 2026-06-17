import { useEffect, useState } from "react"

export const CHECKOUT_ACCOUNT_SETUP_DEBUG_STORAGE_KEY =
  "herbatika_checkout_account_setup_debug"

const DEBUG_PREFIX = "[checkout-account-setup-debug]"

export const isCheckoutAccountSetupDebugEnabled = () => {
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

export const useCheckoutAccountSetupDebugEnabled = () => {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    setEnabled(isCheckoutAccountSetupDebugEnabled())
  }, [])

  return enabled
}

export const logCheckoutAccountSetupDebug = (
  message: string,
  data: Record<string, unknown>
) => {
  if (!isCheckoutAccountSetupDebugEnabled()) {
    return
  }

  console.info(DEBUG_PREFIX, message, data)
}
