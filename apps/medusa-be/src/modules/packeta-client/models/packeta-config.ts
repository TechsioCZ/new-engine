import { model } from "@medusajs/framework/utils"

const PacketaConfig = model
  .define("packeta_config", {
    id: model.id().primaryKey(),

    environment: model.text(),

    is_enabled: model.boolean().default(false),

    // Credentials (encrypted)
    api_password: model.text().nullable(),

    // Sender identity
    sender_label: model.text().nullable(),
    eshop_id: model.text().nullable(),

    // Label
    default_label_format: model.text().default("A6"),
    default_label_offset: model.number().default(0),

    // COD banking (encrypted)
    cod_bank_account: model.text().nullable(),
    cod_bank_code: model.text().nullable(),
    cod_iban: model.text().nullable(),
    cod_swift: model.text().nullable(),

    // Fallback sender address (not encrypted)
    sender_name: model.text().nullable(),
    sender_street: model.text().nullable(),
    sender_city: model.text().nullable(),
    sender_zip_code: model.text().nullable(),
    sender_country: model.text().nullable(),
    sender_phone: model.text().nullable(),
    sender_email: model.text().nullable(),
  })
  .indexes([{ on: ["environment"], unique: true, where: { deleted_at: null } }])

export default PacketaConfig
