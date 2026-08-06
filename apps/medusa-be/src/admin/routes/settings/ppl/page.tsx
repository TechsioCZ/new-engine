import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import type { SubmitEvent } from "react"

import { sdk } from "../../../lib/sdk"

export const handle = {
  breadcrumb: () => "PPL",
}

interface PplConfigResponse {
  id: string
  environment: string
  is_enabled: boolean
  client_id: string | null
  client_secret_set: boolean
  default_label_format: string
  cod_bank_account_set: boolean
  cod_bank_code_set: boolean
  cod_iban_set: boolean
  cod_swift_set: boolean
  sender_name: string | null
  sender_street: string | null
  sender_city: string | null
  sender_zip_code: string | null
  sender_country: string | null
  sender_phone: string | null
  sender_email: string | null
}

interface PplConfigInput {
  is_enabled?: boolean
  client_id?: string
  client_secret?: string | null
  default_label_format?: string
  cod_bank_account?: string | null
  cod_bank_code?: string | null
  cod_iban?: string | null
  cod_swift?: string | null
  sender_name?: string
  sender_street?: string
  sender_city?: string
  sender_zip_code?: string
  sender_country?: string
  sender_phone?: string
  sender_email?: string
}

/**
 * Every editable value, always present as a string so inputs stay controlled.
 * Sensitive values start empty; the API reads an empty sensitive value as
 * "keep the stored value".
 */
interface PplFormValues {
  client_id: string
  client_secret: string
  cod_bank_account: string
  cod_bank_code: string
  cod_iban: string
  cod_swift: string
  default_label_format: string
  is_enabled: boolean
  sender_city: string
  sender_country: string
  sender_email: string
  sender_name: string
  sender_phone: string
  sender_street: string
  sender_zip_code: string
}

type PplTextField = keyof Omit<
  PplFormValues,
  "default_label_format" | "is_enabled"
>

type PplSensitiveField =
  | "client_secret"
  | "cod_bank_account"
  | "cod_bank_code"
  | "cod_iban"
  | "cod_swift"

/** Fields that can be cleared (encrypted in DB) */
const CLEARABLE_FIELDS: ReadonlySet<PplTextField> = new Set<PplTextField>([
  "client_secret",
  "cod_bank_account",
  "cod_bank_code",
  "cod_iban",
  "cod_swift",
])

/** Sensitive inputs are emptied after a save; the API never echoes them back. */
const BLANK_SENSITIVE_VALUES: Record<PplSensitiveField, string> = {
  client_secret: "",
  cod_bank_account: "",
  cod_bank_code: "",
  cod_iban: "",
  cod_swift: "",
}

const EMPTY_PPL_FORM_VALUES: PplFormValues = {
  ...BLANK_SENSITIVE_VALUES,
  client_id: "",
  default_label_format: "",
  is_enabled: false,
  sender_city: "",
  sender_country: "",
  sender_email: "",
  sender_name: "",
  sender_phone: "",
  sender_street: "",
  sender_zip_code: "",
}

const LABEL_FORMATS = [
  { label: "PNG", value: "Png" },
  { label: "JPEG", value: "Jpeg" },
  { label: "SVG", value: "Svg" },
  { label: "PDF", value: "Pdf" },
  { label: "ZPL", value: "Zpl" },
]

interface FieldConfig {
  field: PplTextField
  label: string
  placeholder: string
  isSet: boolean
  type?: "text" | "password" | "email"
  colSpan?: 1 | 2
}

