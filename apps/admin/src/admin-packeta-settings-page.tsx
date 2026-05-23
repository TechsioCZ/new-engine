import { useMutation, useQueryClient } from "@tanstack/react-query"
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input"
import { FormNumericInput } from "@techsio/ui-kit/molecules/form-numeric-input"
import { Switch } from "@techsio/ui-kit/molecules/switch"
import { type FormEvent, useEffect, useState } from "react"
import { updatePacketaConfig, usePacketaConfig } from "./admin-api"
import type { PacketaConfig, PacketaConfigInput } from "./admin-types"
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

type PacketaLabelFormat = "A6" | "A7"

type PacketaFormData = {
  api_password: string
  cod_bank_account: string
  cod_bank_code: string
  cod_iban: string
  cod_swift: string
  default_label_format: PacketaLabelFormat
  default_label_offset: number
  eshop_id: string
  is_enabled: boolean
  sender_city: string
  sender_country: string
  sender_email: string
  sender_label: string
  sender_name: string
  sender_phone: string
  sender_street: string
  sender_zip_code: string
}

type PacketaStringField = Exclude<
  keyof PacketaFormData,
  "default_label_offset" | "is_enabled"
>

type SensitiveField =
  | "api_password"
  | "cod_bank_account"
  | "cod_bank_code"
  | "cod_iban"
  | "cod_swift"

type FieldConfig = {
  field: PacketaStringField
  isSet?: boolean
  label: string
  placeholder: string
  type?: "email" | "password" | "text"
  wide?: boolean
}

const DEFAULT_LABEL_FORMAT: PacketaLabelFormat = "A6"
const LABEL_FORMAT_ITEMS: AdminSelectFieldItem[] = [
  { label: "A6 thermal", value: "A6" },
  { label: "A7", value: "A7" },
]

const SENSITIVE_FIELDS = [
  "api_password",
  "cod_bank_account",
  "cod_bank_code",
  "cod_iban",
  "cod_swift",
] as const satisfies readonly SensitiveField[]

const SENSITIVE_FIELD_SET: ReadonlySet<string> = new Set(SENSITIVE_FIELDS)

