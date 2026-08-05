import type { AppConfig } from "../config"
import { parsePrNumber, teardownPreviewDatabase } from "../db"
import { jsonResponse, mapHandlerError } from "../http"

interface TeardownPreviewDbDeps {
  config: AppConfig
  sql: Bun.SQL
}

export async function handleTeardownPreviewDb(
  prNumberParam: string,
  deps: TeardownPreviewDbDeps
): Promise<Response> {
  try {
    const prNumber = parsePrNumber(prNumberParam, "pr_number path parameter")
    const result = await teardownPreviewDatabase(
      deps.sql,
      deps.config,
      prNumber
    )

    console.info(
      JSON.stringify({
        active_connections_at_drop: result.activeConnectionsAtDrop,
        app_user: result.appUser,
        db_name: result.dbName,
        deleted: result.deleted,
        dev_grants_cleaned: result.devGrantsCleaned,
        event: "preview-db.teardown",
        noop: result.noop,
        noop_reason: result.noopReason,
        pr_number: prNumber,
        role_deleted: result.roleDeleted,
      })
    )

    return jsonResponse(200, {
      app_user: result.appUser,
      db_name: result.dbName,
      deleted: result.deleted,
      dev_grants_cleaned: result.devGrantsCleaned,
      noop: result.noop,
      noop_reason: result.noopReason,
      role_deleted: result.roleDeleted,
    })
  } catch (error: unknown) {
    return mapHandlerError(error, "teardown-preview-db")
  }
}
