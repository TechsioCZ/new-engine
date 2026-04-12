"use client"

import { useEffect, useState } from "react"

export function useClientReady(): boolean {
  const [isClientReady, setIsClientReady] = useState(false)

  useEffect(() => {
    setIsClientReady(true)
  }, [])

  return isClientReady
}
