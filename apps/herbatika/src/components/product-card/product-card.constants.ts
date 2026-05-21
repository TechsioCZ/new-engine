export { FALLBACK_IMAGE_SRC as PRODUCT_FALLBACK_IMAGE } from "@/components/fallback-image.constants";

export const FLAG_CONFIG = {
  action: { label: "Akcia", variant: "discount" },
  new: { label: "Novinka", variant: "success" },
  tip: { label: "Tip", variant: "warning" },
} as const;

export type SupportedFlagCode = keyof typeof FLAG_CONFIG;
