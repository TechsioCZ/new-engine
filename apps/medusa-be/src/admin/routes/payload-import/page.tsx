import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import { Button, Container, Heading, Input, Select, Text } from "@medusajs/ui"
import { getErrorMessage, isRecord } from "@techsio/std/object"
import { useRef, useState } from "react"
import type { SubmitEvent } from "react"

export const handle = {
  breadcrumb: () => "Payload import",
}

interface ImportResult {
  ok: boolean
  result: {
    total: number
    imported: number
    skipped: number
  }
}

const LOCALE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/u
const FALLBACK_LOCALES = ["cs", "sk", "en"]

const parseConfiguredLocales = (value: unknown): string[] => {
  if (typeof value !== "string") {
    return FALLBACK_LOCALES
  }

  const configuredLocales = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => LOCALE_PATTERN.test(item))
  return configuredLocales.length > 0 ? configuredLocales : FALLBACK_LOCALES
}

const locales = parseConfiguredLocales(import.meta.env.VITE_PAYLOAD_LOCALES)
const defaultLocale = locales.includes("sk") ? "sk" : (locales[0] ?? "cs")

const parseErrorMessage = async (response: Response) => {
  try {
    const payload: unknown = await response.json()
    if (isRecord(payload) && typeof payload["message"] === "string") {
      return payload["message"]
    }
  } catch {
    return "Import failed"
  }

  return "Import failed"
}

const isImportResult = (value: unknown): value is ImportResult => {
  if (!isRecord(value) || value["ok"] !== true || !isRecord(value["result"])) {
    return false
  }

  const { imported, skipped, total } = value["result"]
  return [imported, skipped, total].every(
    (count) =>
      typeof count === "number" && Number.isSafeInteger(count) && count >= 0,
  )
}

const appendOptional = (formData: FormData, key: string, value: string) => {
  if (value.trim()) {
    formData.append(key, value.trim())
  }
}

const getImportFailureMessage = (error: unknown) =>
  error instanceof Error ? getErrorMessage(error) : "Import se nepovedl."

const PayloadImportPage = () => {
  const fileRef = useRef<File | null>(null)
  const [locale, setLocale] = useState(defaultLocale)
  const [sheetName, setSheetName] = useState("")
  const [status, setStatus] = useState("")
  const [overwrite, setOverwrite] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const onSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage("")
    setError("")

    const file = fileRef.current
    if (file === null) {
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
        body: formData,
        method: "POST",
      })

      if (!response.ok) {
        setError(await parseErrorMessage(response))
        return
      }

      const data: unknown = await response.json()
      if (!isImportResult(data)) {
        setError(getImportFailureMessage(data))
        return
      }
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
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">Payload import</Heading>
        <Text className="text-ui-fg-subtle" size="small">
          Nahraj XLSX soubor a spusť import článků do Payloadu.
        </Text>
      </div>

      <form
        className="grid max-w-xl gap-4 px-6 py-4"
        onSubmit={(event) => {
          void onSubmit(event)
        }}
      >
        <div className="grid gap-1">
          <Text size="small" weight="plus">
            XLSX soubor
          </Text>
          <Input
            accept=".xlsx"
            onChange={(event) => {
              fileRef.current = event.target.files?.[0] ?? null
            }}
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
            onChange={(event) => {
              setSheetName(event.target.value)
            }}
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
            onChange={(event) => {
              setOverwrite(event.target.checked)
            }}
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
