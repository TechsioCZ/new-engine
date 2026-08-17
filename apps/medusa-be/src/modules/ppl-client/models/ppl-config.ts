import { model } from "@medusajs/framework/utils"

const PplConfig = model
  .define("ppl_config", {
    id: model.id().primaryKey(),

    environment: model.text(),
    is_active: model.boolean().default(false),

    is_enabled: model.boolean().default(false),
    client_id: model.text().nullable(),
    client_secret: model.text().nullable(),
    widget_api_key: model.text().nullable(),
    default_label_format: model.text().default("Png"),
    cod_bank_account: model.text().nullable(),
    cod_bank_code: model.text().nullable(),
    cod_iban: model.text().nullable(),
    cod_swift: model.text().nullable(),

    sender_name: model.text().nullable(),
    sender_street: model.text().nullable(),
    sender_city: model.text().nullable(),
    sender_zip_code: model.text().nullable(),
    sender_country: model.text().nullable(),
    sender_phone: model.text().nullable(),
    sender_email: model.text().nullable(),
  })
  .indexes([
    { on: ["environment"], unique: true, where: { deleted_at: null } },
    {
      name: "IDX_ppl_config_active_unique",
      on: ["is_active"],
      unique: true,
      where: { is_active: true, deleted_at: null },
    },
  ])

export default PplConfig
