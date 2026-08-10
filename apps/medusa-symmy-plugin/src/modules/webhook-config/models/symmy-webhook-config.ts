import { BaseProperty, model } from "@medusajs/framework/utils"

export interface SymmyWebhookEndpoint {
  url: string
  enabled: boolean
}

export class WebhookEndpointsProperty extends BaseProperty<
  SymmyWebhookEndpoint[]
> {
  dataType = { name: "json" } as const
}

const SymmyWebhookConfig = model
  .define("symmy_webhook_config", {
    config_key: model.text().default("default"),
    endpoints: new WebhookEndpointsProperty().default([]),
    id: model.id().primaryKey(),
    is_enabled: model.boolean().default(false),
  })
  .indexes([
    {
      on: ["config_key"],
      unique: true,
      where: { deleted_at: null },
    },
  ])

export default SymmyWebhookConfig
