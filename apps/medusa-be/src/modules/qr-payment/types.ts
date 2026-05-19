export type QrPaymentConfigDTO = {
  id: string
  iban?: string | null
}

export type QrPaymentConfigResponse = {
  id: string
  iban: string | null
}

export type UpdateQrPaymentConfigInput = {
  iban?: string | null
}
