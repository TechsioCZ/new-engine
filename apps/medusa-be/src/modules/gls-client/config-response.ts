import type { GLSConfigDTO, GLSConfigResponse } from "./types"

export function toGLSConfigResponse(config: GLSConfigDTO): GLSConfigResponse {
  return {
    id: config.id,
    environment: config.environment,
    is_active: config.is_active,
    is_enabled: config.is_enabled,
    username: config.username,
    password_set: !!config.password,
    client_number: config.client_number,
    country_code: config.country_code,
    supported_countries: config.supported_countries,
    type_of_printer: config.type_of_printer,
    print_position: config.print_position,
    hide_phone_number_on_labels: config.hide_phone_number_on_labels,
    sender_name: config.sender_name,
    sender_street: config.sender_street,
    sender_house_number: config.sender_house_number,
    sender_house_number_info: config.sender_house_number_info,
    sender_city: config.sender_city,
    sender_zip_code: config.sender_zip_code,
    sender_country: config.sender_country,
    sender_phone: config.sender_phone,
    sender_email: config.sender_email,
  }
}
