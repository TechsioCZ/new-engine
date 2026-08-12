import { model } from "@medusajs/framework/utils"

const GLSConfig = model
  .define("gls_config", {
    id: model.id().primaryKey(),

    environment: model.text(),
    is_active: model.boolean().default(false),
    is_enabled: model.boolean().default(false),

    // MyGLS credentials / account routing
    username: model.text().nullable(),
    password: model.text().nullable(),
    client_number: model.number().nullable(),
    country_code: model.text().default("SK"),
    supported_countries: model.array().default([]),
    webshop_engine: model.text().nullable(),

    // Label printing options accepted by MyGLS PrintLabels
    type_of_printer: model.text().default("A4_2x2"),
    print_position: model.number().default(1),
    hide_phone_number_on_labels: model.boolean().default(false),

    // Pickup/sender address used as MyGLS PickupAddress
    sender_name: model.text().nullable(),
    sender_street: model.text().nullable(),
    sender_house_number: model.text().nullable(),
    sender_house_number_info: model.text().nullable(),
    sender_city: model.text().nullable(),
    sender_zip_code: model.text().nullable(),
    sender_country: model.text().nullable(),
    sender_phone: model.text().nullable(),
    sender_email: model.text().nullable(),
  })
  .checks([
    {
      name: "gls_config_environment_check",
      expression: (columns) =>
        `${columns.environment} in ('testing', 'production')`,
    },
    {
      name: "gls_config_country_code_check",
      expression: (columns) =>
        `${columns.country_code} in ('HR', 'CZ', 'HU', 'RO', 'SI', 'SK', 'RS')`,
    },
    {
      name: "gls_config_printer_type_check",
      expression: (columns) =>
        `${columns.type_of_printer} in ('A4_2x2', 'A4_4x1', 'Connect', 'Thermo', 'ThermoZPL', 'ShipItThermoPdf', 'ThermoZPL_300DPI', 'ShipItThermoZpl')`,
    },
    {
      name: "gls_config_print_position_check",
      expression: (columns) => `${columns.print_position} between 1 and 4`,
    },
  ])
  .indexes([
    { on: ["environment"], unique: true, where: { deleted_at: null } },
    {
      name: "IDX_gls_config_active_unique",
      on: ["is_active"],
      unique: true,
      where: { is_active: true, deleted_at: null },
    },
  ])

export default GLSConfig
