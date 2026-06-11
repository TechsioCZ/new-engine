import { FALLBACK_IMAGE_SRC } from "@/components/fallback-image.constants"

export const PRODUCT_FALLBACK_IMAGE = FALLBACK_IMAGE_SRC

export const FLAG_CONFIG = {
  action: { label: "Akcia", variant: "discount" },
  new: { label: "Novinka", variant: "success" },
  tip: { label: "Tip", variant: "warning" },
} as const

export type SupportedFlagCode = keyof typeof FLAG_CONFIG