const credentialFields: FieldConfig[] = [
  {
    field: "api_password",
    label: "API password",
    placeholder: "Packeta API password",
    type: "password",
    wide: true,
  },
  {
    field: "sender_label",
    label: "Sender label",
    placeholder: "Nazev e-shopu na stitku",
  },
  {
    field: "eshop_id",
    label: "Eshop ID",
    placeholder: "Volitelne ID u Packety",
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

const emptyFormData: PacketaFormData = {
  api_password: "",
  cod_bank_account: "",
  cod_bank_code: "",
  cod_iban: "",
  cod_swift: "",
  default_label_format: DEFAULT_LABEL_FORMAT,
  default_label_offset: 0,
  eshop_id: "",
  is_enabled: false,
  sender_city: "",
  sender_country: "",
  sender_email: "",
  sender_label: "",
  sender_name: "",
  sender_phone: "",
  sender_street: "",
  sender_zip_code: "",
}

export function PacketaSettingsPage() {
  const queryClient = useQueryClient()
  const config = usePacketaConfig()
  const [formData, setFormData] = useState<PacketaFormData>(emptyFormData)
  const [clearedFields, setClearedFields] = useState<Set<SensitiveField>>(
    new Set()
  )
  const [feedback, setFeedback] = useState<Feedback>(null)
  const mutation = useMutation({
    mutationFn: updatePacketaConfig,
    onError: (error) => {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "Packeta konfiguraci se nepodarilo ulozit.",
        tone: "error",
      })
    },
    onSuccess: async (response) => {
      setFormData(toFormData(response.config))
      setClearedFields(new Set())
      await queryClient.invalidateQueries({ queryKey: ["packeta-config"] })
      setFeedback({
        message: "Packeta konfigurace byla ulozena.",
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
    mutation.mutate(toPacketaPayload(formData, clearedFields))
  }

  function updateField<K extends keyof PacketaFormData>(
    field: K,
    value: PacketaFormData[K]
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
          Konfiguraci Packety se nepodarilo nacist.
        </div>
      )
    }

    const packetaConfig = config.data?.config

    return (
      <form className="admin-settings-form" onSubmit={handleSubmit}>
        <section className="admin-form-section">
          <div className="admin-setting-toggle">
            <div>
              <h3>Packeta shipping</h3>
              <span>Prostredi: {packetaConfig?.environment ?? "nezname"}</span>
            </div>
            <Switch
              checked={formData.is_enabled}
              onCheckedChange={(checked) => updateField("is_enabled", checked)}
            />
          </div>
          <div className="admin-settings-grid-two">
            <AdminSelectField
              items={LABEL_FORMAT_ITEMS}
              label="Label format"
              onValueChange={(value) =>
                updateField("default_label_format", normalizeLabelFormat(value))
              }
              size="md"
              value={formData.default_label_format}
            />
            <div className="[&_label]:text-md">
              <FormNumericInput
                className=""
                id="packeta-default-label-offset"
                label="Label offset"
                max={3}
                min={0}
                onChange={(value) =>
                  updateField(
                    "default_label_offset",
                    normalizeLabelOffset(value)
                  )
                }
                size="md"
                value={formData.default_label_offset}
              >
                <NumericInput.Control className="mt-2">
                  <NumericInput.Input />
                </NumericInput.Control>
              </FormNumericInput>
            </div>
          </div>
        </section>

        <FormSection
          clearedFields={clearedFields}
          fields={withSetFlags(credentialFields, packetaConfig)}
          formData={formData}
          onChange={updateField}
          onClear={clearSensitiveField}
          title="API credentials"
        />
        <FormSection
          clearedFields={clearedFields}
          description="Bankovni udaje pro dobirku."
          fields={withSetFlags(codFields, packetaConfig)}
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
          <div
            className={[
              "admin-feedback admin-feedback-inline",
              feedback.tone === "error" ? "admin-feedback-error" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {feedback.message}
          </div>
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
          <h1>Packeta</h1>
        </div>
      </header>
      <div className="admin-panel admin-settings-panel">
        <div className="admin-panel-header">
          <div>
            <h2>Konfigurace dopravce</h2>
            <span>Stejny kontrakt jako aktualni Medusa Packeta settings.</span>
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
  formData: PacketaFormData
  onChange: <K extends keyof PacketaFormData>(
    field: K,
    value: PacketaFormData[K]
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
  formData: PacketaFormData
  onChange: <K extends keyof PacketaFormData>(
    field: K,
    value: PacketaFormData[K]
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
      id={`packeta-${fieldConfig.field}`}
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

function toFormData(config: PacketaConfig): PacketaFormData {
  return {
    api_password: "",
    cod_bank_account: "",
    cod_bank_code: "",
    cod_iban: "",
    cod_swift: "",
    default_label_format: normalizeLabelFormat(config.default_label_format),
    default_label_offset: normalizeLabelOffset(config.default_label_offset),
    eshop_id: config.eshop_id ?? "",
    is_enabled: config.is_enabled,
    sender_city: config.sender_city ?? "",
    sender_country: config.sender_country ?? "",
    sender_email: config.sender_email ?? "",
    sender_label: config.sender_label ?? "",
    sender_name: config.sender_name ?? "",
    sender_phone: config.sender_phone ?? "",
    sender_street: config.sender_street ?? "",
    sender_zip_code: config.sender_zip_code ?? "",
  }
}

function toPacketaPayload(
  data: PacketaFormData,
  clearedFields: ReadonlySet<SensitiveField>
): PacketaConfigInput {
  const payload: PacketaConfigInput = {
    default_label_format: data.default_label_format,
    default_label_offset: normalizeLabelOffset(data.default_label_offset),
    eshop_id: data.eshop_id.trim(),
    is_enabled: data.is_enabled,
    sender_city: data.sender_city.trim(),
    sender_country: data.sender_country.trim().toUpperCase(),
    sender_label: data.sender_label.trim(),
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
  config: PacketaConfig | undefined
): FieldConfig[] {
  if (!config) {
    return fields
  }

  return fields.map((field) => {
    if (field.field === "api_password") {
      return { ...field, isSet: config.api_password_set }
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

function normalizeLabelFormat(value: unknown): PacketaLabelFormat {
  return value === "A7" ? "A7" : DEFAULT_LABEL_FORMAT
}

function normalizeLabelOffset(value: unknown): number {
  const numericValue =
    typeof value === "number" ? value : Number.parseInt(String(value), 10)

  if (!Number.isFinite(numericValue)) {
    return 0
  }

  return Math.max(0, Math.min(3, numericValue))
}

function isSensitiveField(field: unknown): field is SensitiveField {
  return typeof field === "string" && SENSITIVE_FIELD_SET.has(field)
}
