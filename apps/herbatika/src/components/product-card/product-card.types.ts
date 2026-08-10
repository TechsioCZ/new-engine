export interface ProductPriceState {
  currentLabel: string
  originalLabel: string | null
  currentAmount: number | null
  originalAmount: number | null
  currencyCode: string
}

export interface ProductFlagState {
  label: string
  variant: "success" | "warning" | "discount"
}
