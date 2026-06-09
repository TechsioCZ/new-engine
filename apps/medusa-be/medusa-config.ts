import { defineConfig, loadEnv } from "@medusajs/framework/utils"
import type { InputConfigWithArrayModules } from "@medusajs/types"
import { readMedusaConfigEnv } from "./src/config/env"
import { buildModules } from "./src/config/modules"
import { buildPlugins } from "./src/config/plugins"
import { buildAdminConfig, buildProjectConfig } from "./src/config/project"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const env = readMedusaConfigEnv(process.env)

const config = {
  featureFlags: {
    index_engine: true,
    translation: true,
    caching: true,
    backend_hmr: true,
  },
  admin: buildAdminConfig(env),
  projectConfig: buildProjectConfig(env),
  plugins: buildPlugins(env),
  modules: buildModules(env),
} satisfies InputConfigWithArrayModules

module.exports = defineConfig(config)
