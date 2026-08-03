import { FALLBACK_IMAGE_SRC } from "@/components/fallback-image.constants"

export const PRODUCT_FALLBACK_IMAGE = FALLBACK_IMAGE_SRC

export const FLAG_CONFIG = {
  action: { variant: "discount" },
  new: { variant: "success" },
  tip: { variant: "warning" },
} as const

export type SupportedFlagCode = keyof typeof FLAG_CONFIG
