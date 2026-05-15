import { type BaseProperty, model } from "@medusajs/framework/utils"

export type SymmyWebhookEndpoint = {
  url: string
  enabled: boolean
}

const endpointsProperty = model.json() as unknown as BaseProperty<
  SymmyWebhookEndpoint[]
>

const SymmyWebhookConfig = model
  .define("symmy_webhook_config", {
    id: model.id().primaryKey(),
    config_key: model.text().default("default"),
    is_enabled: model.boolean().default(false),
    endpoints: endpointsProperty.default([]),
  })
  .indexes([
    {
      on: ["config_key"],
      unique: true,
      where: { deleted_at: null },
    },
  ])

export default SymmyWebhookConfig
