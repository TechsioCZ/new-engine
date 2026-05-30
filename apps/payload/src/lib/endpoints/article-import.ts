import { randomUUID } from "node:crypto"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { APIError, type Endpoint } from "payload"

import {
  type ArticleImportOptions,
  type ImportStatus,
  runImportFromFile,
  STATUS_VALUES,
} from "../../scripts/import-articles"
import { buildJsonResponse } from "../utils/endpoint"

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

type ImportFormData = {
  file: File
  locale?: string
  sheetName?: string
  status?: string
  dryRun?: boolean
  translate?: boolean
  overwrite?: boolean
}

type ArticleImportRequest = Parameters<Endpoint["handler"]>[0]

const parseBoolean = (value: string | null | undefined) =>
  typeof value === "string" &&
  ["1", "true", "yes", "on"].includes(value.toLowerCase())

const parseImportStatus = (value?: string): ImportStatus | undefined => {
  if (!value) {
    return
  }

  const normalized = value.trim().toLowerCase()
  if (!STATUS_VALUES.includes(normalized as ImportStatus)) {
    throw new APIError(
      `Invalid status ${value}. Supported values: ${STATUS_VALUES.join(", ")}`,
      400
    )
  }

  return normalized as ImportStatus
}

const parseFormString = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : undefined

const parseFormData = (formData: FormData): ImportFormData => {
  const file = formData.get("file")
  if (!(file instanceof File)) {
    throw new APIError("Missing required XLSX file", 400)
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new APIError(`Upload exceeds ${MAX_UPLOAD_BYTES} bytes limit`, 413)
  }

  const locale = parseFormString(formData.get("locale"))
  const sheetName = parseFormString(formData.get("sheetName"))
  const statusRaw = parseFormString(formData.get("status"))
  const dryRun = parseBoolean(parseFormString(formData.get("dryRun")))
  const translate = parseBoolean(parseFormString(formData.get("translate")))
  const overwrite = parseBoolean(parseFormString(formData.get("overwrite")))

  return {
    file,
    locale,
    sheetName,
    status: statusRaw,
    dryRun,
    translate,
    overwrite,
  }
}

const writeUploadToTempFile = async (file: File) => {
  const extension = path.extname(file.name || "").toLowerCase()
  if (extension !== ".xlsx") {
    throw new APIError("Only .xlsx files are allowed", 400)
  }

  const safeName = (file.name || "upload.xlsx").replace(/[^a-zA-Z0-9._-]/g, "_")
  const dir = await mkdtemp(path.join(tmpdir(), "payload-import-"))
  const filePath = path.join(dir, `${randomUUID()}-${safeName}`)

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filePath, buffer)

  return { dir, filePath }
}

const resolveLocale = (
  supportedLocales: string[] | undefined,
  value?: string
) => {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) {
    return
  }

  if (!supportedLocales || supportedLocales.length === 0) {
    return
  }

  if (normalized === "all") {
    return "all"
  }

  return supportedLocales.includes(normalized) ? normalized : undefined
}

const isAuthorized = (req: ArticleImportRequest) => {
  const roles = (req.user as { roles?: unknown } | null | undefined)?.roles
  if (Array.isArray(roles) && roles.includes("admin")) {
    return true
  }

  const apiKey = process.env.PAYLOAD_API_KEY
  return Boolean(apiKey && req.headers.get("x-payload-api-key") === apiKey)
}

const isImportInputError = (error: Error) =>
  error.message === "XLSX file does not contain any sheets" ||
  error.message === "No rows found in XLSX file" ||
  error.message.startsWith("Sheet not found:") ||
  error.message.startsWith("Missing required columns:")

const readImportFormData = async (req: ArticleImportRequest) => {
  if (!req.formData) {
    throw new APIError("Form data parsing is not available", 400)
  }

  return parseFormData(await req.formData())
}

const resolveImportLocale = (req: ArticleImportRequest, value?: string) => {
  const localization = req.payload.config.localization
  const supportedLocales =
    localization === false ? undefined : localization?.localeCodes
  const locale =
    resolveLocale(supportedLocales, value) ??
    (localization === false ? undefined : localization.defaultLocale)

  if (value && !locale) {
    throw new APIError(
      `Invalid locale ${value}. Supported values: ${supportedLocales?.join(", ")}`,
      400
    )
  }

  return locale
}

/** Endpoint for uploading XLSX and importing articles through Payload admin. */
export const articleImportEndpoint: Endpoint = {
  path: "/article-import",
  method: "post",
  handler: async (req) => {
    if (!isAuthorized(req)) {
      throw new APIError("Unauthorized", 401)
    }

    const payload = await readImportFormData(req)
    const locale = resolveImportLocale(req, payload.locale)
    const status = parseImportStatus(payload.status)
    const importOptions: ArticleImportOptions = {
      filePath: "",
      sheetName: payload.sheetName,
      dryRun: payload.dryRun,
      locale,
      status,
      translate: payload.translate,
      overwrite: payload.overwrite,
    }

    let tempDir = ""
    try {
      const uploaded = await writeUploadToTempFile(payload.file)
      tempDir = uploaded.dir
      importOptions.filePath = uploaded.filePath

      const result = await runImportFromFile(importOptions)

      return buildJsonResponse(req, {
        ok: true,
        result: {
          total: result.total,
          imported: result.imported,
          skipped: result.skipped,
        },
      })
    } catch (error) {
      if (error instanceof APIError && error.status < 500) {
        throw error
      }

      if (error instanceof Error && isImportInputError(error)) {
        throw new APIError(error.message, 400)
      }

      if (error instanceof Error) {
        console.error(error)
      }

      throw new APIError("Import failed", 500)
    } finally {
      if (tempDir) {
        await rm(tempDir, { recursive: true, force: true })
      }
    }
  },
}
