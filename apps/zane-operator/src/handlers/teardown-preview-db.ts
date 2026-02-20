import type { AppConfig } from "../config"
import { parsePrNumber, teardownPreviewDatabase } from "../db"
import { jsonResponse, mapHandlerError } from "../http"

interface TeardownPreviewDbDeps {
  config: AppConfig
  sql: Bun.SQL
}

export async function handleTeardownPreviewDb(
  prNumberParam: string,
  deps: TeardownPreviewDbDeps,
): Promise<Response> {
  try {
    const prNumber = parsePrNumber(prNumberParam, "pr_number path parameter")
    const result = await teardownPreviewDatabase(deps.sql, deps.config, prNumber)

    console.info(
      JSON.stringify({
        event: "preview-db.teardown",
        pr_number: prNumber,
        db_name: result.dbName,
        deleted: result.deleted,
        app_user: result.appUser,
        role_deleted: result.roleDeleted,
        dev_grants_cleaned: result.devGrantsCleaned,
        noop: result.noop,
        noop_reason: result.noopReason,
        terminated_connections: result.terminatedConnections,
      }),
    )

    return jsonResponse(200, {
      db_name: result.dbName,
      deleted: result.deleted,
      app_user: result.appUser,
      role_deleted: result.roleDeleted,
      dev_grants_cleaned: result.devGrantsCleaned,
      noop: result.noop,
      noop_reason: result.noopReason,
    })
  } catch (error: unknown) {
    return mapHandlerError(error, "teardown-preview-db")
  }
}
