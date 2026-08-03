import { BaseProperty, model } from "@medusajs/framework/utils"

export type SymmyWebhookEndpoint = {
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
    id: model.id().primaryKey(),
    config_key: model.text().default("default"),
    is_enabled: model.boolean().default(false),
    endpoints: new WebhookEndpointsProperty().default([]),
  })
  .indexes([
    {
      on: ["config_key"],
      unique: true,
      where: { deleted_at: null },
    },
  ])

export default SymmyWebhookConfig
