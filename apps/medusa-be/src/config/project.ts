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
        headers: {
          "Cache-Control": "no-store",
        },
        hmr: false,
      },
    }),
  }
}

export function buildProjectConfig(env: MedusaConfigEnv): MedusaProjectConfig {
  return {
    ...(env.databaseUrl ? { databaseUrl: env.databaseUrl } : {}),
    cookieOptions: env.cookieOptions,
    databaseSchema: env.databaseSchema,
    http: {
      adminCors: env.adminCors,
      authCors: env.authCors,
      storeCors: env.storeCors,
      ...(env.jwtSecret ? { jwtSecret: env.jwtSecret } : {}),
      ...(env.cookieSecret ? { cookieSecret: env.cookieSecret } : {}),
    },
    ...(env.redisSessionsEnabled && env.redisUrl
      ? {
          redisUrl: env.redisUrl,
        }
      : {}),
  }
}
