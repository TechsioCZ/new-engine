import type { PacketaConfigDTO, PacketaConfigResponse } from "./types"

export function toPacketaConfigResponse(
  config: PacketaConfigDTO
): PacketaConfigResponse {
  return {
    id: config.id,
    environment: config.environment,
    is_active: config.is_active,
    is_enabled: config.is_enabled,
    allow_live_operations: config.allow_live_operations,
    api_password_set: !!config.api_password,
    widget_api_key_set: !!config.widget_api_key,
    widget_countries: config.widget_countries,
    sender_label: config.sender_label,
    eshop_id: config.eshop_id,
    default_label_format: config.default_label_format,
    default_label_offset: config.default_label_offset,
    cod_bank_account_set: !!config.cod_bank_account,
    cod_bank_code_set: !!config.cod_bank_code,
    cod_iban_set: !!config.cod_iban,
    cod_swift_set: !!config.cod_swift,
    sender_name: config.sender_name,
    sender_street: config.sender_street,
    sender_city: config.sender_city,
    sender_zip_code: config.sender_zip_code,
    sender_country: config.sender_country,
    sender_phone: config.sender_phone,
    sender_email: config.sender_email,
  }
}
