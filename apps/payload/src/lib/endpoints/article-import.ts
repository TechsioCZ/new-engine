import { randomUUID } from "node:crypto"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { isRecord } from "@techsio/std/object"
import { APIError } from "payload"
import type { Endpoint } from "payload"

import {
  ArticleImportError,
  runImportFromFile,
  STATUS_VALUES,
} from "../../scripts/import-articles"
import type {
  ArticleImportOptions,
  ImportStatus,
} from "../../scripts/import-articles"
import { buildJsonResponse } from "../utils/endpoint"

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

interface ImportFormData {
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

const isImportStatus = (value: string): value is ImportStatus =>
  STATUS_VALUES.some((status) => status === value)

const parseImportStatus = (value?: string): ImportStatus | undefined => {
  if (value === undefined || value === "") {
    return undefined
  }

  const normalized = value.trim().toLowerCase()
  if (!isImportStatus(normalized)) {
    throw new APIError(
      `Invalid status ${value}. Supported values: ${STATUS_VALUES.join(", ")}`,
      400,
    )
  }

  return normalized
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
    ...(locale !== undefined && locale !== "" ? { locale } : {}),
    ...(sheetName !== undefined && sheetName !== "" ? { sheetName } : {}),
    ...(statusRaw !== undefined && statusRaw !== ""
      ? { status: statusRaw }
      : {}),
    dryRun,
    overwrite,
    translate,
  }
}

const writeUploadToTempFile = async (file: File) => {
  const extension = path.extname(file.name || "").toLowerCase()
  if (extension !== ".xlsx") {
    throw new APIError("Only .xlsx files are allowed", 400)
  }

  const safeName = (file.name || "upload.xlsx").replaceAll(
    /[^a-zA-Z0-9._-]/gu,
    "_",
  )
  const dir = await mkdtemp(path.join(tmpdir(), "payload-import-"))
  const filePath = path.join(dir, `${randomUUID()}-${safeName}`)

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)
  } catch (error) {
    await rm(dir, { force: true, recursive: true })
    throw error
  }

  return { dir, filePath }
}

const resolveLocale = (
  supportedLocales: string[] | undefined,
  value?: string,
) => {
  const normalized = value?.trim().toLowerCase()
  let result: string | undefined

  if (
    normalized !== undefined &&
    normalized !== "" &&
    supportedLocales !== undefined &&
    supportedLocales.length > 0
  ) {
    result =
      normalized === "all" || supportedLocales.includes(normalized)
        ? normalized
        : undefined
  }

  return result
}

const hasRoles = (value: unknown): value is { roles?: unknown } =>
  isRecord(value)

const isAuthorized = (req: ArticleImportRequest) => {
  const roles = hasRoles(req.user) ? req.user.roles : undefined
  if (Array.isArray(roles) && roles.includes("admin")) {
    return true
  }

  const apiKey = process.env["PAYLOAD_API_KEY"]
  return (
    apiKey !== undefined &&
    apiKey !== "" &&
    req.headers.get("x-payload-api-key") === apiKey
  )
}

const isImportInputError = (error: ArticleImportError) =>
  error.code !== "ABORTED"

const getAbortSignal = (req: ArticleImportRequest) =>
  req.signal instanceof AbortSignal ? req.signal : undefined

const readImportFormData = async (req: ArticleImportRequest) => {
  if (!req.formData) {
    throw new APIError("Form data parsing is not available", 400)
  }

  return parseFormData(await req.formData())
}

const resolveImportLocale = (req: ArticleImportRequest, value?: string) => {
  const { localization } = req.payload.config
  const supportedLocales =
    localization === false ? undefined : localization?.localeCodes
  const locale =
    resolveLocale(supportedLocales, value) ??
    (localization === false ? undefined : localization.defaultLocale)

  if (
    value !== undefined &&
    value !== "" &&
    (locale === undefined || locale === "")
  ) {
    throw new APIError(
      `Invalid locale ${value}. Supported values: ${supportedLocales?.join(", ")}`,
      400,
    )
  }

  return locale
}

const buildImportOptions = (
  payload: ImportFormData,
  locale: string | undefined,
  status: ImportStatus | undefined,
  abortSignal: AbortSignal | undefined,
  payloadClient: ArticleImportRequest["payload"],
): ArticleImportOptions => ({
  filePath: "",
  ...(payload.sheetName !== undefined && payload.sheetName !== ""
    ? { sheetName: payload.sheetName }
    : {}),
  ...(payload.dryRun === undefined ? {} : { dryRun: payload.dryRun }),
  ...(locale !== undefined && locale !== "" ? { locale } : {}),
  ...(status === undefined ? {} : { status }),
  ...(payload.translate === undefined ? {} : { translate: payload.translate }),
  ...(payload.overwrite === undefined ? {} : { overwrite: payload.overwrite }),
  ...(abortSignal === undefined ? {} : { signal: abortSignal }),
  payload: payloadClient,
})

const toImportEndpointError = (error: unknown) => {
  if (error instanceof APIError && error.status < 500) {
    return error
  }

  if (error instanceof ArticleImportError && error.code === "ABORTED") {
    return new APIError("Import aborted", 499)
  }

  if (error instanceof ArticleImportError && isImportInputError(error)) {
    return new APIError(error.message, 400)
  }

  if (error instanceof Error) {
    console.error(error)
  }

  return new APIError("Import failed", 500)
}

/** Endpoint for uploading XLSX and importing articles through Payload admin. */
export const articleImportEndpoint: Endpoint = {
  handler: async (req) => {
    if (!isAuthorized(req)) {
      throw new APIError("Unauthorized", 401)
    }

    const payload = await readImportFormData(req)
    const locale = resolveImportLocale(req, payload.locale)
    const status = parseImportStatus(payload.status)
    const abortSignal = getAbortSignal(req)
    const importOptions = buildImportOptions(
      payload,
      locale,
      status,
      abortSignal,
      req.payload,
    )

    let tempDir = ""
    try {
      const uploaded = await writeUploadToTempFile(payload.file)
      tempDir = uploaded.dir
      importOptions.filePath = uploaded.filePath

      const result = await runImportFromFile(importOptions)

      return buildJsonResponse(req, {
        ok: true,
        result: {
          imported: result.imported,
          skipped: result.skipped,
          total: result.total,
        },
      })
    } catch (error) {
      throw toImportEndpointError(error)
    } finally {
      if (tempDir) {
        await rm(tempDir, { force: true, recursive: true })
      }
    }
  },
  method: "post",
  path: "/article-import",
}
