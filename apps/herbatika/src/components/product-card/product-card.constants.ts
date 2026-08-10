export { FALLBACK_IMAGE_SRC as PRODUCT_FALLBACK_IMAGE } from "@/components/fallback-image.constants"

export const FLAG_CONFIG = {
  action: { variant: "discount" },
  new: { variant: "success" },
  tip: { variant: "warning" },
} as const

export type SupportedFlagCode = keyof typeof FLAG_CONFIG
