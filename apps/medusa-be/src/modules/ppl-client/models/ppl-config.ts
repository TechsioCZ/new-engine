import { model } from "@medusajs/framework/utils"

const PplConfig = model
  .define("ppl_config", {
    client_id: model.text().nullable(),
    client_secret: model.text().nullable(),
    cod_bank_account: model.text().nullable(),
    cod_bank_code: model.text().nullable(),
    cod_iban: model.text().nullable(),
    cod_swift: model.text().nullable(),
    default_label_format: model.text().default("Png"),
    environment: model.text(),
    id: model.id().primaryKey(),
    is_enabled: model.boolean().default(false),
    sender_city: model.text().nullable(),
    sender_country: model.text().nullable(),
    sender_email: model.text().nullable(),
    sender_name: model.text().nullable(),
    sender_phone: model.text().nullable(),
    sender_street: model.text().nullable(),
    sender_zip_code: model.text().nullable(),
  })
  .indexes([
    // One config per environment (exclude soft-deleted records)
    { on: ["environment"], unique: true, where: { deleted_at: null } },
  ])

export default PplConfig
