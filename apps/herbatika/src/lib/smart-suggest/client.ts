"use client"

import { createSmartSuggestEffectClient } from "@techsio/smart-suggest-client"

const getSmartSuggestApiBaseUrl = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_SMART_SUGGEST_API_URL?.trim()

  if (configuredUrl) {
    return configuredUrl
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SMART_SUGGEST_API_URL is required in production."
    )
  }

  return "http://localhost:3020/api"
}

const SMART_SUGGEST_API_BASE_URL = getSmartSuggestApiBaseUrl()

export const herbatikaSmartSuggestClient = createSmartSuggestEffectClient({
  apiBaseUrl: SMART_SUGGEST_API_BASE_URL,
  timeoutMs: 2000,
})
