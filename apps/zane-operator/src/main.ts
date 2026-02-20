import { enforceBearerToken } from "./auth"
import { loadConfig } from "./config"
import { createDbClient, inspectFileCopyMethod } from "./db"
import { handleEnsurePreviewDb } from "./handlers/ensure-preview-db"
import { handleHealth } from "./handlers/health"
import { handleTeardownPreviewDb } from "./handlers/teardown-preview-db"
import { jsonError, jsonResponse } from "./http"

const config = loadConfig()
const sql = createDbClient(config)

await sql.connect()
const fileCopyMethod = await inspectFileCopyMethod(sql)

if (fileCopyMethod.warning) {
  console.warn(
    JSON.stringify({
      event: "server.startup.warning",
      warning: fileCopyMethod.warning,
      file_copy_method: fileCopyMethod.method,
      clone_optimized: fileCopyMethod.cloneOptimized,
    }),
  )
} else {
  console.info(
    JSON.stringify({
      event: "server.startup.file_copy_method",
      file_copy_method: fileCopyMethod.method,
      clone_optimized: fileCopyMethod.cloneOptimized,
    }),
  )
}

const server = Bun.serve({
  port: config.port,
  idleTimeout: 30,
  fetch: async (request) => {
    const url = new URL(request.url)

    if (request.method === "GET" && url.pathname === "/healthz") {
      return handleHealth()
    }

    if (request.method === "POST" && url.pathname === "/v1/preview-db/ensure") {
      const authResponse = enforceBearerToken(request, config.apiAuthToken)
      if (authResponse) {
        return authResponse
      }

      return await handleEnsurePreviewDb(request, { config, sql })
    }

    const teardownMatch = /^\/v1\/preview-db\/([^/]+)\/?$/.exec(url.pathname)
    if (request.method === "DELETE" && teardownMatch?.[1]) {
      const authResponse = enforceBearerToken(request, config.apiAuthToken)
      if (authResponse) {
        return authResponse
      }

      return await handleTeardownPreviewDb(teardownMatch[1], { config, sql })
    }

    if (url.pathname.startsWith("/v1/preview-db/")) {
      return jsonError(405, "method_not_allowed", "Method not allowed for this endpoint")
    }

    return jsonResponse(404, {
      error: "not_found",
      message: "Route not found",
    })
  },
  error: (error) => {
    console.error(
      JSON.stringify({
        event: "server.error",
        message: error.message,
      }),
    )
    return jsonError(500, "internal_error", "Internal server error")
  },
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

  server.stop(true)
  await sql.close({ timeout: 5 })
  process.exit(0)
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void handleShutdown(signal)
  })
}
