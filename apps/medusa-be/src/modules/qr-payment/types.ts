export type QrPaymentConfigDTO = {
  id: string
  environment: string
  iban?: string | null
}

export type QrPaymentConfigResponse = {
  id: string
  environment: string
  iban: string | null
}

export type UpdateQrPaymentConfigInput = {
  iban?: string | null
}
