import type { MedusaConfigEnv } from "./env"
import type { MedusaAdminConfig, MedusaProjectConfig } from "./types"

export const buildAdminConfig = (env: MedusaConfigEnv): MedusaAdminConfig => ({
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
})

export const buildProjectConfig = (
  env: MedusaConfigEnv,
): MedusaProjectConfig => ({
  ...(env.databaseUrl === undefined || env.databaseUrl === ""
    ? {}
    : { databaseUrl: env.databaseUrl }),
  cookieOptions: env.cookieOptions,
  databaseSchema: env.databaseSchema,
  http: {
    adminCors: env.adminCors,
    authCors: env.authCors,
    storeCors: env.storeCors,
    ...(env.jwtSecret === undefined || env.jwtSecret === ""
      ? {}
      : { jwtSecret: env.jwtSecret }),
    ...(env.cookieSecret === undefined || env.cookieSecret === ""
      ? {}
      : { cookieSecret: env.cookieSecret }),
  },
  ...(env.redisSessionsEnabled &&
  env.redisUrl !== undefined &&
  env.redisUrl !== ""
    ? { redisUrl: env.redisUrl }
    : {}),
})
