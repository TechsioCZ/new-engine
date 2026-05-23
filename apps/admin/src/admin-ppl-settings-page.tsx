import { useMutation, useQueryClient } from "@tanstack/react-query"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { Switch } from "@techsio/ui-kit/molecules/switch"
import { type FormEvent, useEffect, useState } from "react"
import { updatePplConfig, usePplConfig } from "./admin-api"
import type { PplConfig, PplConfigInput, PplLabelFormat } from "./admin-types"
import {
  AdminSelectField,
  type AdminSelectFieldItem,
} from "./components/admin-select-field"
import { AdminTextField } from "./components/admin-text-field"
import { AdminToolbarButton } from "./components/admin-toolbar-button"

type Feedback = {
  message: string
  tone: "error" | "success"
} | null

type PplFormData = {
  client_id: string
  client_secret: string
  cod_bank_account: string
  cod_bank_code: string
  cod_iban: string
  cod_swift: string
  default_label_format: PplLabelFormat
  is_enabled: boolean
  sender_city: string
  sender_country: string
  sender_email: string
  sender_name: string
  sender_phone: string
  sender_street: string
  sender_zip_code: string
}

type PplStringField = Exclude<
  keyof PplFormData,
  "default_label_format" | "is_enabled"
>

type SensitiveField =
  | "client_secret"
  | "cod_bank_account"
  | "cod_bank_code"
  | "cod_iban"
  | "cod_swift"

type FieldConfig = {
  field: PplStringField
  isSet?: boolean
  label: string
  placeholder: string
  type?: "email" | "password" | "text"
  wide?: boolean
}

const DEFAULT_LABEL_FORMAT: PplLabelFormat = "Pdf"

const SENSITIVE_FIELDS = [
  "client_secret",
  "cod_bank_account",
  "cod_bank_code",
  "cod_iban",
  "cod_swift",
] as const satisfies readonly SensitiveField[]

const SENSITIVE_FIELD_SET: ReadonlySet<string> = new Set(SENSITIVE_FIELDS)

const LABEL_FORMATS: { label: string; value: PplLabelFormat }[] = [
  { label: "PNG", value: "Png" },
  { label: "JPEG", value: "Jpeg" },
  { label: "SVG", value: "Svg" },
  { label: "PDF", value: "Pdf" },
  { label: "ZPL", value: "Zpl" },
]
const LABEL_FORMAT_ITEMS: AdminSelectFieldItem[] = LABEL_FORMATS.map(
  (format) => ({
    label: format.label,
    value: format.value,
  })
)

const credentialFields: FieldConfig[] = [
  {
    field: "client_id",
    label: "Client ID",
    placeholder: "PPL Client ID",
  },
  {
    field: "client_secret",
    label: "Client secret",
    placeholder: "PPL Client Secret",
    type: "password",
  },
]

const codFields: FieldConfig[] = [
  {
    field: "cod_bank_account",
    label: "Bankovni ucet",
    placeholder: "Cislo uctu",
  },
  {
    field: "cod_bank_code",
    label: "Kod banky",
    placeholder: "0800",
  },
  {
    field: "cod_iban",
    label: "IBAN",
    placeholder: "IBAN pro dobirku",
  },
  {
    field: "cod_swift",
    label: "SWIFT",
    placeholder: "SWIFT/BIC",
  },
]

const senderFields: FieldConfig[] = [
  {
    field: "sender_name",
    label: "Odesilatel",
    placeholder: "Nazev firmy",
  },
  {
    field: "sender_street",
    label: "Ulice",
    placeholder: "Ulice a cislo",
  },
  {
    field: "sender_city",
    label: "Mesto",
    placeholder: "Mesto",
  },
  {
    field: "sender_zip_code",
    label: "PSC",
    placeholder: "PSC",
  },
  {
    field: "sender_country",
    label: "Zeme",
    placeholder: "SK",
  },
  {
    field: "sender_phone",
    label: "Telefon",
    placeholder: "+421...",
  },
  {
    field: "sender_email",
    label: "Email",
    placeholder: "logistika@example.com",
    type: "email",
    wide: true,
  },
]

const emptyFormData: PplFormData = {
  client_id: "",
  client_secret: "",
  cod_bank_account: "",
  cod_bank_code: "",
  cod_iban: "",
  cod_swift: "",
  default_label_format: DEFAULT_LABEL_FORMAT,
  is_enabled: false,
  sender_city: "",
  sender_country: "",
  sender_email: "",
  sender_name: "",
  sender_phone: "",
  sender_street: "",
  sender_zip_code: "",
}

