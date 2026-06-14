export type ProductReviewTokenProductStatus =
  | "missing-product-id"
  | "loading"
  | "error"
  | "not-found"
  | "ready";

export const resolveProductStatusMessage = (
  status: ProductReviewTokenProductStatus,
) => {
  switch (status) {
    case "loading":
      return { status: "default" as const, text: "Načítavam produkt." };
    case "error":
      return {
        status: "warning" as const,
        text: "Produkt sa nepodarilo načítať. Recenziu môžete odoslať aj tak.",
      };
    case "not-found":
      return {
        status: "warning" as const,
        text: "Produkt sa nepodarilo nájsť. Skontrolujte prosím odkaz z emailu.",
      };
    default:
      return null;
  }
};