const normalizePplFormValues = (
  config: PplConfigResponse | undefined,
): PplFormValues => {
  if (config === undefined) {
    return { ...EMPTY_PPL_FORM_VALUES }
  }

  return {
    ...EMPTY_PPL_FORM_VALUES,
    client_id: config.client_id ?? "",
    default_label_format: config.default_label_format,
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

/** Cleared sensitive fields are sent as null so the API wipes the stored value. */
const sensitiveValue = (
  values: PplFormValues,
  clearedFields: ReadonlySet<PplTextField>,
  field: PplSensitiveField,
): string | null => (clearedFields.has(field) ? null : values[field])

const buildPplConfigPayload = (
  values: PplFormValues,
  clearedFields: ReadonlySet<PplTextField>,
): PplConfigInput => ({
  client_id: values.client_id,
  client_secret: sensitiveValue(values, clearedFields, "client_secret"),
  cod_bank_account: sensitiveValue(values, clearedFields, "cod_bank_account"),
  cod_bank_code: sensitiveValue(values, clearedFields, "cod_bank_code"),
  cod_iban: sensitiveValue(values, clearedFields, "cod_iban"),
  cod_swift: sensitiveValue(values, clearedFields, "cod_swift"),
  default_label_format: values.default_label_format,
  is_enabled: values.is_enabled,
  sender_city: values.sender_city,
  sender_country: values.sender_country,
  sender_email: values.sender_email,
  sender_name: values.sender_name,
  sender_phone: values.sender_phone,
  sender_street: values.sender_street,
  sender_zip_code: values.sender_zip_code,
})

const buildCredentialFields = (
  config: PplConfigResponse | undefined,
): FieldConfig[] => [
  {
    field: "client_id",
    isSet: false,
    label: "Client ID",
    placeholder: "Your PPL Client ID",
  },
  {
    field: "client_secret",
    isSet: config?.client_secret_set ?? false,
    label: "Client Secret",
    placeholder: "Your PPL Client Secret",
    type: "password",
  },
]

const buildCodFields = (
  config: PplConfigResponse | undefined,
): FieldConfig[] => [
  {
    field: "cod_bank_account",
    isSet: config?.cod_bank_account_set ?? false,
    label: "Bank Account",
    placeholder: "Bank account",
  },
  {
    field: "cod_bank_code",
    isSet: config?.cod_bank_code_set ?? false,
    label: "Bank Code",
    placeholder: "Bank code",
  },
  {
    field: "cod_iban",
    isSet: config?.cod_iban_set ?? false,
    label: "IBAN",
    placeholder: "IBAN (alternative)",
  },
  {
    field: "cod_swift",
    isSet: config?.cod_swift_set ?? false,
    label: "SWIFT",
    placeholder: "SWIFT (with IBAN)",
  },
]

const SENDER_FIELDS: readonly FieldConfig[] = [
  {
    field: "sender_name",
    isSet: false,
    label: "Name",
    placeholder: "Company name",
  },
  {
    field: "sender_street",
    isSet: false,
    label: "Street",
    placeholder: "Street address",
  },
  { field: "sender_city", isSet: false, label: "City", placeholder: "City" },
  {
    field: "sender_zip_code",
    isSet: false,
    label: "ZIP Code",
    placeholder: "Postal code",
  },
  {
    field: "sender_country",
    isSet: false,
    label: "Country",
    placeholder: "Country code (e.g., CZ)",
  },
  {
    field: "sender_phone",
    isSet: false,
    label: "Phone",
    placeholder: "Phone number",
  },
  {
    colSpan: 2,
    field: "sender_email",
    isSet: false,
    label: "Email",
    placeholder: "Email address",
    type: "email",
  },
]

const getPlaceholder = (
  isCleared: boolean,
  fieldConfig: FieldConfig,
): string => {
  if (isCleared) {
    return "Value will be cleared"
  }
  if (fieldConfig.isSet) {
    return "Leave empty to keep"
  }
  return fieldConfig.placeholder
}

const FormField = ({
  fieldConfig,
  value,
  onChange,
  onClear,
  isCleared,
}: {
  fieldConfig: FieldConfig
  value: string
  onChange: (value: string) => void
  onClear: () => void
  isCleared: boolean
}) => {
  const inputId = `ppl-${fieldConfig.field}`
  const canClear =
    CLEARABLE_FIELDS.has(fieldConfig.field) && fieldConfig.isSet && !isCleared

  return (
    <div
      className={`flex flex-col gap-2 ${fieldConfig.colSpan === 2 ? "col-span-2" : ""}`}
    >
      <div className="flex items-center justify-between">
        <Label htmlFor={inputId}>
          {fieldConfig.label}{" "}
          {isCleared ? (
            <span className="text-ui-fg-error">(will be cleared)</span>
          ) : (
            fieldConfig.isSet && (
              <span className="text-ui-fg-subtle">(set)</span>
            )
          )}
        </Label>
        {canClear && (
          <button
            className="text-sm text-ui-fg-subtle hover:text-ui-fg-error"
            onClick={onClear}
            type="button"
          >
            Clear
          </button>
        )}
      </div>
      <Input
        disabled={isCleared}
        id={inputId}
        onChange={(e) => {
          onChange(e.target.value)
        }}
        placeholder={getPlaceholder(isCleared, fieldConfig)}
        type={fieldConfig.type ?? "text"}
        value={isCleared ? "" : value}
      />
    </div>
  )
}

const PplFieldsSection = ({
  clearedFields,
  description,
  fields,
  heading,
  onClear,
  onFieldChange,
  values,
}: {
  clearedFields: ReadonlySet<PplTextField>
  description?: string | undefined
  fields: readonly FieldConfig[]
  heading: string
  onClear: (field: PplTextField) => void
  onFieldChange: (field: PplTextField, value: string) => void
  values: PplFormValues
}) => (
  <div className="border-t px-6 py-4">
    <Heading className={description === undefined ? "mb-4" : "mb-2"} level="h2">
      {heading}
    </Heading>
    {description !== undefined && (
      <Text className="mb-4 text-sm text-ui-fg-subtle">{description}</Text>
    )}
    <div className="grid grid-cols-2 gap-4">
      {fields.map((f) => (
        <FormField
          fieldConfig={f}
          isCleared={clearedFields.has(f.field)}
          key={f.field}
          onChange={(v) => {
            onFieldChange(f.field, v)
          }}
          onClear={() => {
            onClear(f.field)
          }}
          value={values[f.field]}
        />
      ))}
    </div>
  </div>
)

const PplGeneralSection = ({
  isEnabled,
  labelFormat,
  onEnabledChange,
  onLabelFormatChange,
}: {
  isEnabled: boolean
  labelFormat: string
  onEnabledChange: (checked: boolean) => void
  onLabelFormatChange: (value: string) => void
}) => (
  <div className="px-6 py-4">
    <Heading className="mb-4" level="h2">
      General
    </Heading>
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="ppl-is-enabled" id="ppl-is-enabled-label">
            Enable PPL
          </Label>
          <Text className="text-sm text-ui-fg-subtle" id="ppl-is-enabled-desc">
            Enable or disable PPL shipping integration
          </Text>
        </div>
        <Switch
          aria-describedby="ppl-is-enabled-desc"
          aria-labelledby="ppl-is-enabled-label"
          checked={isEnabled}
          id="ppl-is-enabled"
          onCheckedChange={onEnabledChange}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="ppl-label-format">Label Format</Label>
        <Select onValueChange={onLabelFormatChange} value={labelFormat}>
          <Select.Trigger id="ppl-label-format">
            <Select.Value placeholder="Select format" />
          </Select.Trigger>
          <Select.Content>
            {LABEL_FORMATS.map((f) => (
              <Select.Item key={f.value} value={f.value}>
                {f.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>
    </div>
  </div>
)

const PplSettingsScreen = ({
  config,
  error,
}: {
  config: PplConfigResponse | undefined
  error: Error | null
}) => {
  const queryClient = useQueryClient()
  const [formValues, setFormValues] = useState<PplFormValues>(() =>
    normalizePplFormValues(config),
  )
  const [clearedFields, setClearedFields] = useState<ReadonlySet<PplTextField>>(
    () => new Set<PplTextField>(),
  )

  const { mutate, isPending } = useMutation({
    mutationFn: async (payload: PplConfigInput) =>
      await sdk.client.fetch("/admin/ppl-config", {
        body: payload,
        method: "POST",
      }),
    onError: (err) => {
      toast.error(`Failed to save configuration: ${err.message}`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ppl-config"] })
      setFormValues((previous) => ({ ...previous, ...BLANK_SENSITIVE_VALUES }))
      setClearedFields(new Set<PplTextField>())
      toast.success("PPL configuration saved")
    },
  })

  const handleFieldChange = (field: PplTextField, value: string) => {
    setFormValues((previous) => ({ ...previous, [field]: value }))
    // If user types in a cleared field, unmark it
    if (clearedFields.has(field)) {
      setClearedFields((previous) => {
        const next = new Set(previous)
        next.delete(field)
        return next
      })
    }
  }

  const handleClearField = (field: PplTextField) => {
    setClearedFields((previous) => new Set(previous).add(field))
  }

  const handleEnabledChange = (checked: boolean) => {
    setFormValues((previous) => ({ ...previous, is_enabled: checked }))
  }

  const handleLabelFormatChange = (value: string) => {
    setFormValues((previous) => ({ ...previous, default_label_format: value }))
  }

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutate(buildPplConfigPayload(formValues, clearedFields))
  }

  if (error) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h1">PPL Configuration</Heading>
        </div>
        <div className="px-6 py-4">
          <Text className="text-ui-fg-error">
            Error loading configuration. Make sure the PPL module is enabled.
          </Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">PPL Configuration</Heading>
        <Text className="text-ui-fg-subtle">
          Environment: {config?.environment}
        </Text>
      </div>

      <form onSubmit={handleSubmit}>
        <PplGeneralSection
          isEnabled={formValues.is_enabled}
          labelFormat={formValues.default_label_format}
          onEnabledChange={handleEnabledChange}
          onLabelFormatChange={handleLabelFormatChange}
        />

        <PplFieldsSection
          clearedFields={clearedFields}
          fields={buildCredentialFields(config)}
          heading="API Credentials"
          onClear={handleClearField}
          onFieldChange={handleFieldChange}
          values={formValues}
        />

        <PplFieldsSection
          clearedFields={clearedFields}
          description="Bank details for cash on delivery payments"
          fields={buildCodFields(config)}
          heading="COD Banking"
          onClear={handleClearField}
          onFieldChange={handleFieldChange}
          values={formValues}
        />

        <PplFieldsSection
          clearedFields={clearedFields}
          description="Used when PPL customer has no address configured"
          fields={SENDER_FIELDS}
          heading="Fallback Sender Address"
          onClear={handleClearField}
          onFieldChange={handleFieldChange}
          values={formValues}
        />

        {/* Save */}
        <div className="flex justify-end border-t px-6 py-4">
          <Button isLoading={isPending} type="submit">
            Save Changes
          </Button>
        </div>
      </form>
    </Container>
  )
}

const PplSettingsPage = () => {
  const { data, isLoading, error } = useQuery({
    queryFn: async () =>
      await sdk.client.fetch<{ config: PplConfigResponse }>(
        "/admin/ppl-config",
      ),
    queryKey: ["ppl-config"],
  })

  if (isLoading) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h1">PPL Configuration</Heading>
        </div>
        <div className="px-6 py-4">
          <Text>Loading...</Text>
        </div>
      </Container>
    )
  }

  const pplConfig = data?.config

  // Remount once the first successful load arrives so the form seeds from it;
  // afterwards the key is stable, keeping edits across background refetch errors.
  return (
    <PplSettingsScreen
      config={pplConfig}
      error={error}
      key={pplConfig === undefined ? "ppl-config-empty" : "ppl-config-loaded"}
    />
  )
}

export const config = defineRouteConfig({
  label: "PPL",
})

export default PplSettingsPage
