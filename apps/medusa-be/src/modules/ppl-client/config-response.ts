import type { PplConfigDTO, PplConfigResponse } from "./types"

export function toPplConfigResponse(config: PplConfigDTO): PplConfigResponse {
  return {
    id: config.id,
    environment: config.environment,
    is_active: config.is_active,
    is_enabled: config.is_enabled,
    client_id: config.client_id,
    client_secret_set: Boolean(config.client_secret),
    widget_api_key_set: Boolean(config.widget_api_key),
    default_label_format: config.default_label_format,
    cod_bank_account_set: Boolean(config.cod_bank_account),
    cod_bank_code_set: Boolean(config.cod_bank_code),
    cod_iban_set: Boolean(config.cod_iban),
    cod_swift_set: Boolean(config.cod_swift),
    sender_name: config.sender_name,
    sender_street: config.sender_street,
    sender_city: config.sender_city,
    sender_zip_code: config.sender_zip_code,
    sender_country: config.sender_country,
    sender_phone: config.sender_phone,
    sender_email: config.sender_email,
  }
}
