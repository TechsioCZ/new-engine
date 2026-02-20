export const PRODUCT_FALLBACK_IMAGE = "/file.svg";

export const FLAG_CONFIG = {
  action: { label: "Akcia", variant: "discount" },
  new: { label: "Novinka", variant: "success" },
  tip: { label: "Tip", variant: "warning" },
} as const;

export type SupportedFlagCode = keyof typeof FLAG_CONFIG;
