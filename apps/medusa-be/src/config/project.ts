import babel from "@rolldown/plugin-babel"
import { reactCompilerPreset } from "@vitejs/plugin-react"
import type { MedusaConfigEnv } from "./env"
import type { MedusaAdminConfig, MedusaProjectConfig } from "./types"

export function buildAdminConfig(env: MedusaConfigEnv): MedusaAdminConfig {
  return {
    disable: env.medusaAdminDisabledForBackendBuild,
    vite: () => ({
      build: {
        cssMinify: false,
        minify: false,
        modulePreload: false,
        reportCompressedSize: false,
        target: "esnext",
      },
      esbuild: {
        target: "esnext",
      },
      plugins: [babel({ presets: [reactCompilerPreset()] })],
      server: {
        allowedHosts: env.adminAllowedHosts,
        hmr: false,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    }),
  }
}

export function buildProjectConfig(env: MedusaConfigEnv): MedusaProjectConfig {
  return {
    databaseUrl: env.databaseUrl,
    databaseSchema: env.databaseSchema,
    http: {
      storeCors: env.storeCors,
      adminCors: env.adminCors,
      authCors: env.authCors,
      jwtSecret: env.jwtSecret,
      cookieSecret: env.cookieSecret,
    },
    cookieOptions: env.cookieOptions,
    ...(env.redisSessionsEnabled
      ? {
          redisUrl: env.redisUrl,
        }
      : {}),
  }
}
