import { z } from "zod"

import type { AppConfig } from "../config"
import { BadRequestError, ensurePreviewDatabase, parsePrNumber } from "../db"
import { jsonResponse, mapHandlerError } from "../http"

interface EnsurePreviewDbDeps {
  config: AppConfig
  sql: Bun.SQL
}

const prNumberSchema = z
  .union([z.number(), z.string().regex(/^\d+$/u)])
  .transform((value) => parsePrNumber(value))

const ensurePreviewDbPayloadSchema = z.object({
  owner: z.never().optional(),
  pr_number: prNumberSchema,
  template_db: z.never().optional(),
})

const parsePayload = (rawPayload: unknown): number => {
  if (
    typeof rawPayload !== "object" ||
    rawPayload === null ||
    Array.isArray(rawPayload)
  ) {
    throw new BadRequestError("request body must be a JSON object")
  }
  if (!("pr_number" in rawPayload)) {
    throw new BadRequestError("request body is missing pr_number")
  }
  if ("template_db" in rawPayload) {
    throw new BadRequestError("template_db override is disabled")
  }
  if ("owner" in rawPayload) {
    throw new BadRequestError("owner override is disabled")
  }

  const result = ensurePreviewDbPayloadSchema.safeParse(rawPayload)
  if (!result.success) {
    throw new BadRequestError("pr_number must be a positive integer")
  }
  return result.data.pr_number
}

export const handleEnsurePreviewDb = async (
  request: Request,
  deps: EnsurePreviewDbDeps,
): Promise<Response> => {
  try {
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      throw new BadRequestError("request body must be valid JSON")
    }

    const prNumber = parsePayload(rawBody)
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
