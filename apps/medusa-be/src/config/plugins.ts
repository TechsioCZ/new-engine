import { buildMeilisearchPlugin } from "../modules/meilisearch/medusa-config"
import type { MedusaConfigEnv } from "./env"
import type { MedusaPluginsConfig } from "./types"

export function buildPlugins(env: MedusaConfigEnv): MedusaPluginsConfig {
  const plugins: MedusaPluginsConfig = [
    {
      options: {},
      resolve: "medusa-plugin-content",
    },
    {
      options: {},
      resolve: "@medusajs/draft-order",
    },
    {
      options: {},
      resolve: "medusa-symmy-plugin",
    },
    {
      options: {},
      resolve: "medusa-order-dashboard-plugin",
    },
  ]

  if (env.meilisearchEnabled) {
    plugins.push(buildMeilisearchPlugin(env))
  }

  return plugins
}
