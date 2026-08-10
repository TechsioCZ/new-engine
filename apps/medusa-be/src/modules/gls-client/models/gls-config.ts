import { model } from "@medusajs/framework/utils"

const GLSConfig = model
  .define("gls_config", {
    client_number: model.number().nullable(),
    country_code: model.text().default("SK"),
    environment: model.text(),
    hide_phone_number_on_labels: model.boolean().default(false),
    id: model.id().primaryKey(),
    is_enabled: model.boolean().default(false),
    password: model.text().nullable(),
    print_position: model.number().default(1),
    sender_city: model.text().nullable(),
    sender_country: model.text().nullable(),
    sender_email: model.text().nullable(),
    sender_house_number: model.text().nullable(),
    sender_house_number_info: model.text().nullable(),
    sender_name: model.text().nullable(),
    sender_phone: model.text().nullable(),
    sender_street: model.text().nullable(),
    sender_zip_code: model.text().nullable(),
    type_of_printer: model.text().default("A4_2x2"),
    username: model.text().nullable(),
    webshop_engine: model.text().nullable(),
  })
  .checks([
    {
      expression: (columns) =>
        `${columns.environment} in ('testing', 'production')`,
      name: "gls_config_environment_check",
    },
    {
      expression: (columns) =>
        `${columns.country_code} in ('HR', 'CZ', 'HU', 'RO', 'SI', 'SK', 'RS')`,
      name: "gls_config_country_code_check",
    },
    {
      expression: (columns) =>
        `${columns.type_of_printer} in ('A4_2x2', 'A4_4x1', 'Connect', 'Thermo', 'ThermoZPL', 'ShipItThermoPdf', 'ThermoZPL_300DPI', 'ShipItThermoZpl')`,
      name: "gls_config_printer_type_check",
    },
    {
      expression: (columns) => `${columns.print_position} between 1 and 4`,
      name: "gls_config_print_position_check",
    },
  ])
  .indexes([{ on: ["environment"], unique: true, where: { deleted_at: null } }])

export default GLSConfig
