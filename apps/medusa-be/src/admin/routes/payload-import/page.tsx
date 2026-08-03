import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import { Button, Container, Heading, Input, Select, Text } from "@medusajs/ui"
import { type FormEvent, useState } from "react"

export const handle = {
  breadcrumb: () => "Payload import",
}

type ImportFailure = {
  message: string
  row: number
  slug?: string
}

type ImportResult = {
  total: number
  imported: number
  failed: number
  failures: ImportFailure[]
  mediaFallbacks: number
  relatedArticleLinks: number
  unresolvedRelatedArticleSlugs: string[]
  skipped: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object"

const numberOrZero = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0

const normalizeFailures = (value: unknown): ImportFailure[] =>
  Array.isArray(value)
    ? value.flatMap((failure) => {
        if (!isRecord(failure) || typeof failure.message !== "string") {
          return []
        }

        return [
          {
            message: failure.message,
            row: numberOrZero(failure.row),
            ...(typeof failure.slug === "string"
              ? { slug: failure.slug }
              : {}),
          },
        ]
      })
    : []

const normalizeImportResult = (value: unknown): ImportResult | null => {
  if (!isRecord(value) || !isRecord(value.result)) {
    return null
  }

  const result = value.result
  if (
    typeof result.total !== "number" ||
    typeof result.imported !== "number"
  ) {
    return null
  }

  return {
    total: result.total,
    imported: result.imported,
    failed: numberOrZero(result.failed),
    failures: normalizeFailures(result.failures),
    mediaFallbacks: numberOrZero(result.mediaFallbacks),
    relatedArticleLinks: numberOrZero(result.relatedArticleLinks),
    unresolvedRelatedArticleSlugs: Array.isArray(
      result.unresolvedRelatedArticleSlugs
    )
      ? result.unresolvedRelatedArticleSlugs.filter(
          (slug): slug is string => typeof slug === "string"
        )
      : [],
    skipped: numberOrZero(result.skipped),
  }
}

const configuredLocales = (import.meta.env.VITE_PAYLOAD_LOCALES ?? "cs,sk,en")
  .split(",")
  .map((item: string) => item.trim())
  .filter(Boolean)
const locales = configuredLocales.length
  ? configuredLocales
  : ["cs", "sk", "en"]
const defaultLocale = locales.includes("sk") ? "sk" : locales[0]

const parseErrorMessage = async (response: Response) => {
  const payload = await response.json().catch(() => null)
  if (payload && typeof payload === "object") {
    const result = normalizeImportResult(payload)
    if (result?.failures.length) {
      const rows = result.failures
        .slice(0, 5)
        .map(({ message, row, slug }) =>
          `řádek ${row}${slug ? ` (${slug})` : ""}: ${message}`
        )
        .join("; ")
      const remaining = result.failures.length - 5
      return `${result.failed} chyb. ${rows}${remaining > 0 ? `; a dalších ${remaining}` : ""}`
    }

    if ("message" in payload) {
      return String(payload.message)
    }
  }

  return "Import failed"
}

const appendOptional = (formData: FormData, key: string, value: string) => {
  if (value.trim()) {
    formData.append(key, value.trim())
  }
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  return "Import se nepovedl."
}

const PayloadImportPage = () => {
  const [file, setFile] = useState<File | null>(null)
  const [locale, setLocale] = useState(defaultLocale)
  const [sheetName, setSheetName] = useState("")
  const [status, setStatus] = useState("")
  const [overwrite, setOverwrite] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage("")
    setError("")

    if (!file) {
      setError("Vyber XLSX soubor.")
      return
    }

    const formData = new FormData()
    formData.append("file", file)
    formData.append("locale", locale)
    formData.append("overwrite", overwrite ? "1" : "0")
    formData.append("dryRun", "0")
    formData.append("translate", "0")
    appendOptional(formData, "sheetName", sheetName)
    appendOptional(formData, "status", status)

    setIsSubmitting(true)
    try {
      const response = await fetch("/admin/payload/article-import", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        setError(await parseErrorMessage(response))
        return
      }

      const result = normalizeImportResult(await response.json())
      if (!result) {
        throw new Error("Payload vrátil neplatný výsledek importu.")
      }
      setMessage(
        `Import dokončený: ${result.imported} importovaných, ${result.failed} chyb, ${result.skipped} přeskočených z ${result.total}, ${result.mediaFallbacks} obrázků nahrazených placeholderem, ${result.relatedArticleLinks} vazeb na související články, ${result.unresolvedRelatedArticleSlugs.length} nerozpoznaných vazeb.`
      )
    } catch (error_) {
      setError(getErrorMessage(error_))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">Payload import</Heading>
        <Text className="text-ui-fg-subtle" size="small">
          Nahraj XLSX soubor a spusť import článků do Payloadu.
        </Text>
      </div>

      <form className="grid max-w-xl gap-4 px-6 py-4" onSubmit={onSubmit}>
        <div className="grid gap-1">
          <Text size="small" weight="plus">
            XLSX soubor
          </Text>
          <Input
            accept=".xlsx"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            type="file"
          />
        </div>

        <div className="grid gap-1">
          <Text size="small" weight="plus">
            Locale
          </Text>
          <Select onValueChange={setLocale} value={locale}>
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {locales.map((item) => (
                <Select.Item key={item} value={item}>
                  {item}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>

        <div className="grid gap-1">
          <Text size="small" weight="plus">
            Název listu (volitelné)
          </Text>
          <Input
            onChange={(event) => setSheetName(event.target.value)}
            placeholder="napr. Sheet1"
            value={sheetName}
          />
        </div>

        <div className="grid gap-1">
          <Text size="small" weight="plus">
            Výchozí status
          </Text>
          <Select onValueChange={setStatus} value={status}>
            <Select.Trigger>
              <Select.Value placeholder="Nechat z Excelu" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="draft">draft</Select.Item>
              <Select.Item value="published">published</Select.Item>
              <Select.Item value="archived">archived</Select.Item>
            </Select.Content>
          </Select>
        </div>

        <label className="flex items-center gap-2">
          <input
            checked={overwrite}
            onChange={(event) => setOverwrite(event.target.checked)}
            type="checkbox"
          />
          <Text size="small">Overwrite</Text>
        </label>

        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Importuji..." : "Importovat"}
        </Button>

        {message ? (
          <Text className="text-ui-fg-interactive">{message}</Text>
        ) : null}
        {error ? <Text className="text-ui-fg-error">{error}</Text> : null}
      </form>
    </Container>
  )
}

export const config = defineRouteConfig({
  icon: DocumentText,
  label: "Payload import",
})

export default PayloadImportPage
