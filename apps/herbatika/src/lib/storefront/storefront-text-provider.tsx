"use client"

import {
  createContext,
  useContext,
  type PropsWithChildren,
} from "react"
import type {
  StorefrontTextKey,
  StorefrontTextMessages,
} from "./storefront-texts"

type StorefrontTextContextValue = {
  messages: StorefrontTextMessages
}

const StorefrontTextContext = createContext<StorefrontTextContextValue | null>(
  null
)

type StorefrontTextProviderProps = PropsWithChildren<{
  messages: StorefrontTextMessages
}>

export function StorefrontTextProvider({
  children,
  messages,
}: StorefrontTextProviderProps) {
  return (
    <StorefrontTextContext.Provider value={{ messages }}>
      {children}
    </StorefrontTextContext.Provider>
  )
}

const useStorefrontTextContext = () => {
  const context = useContext(StorefrontTextContext)

  if (!context) {
    throw new Error("StorefrontTextProvider is required.")
  }

  return context
}

export const useStorefrontTextValue = (key: StorefrontTextKey) => {
  const { messages } = useStorefrontTextContext()
  const value = messages[key]

  return typeof value === "string" && value.trim().length > 0 ? value : null
}

export const useRequiredStorefrontText = (key: StorefrontTextKey) => {
  const value = useStorefrontTextValue(key)

  if (!value) {
    throw new Error(`Missing storefront text: ${key}`)
  }

  return value
}

