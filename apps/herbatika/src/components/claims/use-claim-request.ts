"use client"

import { useState } from "react"

export function useClaimRequest() {
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError("")
    try {
      await action()
    } catch (caught) {
      console.error("Claim form request failed", caught)
      setError(
        caught instanceof Error
          ? caught.message
          : "Požiadavku sa nepodarilo spracovať. Skúste to znova."
      )
    } finally {
      setBusy(false)
    }
  }

  return { busy, error, run, setError }
}
