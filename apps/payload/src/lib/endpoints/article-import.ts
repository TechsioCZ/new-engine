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

type ImportFormData = {
  file: File
  locale?: string
  sheetName?: string
  status?: string
  dryRun?: boolean
  translate?: boolean
  overwrite?: boolean
}

const parseBoolean = (value: string | null | undefined) =>
  typeof value === "string" &&
  ["1", "true", "yes", "on"].includes(value.toLowerCase())

const parseImportStatus = (
  value?: string,
  statusRaw?: string
): ImportStatus | undefined => {
  if (!value) {
    return
  }

  const normalized = value.trim().toLowerCase()
  if (!STATUS_VALUES.includes(normalized as ImportStatus)) {
    throw new APIError(
      `Invalid status ${statusRaw}. Supported values: ${STATUS_VALUES.join(", ")}`,
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

const isAuthorized = (req: Parameters<Endpoint["handler"]>[0]) => {
  if (req.user) {
    return true
  }

  const apiKey = process.env.PAYLOAD_API_KEY
  return Boolean(apiKey && req.headers.get("x-payload-api-key") === apiKey)
}

/** Endpoint for uploading XLSX and importing articles through Payload admin. */
export const articleImportEndpoint: Endpoint = {
  path: "/article-import",
  method: "post",
  handler: async (req) => {
    if (!isAuthorized(req)) {
      throw new APIError("Unauthorized", 401)
    }

    if (!req.formData) {
      throw new APIError("Form data parsing is not available", 400)
    }

    const formData = await req.formData()
    const payload = parseFormData(formData)

    const localization = req.payload.config.localization
    const supportedLocales =
      localization === false ? undefined : localization?.localeCodes
    const locale =
      resolveLocale(supportedLocales, payload.locale) ??
      (localization === false ? undefined : localization.defaultLocale)

    if (payload.locale && !locale) {
      throw new APIError(
        `Invalid locale ${payload.locale}. Supported values: ${supportedLocales?.join(", ")}`,
        400
      )
    }

    const status = parseImportStatus(payload.status, payload.status)
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
        result,
      })
    } catch (error) {
      if (error instanceof APIError) {
        throw error
      }

      if (error instanceof Error) {
        throw new APIError(error.message, 500)
      }

      throw new APIError("Import failed", 500)
    } finally {
      if (tempDir) {
        await rm(tempDir, { recursive: true, force: true })
      }
    }
  },
}
