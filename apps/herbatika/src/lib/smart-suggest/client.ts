"use client"

import { createSmartSuggestClient } from "@techsio/smart-suggest-client"

const SMART_SUGGEST_API_BASE_URL =
  process.env.NEXT_PUBLIC_SMART_SUGGEST_API_URL?.trim() || "/api"

export const herbatikaSmartSuggestClient = createSmartSuggestClient({
  apiBaseUrl: SMART_SUGGEST_API_BASE_URL,
  timeoutMs: 2_000,
})