export function PplSettingsPage() {
  const queryClient = useQueryClient()
  const config = usePplConfig()
  const [formData, setFormData] = useState<PplFormData>(emptyFormData)
  const [clearedFields, setClearedFields] = useState<Set<SensitiveField>>(
    new Set()
  )
  const [feedback, setFeedback] = useState<Feedback>(null)
  const mutation = useMutation({
    mutationFn: updatePplConfig,
    onError: (error) => {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "PPL konfiguraci se nepodarilo ulozit.",
        tone: "error",
      })
    },
    onSuccess: async (response) => {
      setFormData(toFormData(response.config))
      setClearedFields(new Set())
      await queryClient.invalidateQueries({ queryKey: ["ppl-config"] })
      setFeedback({
        message: "PPL konfigurace byla ulozena.",
        tone: "success",
      })
    },
  })

  useEffect(() => {
    if (config.data?.config) {
      setFormData(toFormData(config.data.config))
      setClearedFields(new Set())
    }
  }, [config.data])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutation.mutate(toPplPayload(formData, clearedFields))
  }

  function updateField<K extends keyof PplFormData>(
    field: K,
    value: PplFormData[K]
  ) {
    setFormData((current) => ({ ...current, [field]: value }))
    setFeedback(null)

    if (isSensitiveField(field)) {
      setClearedFields((current) => {
        const next = new Set(current)
        next.delete(field)
        return next
      })
    }
  }

  function clearSensitiveField(field: SensitiveField) {
    setFormData((current) => ({ ...current, [field]: "" }))
    setClearedFields((current) => new Set(current).add(field))
    setFeedback(null)
  }

  function renderConfigContent() {
    if (config.isLoading) {
      return (
        <div aria-busy="true" className="admin-table-state">
          Nacitam konfiguraci...
        </div>
      )
    }

    if (config.isError) {
      return (
        <div className="admin-table-state admin-table-state-error">
          Konfiguraci PPL se nepodarilo nacist.
        </div>
      )
    }

    const pplConfig = config.data?.config

    return (
      <form className="admin-settings-form" onSubmit={handleSubmit}>
        <section className="admin-form-section">
          <div className="admin-setting-toggle">
            <div>
              <h3>PPL shipping</h3>
              <span>Prostredi: {pplConfig?.environment ?? "nezname"}</span>
            </div>
            <Switch
              checked={formData.is_enabled}
              onCheckedChange={(checked) => updateField("is_enabled", checked)}
            />
          </div>
          <AdminSelectField
            className="admin-field-wide"
            items={LABEL_FORMAT_ITEMS}
            label="Label format"
            onValueChange={(value) =>
              updateField("default_label_format", normalizeLabelFormat(value))
            }
            size="md"
            value={formData.default_label_format}
          />
        </section>

        <FormSection
          clearedFields={clearedFields}
          fields={withSetFlags(credentialFields, pplConfig)}
          formData={formData}
          onChange={updateField}
          onClear={clearSensitiveField}
          title="API credentials"
        />
        <FormSection
          clearedFields={clearedFields}
          description="Bankovni udaje pro dobirku."
          fields={withSetFlags(codFields, pplConfig)}
          formData={formData}
          onChange={updateField}
          onClear={clearSensitiveField}
          title="Dobirka"
        />
        <FormSection
          fields={senderFields}
          formData={formData}
          onChange={updateField}
          title="Fallback adresa odesilatele"
        />

        {feedback && (
          <StatusText
            align="start"
            role={feedback.tone === "error" ? "alert" : "status"}
            showIcon
            size="sm"
            status={feedback.tone}
          >
            {feedback.message}
          </StatusText>
        )}

        <div className="admin-form-actions">
          <AdminToolbarButton disabled={mutation.isPending} type="submit">
            {mutation.isPending ? "Ukladam..." : "Ulozit"}
          </AdminToolbarButton>
        </div>
      </form>
    )
  }

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Nastaveni</span>
          <h1>PPL</h1>
        </div>
      </header>
      <div className="admin-panel admin-settings-panel">
        <div className="admin-panel-header">
          <div>
            <h2>Konfigurace dopravce</h2>
            <span>Stejny kontrakt jako aktualni Medusa PPL settings.</span>
          </div>
        </div>
        {renderConfigContent()}
      </div>
    </section>
  )
}

function FormSection({
  clearedFields,
  description,
  fields,
  formData,
  onChange,
  onClear,
  title,
}: {
  clearedFields?: ReadonlySet<SensitiveField>
  description?: string
  fields: FieldConfig[]
  formData: PplFormData
  onChange: <K extends keyof PplFormData>(
    field: K,
    value: PplFormData[K]
  ) => void
  onClear?: (field: SensitiveField) => void
  title: string
}) {
  return (
    <section className="admin-form-section">
      <div className="admin-form-section-heading">
        <h3>{title}</h3>
        {description && <span>{description}</span>}
      </div>
      <div className="admin-settings-grid-two">
        {fields.map((field) => (
          <FormField
            clearedFields={clearedFields}
            fieldConfig={field}
            formData={formData}
            key={field.field}
            onChange={onChange}
            onClear={onClear}
          />
        ))}
      </div>
    </section>
  )
}

