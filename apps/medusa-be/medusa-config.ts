import type { InputConfigWithArrayModules } from "@medusajs/framework/types"
import { defineConfig, loadEnv } from "@medusajs/framework/utils"

import { readMedusaConfigEnv } from "./src/config/env"
import { buildModules } from "./src/config/modules"
import { buildPlugins } from "./src/config/plugins"
import { buildAdminConfig, buildProjectConfig } from "./src/config/project"

loadEnv(process.env["NODE_ENV"] || "development", process.cwd())

const env = readMedusaConfigEnv(process.env)

const config = {
  admin: buildAdminConfig(env),
  featureFlags: {
    backend_hmr: true,
    caching: true,
    index_engine: true,
    translation: true,
  },
  modules: buildModules(env),
  plugins: buildPlugins(env),
  projectConfig: buildProjectConfig(env),
} satisfies InputConfigWithArrayModules

module.exports = defineConfig(config)
