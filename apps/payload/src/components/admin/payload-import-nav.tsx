"use client"

import { type FormEvent, useState } from "react"

type ImportResult = {
  ok: boolean
  result: {
    total: number
    imported: number
    skipped: number
  }
}

const configuredLocales = (
  process.env.NEXT_PUBLIC_PAYLOAD_LOCALES ?? "cs,sk,en"
)
  .split(",")
  .map((locale) => locale.trim())
  .filter(Boolean)
const defaultLocales = configuredLocales.length
  ? configuredLocales
  : ["cs", "sk", "en"]
const defaultLocale = defaultLocales.includes("sk") ? "sk" : defaultLocales[0]

const isFormMessage = (message: string) => Boolean(message)

const parseErrorMessage = async (response: Response) => {
  const payload = await response.json().catch(() => ({}))
  return (payload as { message?: string }).message || "Import failed"
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  return "Import failed"
}

const createFormData = ({
  file,
  locale,
  sheetName,
  status,
  dryRun,
  translate,
  overwrite,
}: {
  file: File
  locale: string
  sheetName: string
  status: string
  dryRun: boolean
  translate: boolean
  overwrite: boolean
}) => {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("locale", locale)
  if (sheetName) {
    formData.append("sheetName", sheetName)
  }
  formData.append("dryRun", dryRun ? "1" : "0")
  formData.append("translate", translate ? "1" : "0")
  formData.append("overwrite", overwrite ? "1" : "0")
  if (status) {
    formData.append("status", status)
  }

  return formData
}

const sendImportRequest = async (formData: FormData) => {
  const response = await fetch("/api/article-import", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const errorMessage = await parseErrorMessage(response)
    throw new Error(errorMessage)
  }

  return (await response.json()) as ImportResult
}

export default function PayloadImportNav() {
  const [file, setFile] = useState<File | null>(null)
  const [locale, setLocale] = useState(defaultLocale)
  const [status, setStatus] = useState("")
  const [sheetName, setSheetName] = useState("")
  const [dryRun, setDryRun] = useState(false)
  const [translate, setTranslate] = useState(false)
  const [overwrite, setOverwrite] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setMessage("")
    setError("")

    if (!file) {
      setError("Vyberte XLSX soubor.")
      return
    }

    const formData = createFormData({
      file,
      locale,
      sheetName,
      status,
      dryRun,
      translate,
      overwrite,
    })
    setIsSubmitting(true)

    try {
      const data = await sendImportRequest(formData)
      setMessage(
        `Import dokončený: ${data.result.imported} importovaných, ${data.result.skipped} přeskočených z ${data.result.total}.`
      )
    } catch (error_) {
      setError(getErrorMessage(error_))
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
        onSubmit={onSubmit}
        style={{
          display: "grid",
          gap: "8px",
          width: "100%",
          padding: "8px",
          borderRadius: "4px",
          background: "var(--theme-elevation-100)",
        }}
      >
        <label style={{ display: "grid", gap: "4px" }}>
          <span>XLSX soubor</span>
          <input
            accept=".xlsx"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            type="file"
          />
        </label>

        <label style={{ display: "grid", gap: "4px" }}>
          <span>Locale</span>
          <select
            onChange={(event) => setLocale(event.target.value)}
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
            onChange={(event) => setSheetName(event.target.value)}
            placeholder="napr. Sheet1"
            type="text"
            value={sheetName}
          />
        </label>

        <label style={{ display: "grid", gap: "4px" }}>
          <span>Výchozí status (nepovinné)</span>
          <select
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option value="">Nechat z Excelu</option>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "4px" }}>
          <span>Dry run</span>
          <input
            checked={dryRun}
            onChange={(event) => setDryRun(event.target.checked)}
            type="checkbox"
          />
        </label>
        <label style={{ display: "grid", gap: "4px" }}>
          <span>Translate</span>
          <input
            checked={translate}
            onChange={(event) => setTranslate(event.target.checked)}
            type="checkbox"
          />
        </label>
        <label style={{ display: "grid", gap: "4px" }}>
          <span>Overwrite</span>
          <input
            checked={overwrite}
            onChange={(event) => setOverwrite(event.target.checked)}
            type="checkbox"
          />
        </label>

        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Importuji..." : "Importovat"}
        </button>

        {isFormMessage(message) ? <p>{message}</p> : null}
        {error ? (
          <p style={{ color: "var(--theme-danger-500)" }}>{error}</p>
        ) : null}
      </form>
    </details>
  )
}
