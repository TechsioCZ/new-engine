"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"

export function useClaimRequest() {
  const t = useTranslations("claims")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError("")
    try {
      await action()
    } catch (caught) {
      console.error("Claim form request failed", caught)
      setError(caught instanceof Error ? caught.message : t("generic_error"))
    } finally {
      setBusy(false)
    }
  }

  return { busy, error, run, setError }
}