function FormField({
  clearedFields,
  fieldConfig,
  formData,
  onChange,
  onClear,
}: {
  clearedFields?: ReadonlySet<SensitiveField>
  fieldConfig: FieldConfig
  formData: PplFormData
  onChange: <K extends keyof PplFormData>(
    field: K,
    value: PplFormData[K]
  ) => void
  onClear?: (field: SensitiveField) => void
}) {
  const sensitiveField = isSensitiveField(fieldConfig.field)
    ? fieldConfig.field
    : null
  const isCleared = sensitiveField
    ? Boolean(clearedFields?.has(sensitiveField))
    : false
  const canClear = Boolean(sensitiveField && fieldConfig.isSet && !isCleared)

  return (
    <AdminTextField
      action={
        canClear && onClear ? (
          <button
            className="admin-inline-action"
            onClick={() => {
              if (sensitiveField) {
                onClear(sensitiveField)
              }
            }}
            type="button"
          >
            Smazat
          </button>
        ) : null
      }
      className={fieldConfig.wide ? "admin-field-wide" : undefined}
      disabled={isCleared}
      id={`ppl-${fieldConfig.field}`}
      label={fieldConfig.label}
      meta={
        <>
          {fieldConfig.isSet && !isCleared ? <small>nastaveno</small> : null}
          {isCleared ? <small>smaze se</small> : null}
        </>
      }
      onValueChange={(value) => onChange(fieldConfig.field, value)}
      placeholder={getPlaceholder(fieldConfig, isCleared)}
      type={fieldConfig.type ?? "text"}
      value={isCleared ? "" : formData[fieldConfig.field]}
    />
  )
}

function toFormData(config: PplConfig): PplFormData {
  return {
    client_id: config.client_id ?? "",
    client_secret: "",
    cod_bank_account: "",
    cod_bank_code: "",
    cod_iban: "",
    cod_swift: "",
    default_label_format: normalizeLabelFormat(config.default_label_format),
    is_enabled: config.is_enabled,
    sender_city: config.sender_city ?? "",
    sender_country: config.sender_country ?? "",
    sender_email: config.sender_email ?? "",
    sender_name: config.sender_name ?? "",
    sender_phone: config.sender_phone ?? "",
    sender_street: config.sender_street ?? "",
    sender_zip_code: config.sender_zip_code ?? "",
  }
}

function toPplPayload(
  data: PplFormData,
  clearedFields: ReadonlySet<SensitiveField>
): PplConfigInput {
  const payload: PplConfigInput = {
    client_id: data.client_id.trim(),
    default_label_format: data.default_label_format,
    is_enabled: data.is_enabled,
    sender_city: data.sender_city.trim(),
    sender_country: data.sender_country.trim().toUpperCase(),
    sender_name: data.sender_name.trim(),
    sender_phone: data.sender_phone.trim(),
    sender_street: data.sender_street.trim(),
    sender_zip_code: data.sender_zip_code.trim(),
  }
  const senderEmail = data.sender_email.trim()

  if (senderEmail) {
    payload.sender_email = senderEmail
  }

  for (const field of SENSITIVE_FIELDS) {
    payload[field] = clearedFields.has(field) ? null : data[field].trim()
  }

  return payload
}

function withSetFlags(
  fields: FieldConfig[],
  config: PplConfig | undefined
): FieldConfig[] {
  if (!config) {
    return fields
  }

  return fields.map((field) => {
    if (field.field === "client_secret") {
      return { ...field, isSet: config.client_secret_set }
    }
    if (field.field === "cod_bank_account") {
      return { ...field, isSet: config.cod_bank_account_set }
    }
    if (field.field === "cod_bank_code") {
      return { ...field, isSet: config.cod_bank_code_set }
    }
    if (field.field === "cod_iban") {
      return { ...field, isSet: config.cod_iban_set }
    }
    if (field.field === "cod_swift") {
      return { ...field, isSet: config.cod_swift_set }
    }
    return field
  })
}

function getPlaceholder(fieldConfig: FieldConfig, isCleared: boolean) {
  if (isCleared) {
    return "Hodnota bude smazana"
  }

  if (fieldConfig.isSet) {
    return "Ponechat prazdne pro zachovani"
  }

  return fieldConfig.placeholder
}

function normalizeLabelFormat(value: unknown): PplLabelFormat {
  if (value === "Jpeg" || value === "Png" || value === "Svg") {
    return value
  }

  if (value === "Zpl") {
    return "Zpl"
  }

  return DEFAULT_LABEL_FORMAT
}

function isSensitiveField(field: unknown): field is SensitiveField {
  return typeof field === "string" && SENSITIVE_FIELD_SET.has(field)
}
