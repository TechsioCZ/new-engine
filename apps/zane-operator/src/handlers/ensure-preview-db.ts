import type { AppConfig } from "../config"
import { BadRequestError, ensurePreviewDatabase, parsePrNumber } from "../db"
import { jsonResponse, mapHandlerError } from "../http"

interface EnsurePreviewDbDeps {
  config: AppConfig
  sql: Bun.SQL
}

interface EnsurePreviewDbPayload {
  pr_number: unknown
}

function parsePayload(rawPayload: unknown): EnsurePreviewDbPayload {
  if (
    !rawPayload ||
    typeof rawPayload !== "object" ||
    Array.isArray(rawPayload)
  ) {
    throw new BadRequestError("request body must be a JSON object")
  }

  const payload = rawPayload as Record<string, unknown>
  if (!("pr_number" in payload)) {
    throw new BadRequestError("request body is missing pr_number")
  }

  if ("template_db" in payload) {
    throw new BadRequestError("template_db override is disabled")
  }

  if ("owner" in payload) {
    throw new BadRequestError("owner override is disabled")
  }

  return {
    pr_number: payload.pr_number,
  }
}

export async function handleEnsurePreviewDb(
  request: Request,
  deps: EnsurePreviewDbDeps,
): Promise<Response> {
  try {
    const rawBody = await request.json().catch(() => {
      throw new BadRequestError("request body must be valid JSON")
    })

    const payload = parsePayload(rawBody)
    const prNumber = parsePrNumber(payload.pr_number)
    const templateDatabase = deps.config.defaultTemplateName
    const owner = deps.config.previewOwner

    const result = await ensurePreviewDatabase(deps.sql, deps.config, {
      owner,
      prNumber,
      templateDatabase,
    })

    console.info(
      JSON.stringify({
        app_user: result.appUser,
        created: result.created,
        db_name: result.dbName,
        event: "preview-db.ensure",
        owner,
        pr_number: prNumber,
        template_db: templateDatabase,
      }),
    )

    return jsonResponse(200, {
      app_password: result.appPassword,
      app_user: result.appUser,
      created: result.created,
      db_name: result.dbName,
    })
  } catch (error: unknown) {
    return mapHandlerError(error, "ensure-preview-db")
  }
}
