"use client"

import { createSmartSuggestEffectClient } from "@techsio/smart-suggest-client"

const SMART_SUGGEST_API_BASE_URL =
  process.env.NEXT_PUBLIC_SMART_SUGGEST_API_URL?.trim() ||
  "http://localhost:3020/api"

export const herbatikaSmartSuggestClient = createSmartSuggestEffectClient({
  apiBaseUrl: SMART_SUGGEST_API_BASE_URL,
  timeoutMs: 2000,
})
