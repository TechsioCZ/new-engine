import { normalizeMultiValueInput } from "./utils"

const SUPPORTED_STATUS_FILTER_IDS = new Set([
  "in-stock",
  "action",
  "new",
  "tip",
  "vegan",
])

export const isCatalogStatusFilterSupported = (id: string): boolean =>
  SUPPORTED_STATUS_FILTER_IDS.has(id)

export const normalizeStatusFilterInput = (values: string[]): string[] =>
  normalizeMultiValueInput(values).filter(isCatalogStatusFilterSupported)
