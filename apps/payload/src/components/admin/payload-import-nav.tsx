"use client"

import { isRecord } from "@techsio/std/object"
import { useRef, useState } from "react"
import type { SyntheticEvent } from "react"

interface ImportResult {
  ok: boolean
  result: {
    imported: number
    skipped: number
    total: number
  }
}

class ImportRequestError extends Error {
  readonly code = "PAYLOAD_IMPORT_REQUEST_FAILED"
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ImportRequestError"
    this.status = status
  }
}

const IMPORT_FAILED_MESSAGE = "Import failed"
const INVALID_IMPORT_RESPONSE_MESSAGE = "Invalid import response"

const { NEXT_PUBLIC_PAYLOAD_LOCALES } = process.env
const configuredLocales = (NEXT_PUBLIC_PAYLOAD_LOCALES ?? "cs,sk,en")
  .split(",")
  .map((locale) => locale.trim())
  .filter(Boolean)
const defaultLocales =
  configuredLocales.length > 0 ? configuredLocales : ["cs", "sk", "en"]
const defaultLocale = defaultLocales.includes("sk")
  ? "sk"
  : (defaultLocales[0] ?? "cs")

const parseErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload: unknown = await response.json()
    if (isRecord(payload)) {
      const { message } = payload
      if (typeof message === "string") {
        return message
      }
    }
  } catch {
    return IMPORT_FAILED_MESSAGE
  }

  return IMPORT_FAILED_MESSAGE
}

const parseImportResult = (value: unknown): ImportResult => {
  if (!isRecord(value)) {
    throw new ImportRequestError(INVALID_IMPORT_RESPONSE_MESSAGE, 502)
  }

  const { ok, result } = value
  if (typeof ok !== "boolean" || !isRecord(result)) {
    throw new ImportRequestError(INVALID_IMPORT_RESPONSE_MESSAGE, 502)
  }

  const { imported, skipped, total } = result
  if (
    typeof imported !== "number" ||
    typeof skipped !== "number" ||
    typeof total !== "number"
  ) {
    throw new ImportRequestError(INVALID_IMPORT_RESPONSE_MESSAGE, 502)
  }

  return { ok, result: { imported, skipped, total } }
}

const getImportFailureMessage = (error: unknown): string =>
  error instanceof Error ? error.message : IMPORT_FAILED_MESSAGE

const createFormData = ({
  file,
  locale,
  sheetName,
  status,
  overwrite,
}: {
  file: File
  locale: string
  sheetName: string
  status: string
  overwrite: boolean
}): FormData => {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("locale", locale)
  if (sheetName !== "") {
    formData.append("sheetName", sheetName)
  }
  formData.append("dryRun", "0")
  formData.append("translate", "0")
  formData.append("overwrite", overwrite ? "1" : "0")
  if (status !== "") {
    formData.append("status", status)
  }

  return formData
}

const sendImportRequest = async (formData: FormData): Promise<ImportResult> => {
  const response = await fetch("/api/article-import", {
    body: formData,
    method: "POST",
  })

  if (!response.ok) {
    const errorMessage = await parseErrorMessage(response)
    throw new ImportRequestError(errorMessage, response.status)
  }

  const payload: unknown = await response.json()
  return parseImportResult(payload)
}

const PayloadImportNav = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [locale, setLocale] = useState(defaultLocale)
  const [status, setStatus] = useState("")
  const [sheetName, setSheetName] = useState("")
  const [overwrite, setOverwrite] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const onSubmit = async (
    event: SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ): Promise<void> => {
    event.preventDefault()

    setMessage("")
    setError("")

    const file = fileInputRef.current?.files?.[0]
    if (file === undefined) {
      setError("Vyberte XLSX soubor.")
      return
    }

    const formData = createFormData({
      file,
      locale,
      overwrite,
      sheetName,
      status,
    })
    setIsSubmitting(true)

    try {
      const data = await sendImportRequest(formData)
      setMessage(
        `Import dokončený: ${data.result.imported} importovaných, ${data.result.skipped} přeskočených z ${data.result.total}.`,
      )
    } catch (caughtError) {
      setError(getImportFailureMessage(caughtError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <details className="payload-import-nav" style={{ marginTop: "12px" }}>
      <summary
        style={{
          color: "var(--theme-text)",
          fontWeight: 600,
          marginBottom: "8px",
        }}
      >
        Payload import
      </summary>

      <form
        onSubmit={(event) => {
          void onSubmit(event)
        }}
        style={{
          background: "var(--theme-elevation-100)",
          borderRadius: "4px",
          display: "grid",
          gap: "8px",
          padding: "8px",
          width: "100%",
        }}
      >
        <label style={{ display: "grid", gap: "4px" }}>
          <span>XLSX soubor</span>
          <input accept=".xlsx" ref={fileInputRef} type="file" />
        </label>

        <label style={{ display: "grid", gap: "4px" }}>
          <span>Locale</span>
          <select
            onChange={(event) => {
              setLocale(event.target.value)
            }}
            value={locale}
          >
            {defaultLocales.map((localeOption) => (
              <option key={localeOption} value={localeOption}>
                {localeOption}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "4px" }}>
          <span>Název listu (volitelné)</span>
          <input
            onChange={(event) => {
              setSheetName(event.target.value)
            }}
            placeholder="např. Sheet1"
            type="text"
            value={sheetName}
          />
        </label>

        <label style={{ display: "grid", gap: "4px" }}>
          <span>Výchozí status (nepovinné)</span>
          <select
            onChange={(event) => {
              setStatus(event.target.value)
            }}
            value={status}
          >
            <option value="">Nechat z Excelu</option>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "4px" }}>
          <span>Overwrite</span>
          <input
            checked={overwrite}
            onChange={(event) => {
              setOverwrite(event.target.checked)
            }}
            type="checkbox"
          />
        </label>

        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Importuji..." : "Importovat"}
        </button>

        {message === "" ? null : <p>{message}</p>}
        {error === "" ? null : (
          <p style={{ color: "var(--theme-danger-500)" }}>{error}</p>
        )}
      </form>
    </details>
  )
}

export default PayloadImportNav
