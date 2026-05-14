import { model } from "@medusajs/framework/utils"

const SymmyWebhookConfig = model
  .define("symmy_webhook_config", {
    id: model.id().primaryKey(),
    config_key: model.text().default("default"),
    is_enabled: model.boolean().default(false),
    endpoints: model.json().default([] as unknown as Record<string, unknown>),
  })
  .indexes([
    {
      on: ["config_key"],
      unique: true,
      where: { deleted_at: null },
    },
  ])

export default SymmyWebhookConfig
