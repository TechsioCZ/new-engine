import type { HttpTypes } from "@medusajs/types";
import {
  FLAG_CONFIG,
  type SupportedFlagCode,
} from "./product-card.constants";
import { asBoolean, asRecord } from "./product-card.parsers";
import type { ProductFlagState } from "./product-card.types";

export const resolveFlags = (
  product: HttpTypes.StoreProduct,
  hasDiscount: boolean,
): ProductFlagState[] => {
  const metadata = asRecord(product.metadata);
  const flags = metadata?.flags;

  if (!Array.isArray(flags)) {
    return hasDiscount
      ? [
          {
            label: FLAG_CONFIG.action.label,
            variant: FLAG_CONFIG.action.variant,
          },
        ]
      : [];
  }

  const resolvedFlags: ProductFlagState[] = [];
  const usedCodes = new Set<SupportedFlagCode>();

  for (const flag of flags) {
    const flagRecord = asRecord(flag);
    if (!flagRecord) {
      continue;
    }

    const code = flagRecord.code;
    const active = asBoolean(flagRecord.active);

    if (typeof code !== "string") {
      continue;
    }

    if (!(code in FLAG_CONFIG)) {
      continue;
    }

    const typedCode = code as SupportedFlagCode;
    const isActive =
      typedCode === "action" ? active === true || hasDiscount : active === true;

    if (!isActive || usedCodes.has(typedCode)) {
      continue;
    }

    usedCodes.add(typedCode);
    const config = FLAG_CONFIG[typedCode];

    resolvedFlags.push({
      label: config.label,
      variant: config.variant,
    });
  }

  if (hasDiscount && !usedCodes.has("action")) {
    resolvedFlags.push({
      label: FLAG_CONFIG.action.label,
      variant: FLAG_CONFIG.action.variant,
    });
  }

  return resolvedFlags;
};
