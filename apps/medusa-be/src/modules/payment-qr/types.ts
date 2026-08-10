export interface QrPaymentConfigDTO {
  id: string
  iban?: string | null
}

export interface QrPaymentConfigResponse {
  id: string
  iban: string | null
}

export interface UpdateQrPaymentConfigInput {
  iban?: string | null
}
