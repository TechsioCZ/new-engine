export type ProductPriceState = {
  currentLabel: string;
  originalLabel: string | null;
  currentAmount: number | null;
  originalAmount: number | null;
  currencyCode: string;
};

export type ProductFlagState = {
  label: string;
  variant: "success" | "warning" | "discount";
};

export type TopOfferPriceState = {
  currentAmount: number | null;
  originalAmount: number | null;
  currencyCode: string;
};
