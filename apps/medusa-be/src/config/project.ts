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
      server: {
        ...(env.adminAllowedHosts === undefined
          ? {}
          : { allowedHosts: env.adminAllowedHosts }),
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
    ...(env.databaseUrl ? { databaseUrl: env.databaseUrl } : {}),
    databaseSchema: env.databaseSchema,
    http: {
      storeCors: env.storeCors,
      adminCors: env.adminCors,
      authCors: env.authCors,
      ...(env.jwtSecret ? { jwtSecret: env.jwtSecret } : {}),
      ...(env.cookieSecret ? { cookieSecret: env.cookieSecret } : {}),
    },
    cookieOptions: env.cookieOptions,
    ...(env.redisSessionsEnabled && env.redisUrl
      ? {
          redisUrl: env.redisUrl,
        }
      : {}),
  }
}
