"use client"

import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

export function useClientReady(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false)
}
