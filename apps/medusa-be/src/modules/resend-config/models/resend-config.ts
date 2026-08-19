import { model } from "@medusajs/framework/utils"

const ResendConfig = model
  .define("resend_config", {
    id: model.id().primaryKey(),
    configuration_key: model.text().default("default"),
    api_store_id: model.text().nullable(),
    api_url: model.text().default("https://api.resend.com"),
    is_enabled: model.boolean().default(false),
    from_email: model.text().nullable(),
    webhook_secret: model.text().nullable(),
    request_timeout_ms: model.number().default(10_000),
    template_mappings: model.json().default({}),
    product_review_request_delay_minutes: model.number().default(10_080),
  })
  .indexes([
    {
      name: "IDX_resend_config_configuration_key_unique",
      on: ["configuration_key"],
      unique: true,
      where: { deleted_at: null },
    },
  ])

export default ResendConfig
