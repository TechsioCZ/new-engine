import { enforceBearerToken } from "./auth"
import { loadConfig } from "./config"
import { createDbClient, inspectFileCopyMethod } from "./db"
import { handleApplyZaneEnvOverrides } from "./handlers/apply-zane-env-overrides"
import { handleArchiveZaneEnvironment } from "./handlers/archive-zane-environment"
import { handleCancelZaneDeploy } from "./handlers/cancel-zane-deploy"
import { handleEnsurePreviewDb } from "./handlers/ensure-preview-db"
import { handleHealth } from "./handlers/health"
import { handleReadPreviewCommitState } from "./handlers/read-preview-commit-state"
import { handleResolveZaneEnvironment } from "./handlers/resolve-zane-environment"
import { handleResolveZaneTargets } from "./handlers/resolve-zane-targets"
import { handleRunRuntimeProvider } from "./handlers/run-runtime-provider"
import { handleSyncPreviewRandomOnceSecrets } from "./handlers/sync-preview-random-once-secrets"
import { handleSyncPreviewServiceEnv } from "./handlers/sync-preview-service-env"
import { handleSyncPreviewSharedEnv } from "./handlers/sync-preview-shared-env"
import { handleTeardownPreviewDb } from "./handlers/teardown-preview-db"
import { handleTriggerZaneDeploy } from "./handlers/trigger-zane-deploy"
import { handleVerifyZaneDeploy } from "./handlers/verify-zane-deploy"
import { handleWritePreviewCommitState } from "./handlers/write-preview-commit-state"
import { jsonError, jsonResponse } from "./http"

const config = loadConfig()
const sql = createDbClient(config)

await sql.connect()
const fileCopyMethod = await inspectFileCopyMethod(sql)

if (fileCopyMethod.warning === null) {
  console.info(
    JSON.stringify({
      clone_optimized: fileCopyMethod.cloneOptimized,
      event: "server.startup.file_copy_method",
      file_copy_method: fileCopyMethod.method,
    }),
  )
} else {
  console.warn(
    JSON.stringify({
      clone_optimized: fileCopyMethod.cloneOptimized,
      event: "server.startup.warning",
      file_copy_method: fileCopyMethod.method,
      warning: fileCopyMethod.warning,
    }),
  )
}

type RequestHandler = (request: Request) => Promise<Response>

const postHandlers = new Map<string, RequestHandler>([
  [
    "/v1/preview-db/ensure",
    async (request) => await handleEnsurePreviewDb(request, { config, sql }),
  ],
  [
    "/v1/zane/environments/resolve",
    async (request) => await handleResolveZaneEnvironment(request, { config }),
  ],
  [
    "/v1/zane/environments/archive",
    async (request) => await handleArchiveZaneEnvironment(request, { config }),
  ],
  [
    "/v1/zane/preview-commit-state/read",
    async (request) => await handleReadPreviewCommitState(request, { config }),
  ],
  [
    "/v1/zane/preview-commit-state/write",
    async (request) => await handleWritePreviewCommitState(request, { config }),
  ],
  [
    "/v1/zane/preview-random-once-secrets/sync",
    async (request) =>
      await handleSyncPreviewRandomOnceSecrets(request, { config }),
  ],
  [
    "/v1/zane/preview-shared-env/sync",
    async (request) => await handleSyncPreviewSharedEnv(request, { config }),
  ],
  [
    "/v1/zane/preview-service-env/sync",
    async (request) => await handleSyncPreviewServiceEnv(request, { config }),
  ],
  [
    "/v1/zane/runtime-providers/run",
    async (request) => await handleRunRuntimeProvider(request, { config }),
  ],
  [
    "/v1/zane/deploy/resolve-targets",
    async (request) => await handleResolveZaneTargets(request, { config }),
  ],
  [
    "/v1/zane/deploy/apply-env-overrides",
    async (request) => await handleApplyZaneEnvOverrides(request, { config }),
  ],
  [
    "/v1/zane/deploy/trigger",
    async (request) => await handleTriggerZaneDeploy(request, { config }),
  ],
  [
    "/v1/zane/deploy/cancel",
    async (request) => await handleCancelZaneDeploy(request, { config }),
  ],
  [
    "/v1/zane/deploy/verify",
    async (request) => await handleVerifyZaneDeploy(request, { config }),
  ],
])

const handleRequest = async (request: Request): Promise<Response> => {
  const url = new URL(request.url)

  if (request.method === "GET" && url.pathname === "/healthz") {
    return handleHealth()
  }

  if (request.method === "POST") {
    const handler = postHandlers.get(url.pathname)
    if (handler !== undefined) {
      const authResponse = enforceBearerToken(request, config.apiAuthToken)
      return authResponse ?? (await handler(request))
    }
  }

  const teardownMatch = /^\/v1\/preview-db\/(?<prNumber>[^/]+)\/?$/u.exec(
    url.pathname,
  )
  const { prNumber } = teardownMatch?.groups ?? {}
  if (request.method === "DELETE" && prNumber !== undefined) {
    const authResponse = enforceBearerToken(request, config.apiAuthToken)
    return (
      authResponse ?? (await handleTeardownPreviewDb(prNumber, { config, sql }))
    )
  }

  if (url.pathname.startsWith("/v1/preview-db/")) {
    return jsonError(
      405,
      "method_not_allowed",
      "Method not allowed for this endpoint",
    )
  }

  if (url.pathname.startsWith("/v1/zane/")) {
    return jsonError(
      405,
      "method_not_allowed",
      "Method not allowed for this endpoint",
    )
  }

  return jsonResponse(404, {
    error: "not_found",
    message: "Route not found",
  })
}

const server = Bun.serve({
  error: (error) => {
    console.error(
      JSON.stringify({
        event: "server.error",
        message: error.message,
      }),
    )
    return jsonError(500, "internal_error", "Internal server error")
  },
  fetch: handleRequest,
  idleTimeout: 30,
  port: config.port,
})

console.info(
  JSON.stringify({
    event: "server.started",
    port: config.port,
  }),
)

let shuttingDown = false

const handleShutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  console.info(JSON.stringify({ event: "server.shutdown", signal }))

  let exitCode = 0

  try {
    await server.stop(true)
    await sql.close({ timeout: 10 })
  } catch (error: unknown) {
    exitCode = 1
    const message = error instanceof Error ? error.message : String(error)
    console.error(
      JSON.stringify({
        error: message,
        event: "server.shutdown.error",
        signal,
      }),
    )
  } finally {
    process.exit(exitCode)
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void handleShutdown(signal)
  })
}
