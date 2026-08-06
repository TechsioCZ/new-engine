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
import type { SyntheticEvent } from "react"
import { z } from "zod"

import { sdk } from "../../../lib/sdk"

export const handle = {
  breadcrumb: () => "Packeta",
}

const packetaConfigResponseSchema = z.object({
  api_password_set: z.boolean(),
  cod_bank_account_set: z.boolean(),
  cod_bank_code_set: z.boolean(),
  cod_iban_set: z.boolean(),
  cod_swift_set: z.boolean(),
  default_label_format: z.string(),
  default_label_offset: z.number(),
  environment: z.string(),
  eshop_id: z.string().nullable(),
  id: z.string(),
  is_enabled: z.boolean(),
  sender_city: z.string().nullable(),
  sender_country: z.string().nullable(),
  sender_email: z.string().nullable(),
  sender_label: z.string().nullable(),
  sender_name: z.string().nullable(),
  sender_phone: z.string().nullable(),
  sender_street: z.string().nullable(),
  sender_zip_code: z.string().nullable(),
})
const packetaConfigEnvelopeSchema = z.object({
  config: packetaConfigResponseSchema,
})

type PacketaConfigResponse = z.infer<typeof packetaConfigResponseSchema>

interface PacketaConfigInput {
  is_enabled?: boolean
  api_password?: string | null
  sender_label?: string
  eshop_id?: string
  default_label_format?: string
  default_label_offset?: number
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

const CLEARABLE_FIELDS = [
  "api_password",
  "cod_bank_account",
  "cod_bank_code",
  "cod_iban",
  "cod_swift",
] as const satisfies readonly (keyof PacketaConfigInput)[]

type ClearableField = (typeof CLEARABLE_FIELDS)[number]
type PacketaConfigPayload = Partial<PacketaConfigInput> &
  Partial<Record<ClearableField, string | null>>

const CLEARABLE_FIELD_SET: ReadonlySet<keyof PacketaConfigInput> = new Set(
  CLEARABLE_FIELDS,
)

const isClearableField = (
  field: keyof PacketaConfigInput,
): field is ClearableField => CLEARABLE_FIELD_SET.has(field)

const getStringField = (
  data: PacketaConfigInput,
  field: keyof PacketaConfigInput,
): string => {
  const value: unknown = data[field]
  return typeof value === "string" ? value : ""
}

const LABEL_FORMATS = [
  { label: "A6 (thermal)", value: "A6" },
  { label: "A7", value: "A7" },
]

const DEFAULT_LABEL_FORMAT = "A6"

interface FieldConfig {
  field: keyof PacketaConfigInput
  label: string
  placeholder: string
  type?: "text" | "password" | "email"
  isSet?: boolean
  colSpan?: 1 | 2
}

const SENDER_FIELDS: FieldConfig[] = [
  { field: "sender_name", label: "Name", placeholder: "Company name" },
  { field: "sender_street", label: "Street", placeholder: "Street address" },
  { field: "sender_city", label: "City", placeholder: "City" },
  {
    field: "sender_zip_code",
    label: "ZIP Code",
    placeholder: "Postal code",
  },
  {
    field: "sender_country",
    label: "Country",
    placeholder: "Country code (e.g., CZ)",
  },
  { field: "sender_phone", label: "Phone", placeholder: "Phone number" },
  {
    colSpan: 2,
    field: "sender_email",
    label: "Email",
    placeholder: "Email address",
    type: "email",
  },
]

const getPlaceholder = (
  fieldConfig: FieldConfig,
  isCleared = false,
): string => {
  if (isCleared) {
    return "Value will be cleared"
  }
  if (fieldConfig.isSet === true) {
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
  onClear?: () => void
  isCleared?: boolean
}) => {
  const inputId = `packeta-${fieldConfig.field}`
  const canClear =
    CLEARABLE_FIELD_SET.has(fieldConfig.field) &&
    fieldConfig.isSet === true &&
    isCleared !== true
  let settingIndicator = null
  if (isCleared === true) {
    settingIndicator = (
      <span className="text-ui-fg-error">(will be cleared)</span>
    )
  } else if (fieldConfig.isSet === true) {
    settingIndicator = <span className="text-ui-fg-subtle">(set)</span>
  }

  return (
    <div
      className={`flex flex-col gap-2 ${fieldConfig.colSpan === 2 ? "col-span-2" : ""}`}
    >
      <div className="flex items-center justify-between">
        <Label htmlFor={inputId}>
          {fieldConfig.label} {settingIndicator}
        </Label>
        {canClear && onClear !== undefined ? (
          <button
            className="text-sm text-ui-fg-subtle hover:text-ui-fg-error"
            onClick={onClear}
            type="button"
          >
            Clear
          </button>
        ) : null}
      </div>
      <Input
        disabled={isCleared === true}
        id={inputId}
        onChange={(e) => {
          onChange(e.target.value)
        }}
        placeholder={getPlaceholder(fieldConfig, isCleared)}
        type={fieldConfig.type ?? "text"}
        value={isCleared === true ? "" : value}
      />
    </div>
  )
}

const toPacketaFormData = (
  packetaConfig: PacketaConfigResponse,
): PacketaConfigInput => ({
  default_label_format:
    packetaConfig.default_label_format.length === 0
      ? DEFAULT_LABEL_FORMAT
      : packetaConfig.default_label_format,
  default_label_offset: packetaConfig.default_label_offset,
  eshop_id: packetaConfig.eshop_id ?? "",
  is_enabled: packetaConfig.is_enabled,
  sender_city: packetaConfig.sender_city ?? "",
  sender_country: packetaConfig.sender_country ?? "",
  sender_email: packetaConfig.sender_email ?? "",
  sender_label: packetaConfig.sender_label ?? "",
  sender_name: packetaConfig.sender_name ?? "",
  sender_phone: packetaConfig.sender_phone ?? "",
  sender_street: packetaConfig.sender_street ?? "",
  sender_zip_code: packetaConfig.sender_zip_code ?? "",
})

const PacketaSettingsForm = ({
  packetaConfig,
}: {
  packetaConfig: PacketaConfigResponse
}) => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<PacketaConfigInput>(() =>
    toPacketaFormData(packetaConfig),
  )
  const [clearedFields, setClearedFields] = useState<Set<ClearableField>>(
    new Set(),
  )

  const { mutate, isPending } = useMutation({
    mutationFn: async (payload: PacketaConfigInput) =>
      await sdk.client.fetch("/admin/packeta-config", {
        body: payload,
        method: "POST",
      }),
    onError: (err) => {
      toast.error(`Failed to save configuration: ${err.message}`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["packeta-config"] })
      toast.success("Packeta configuration saved")
    },
  })

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    const payload: PacketaConfigPayload = { ...formData }
    if (payload.default_label_format === "") {
      delete payload.default_label_format
    }
    for (const field of clearedFields) {
      payload[field] = null
    }
    mutate(payload)
  }

  const updateField = (
    field: keyof PacketaConfigInput,
    value: string | boolean | number,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (isClearableField(field) && clearedFields.has(field)) {
      setClearedFields((prev) => {
        const next = new Set(prev)
        next.delete(field)
        return next
      })
    }
  }

  const clearField = (field: keyof PacketaConfigInput) => {
    if (!isClearableField(field)) {
      return
    }
    setClearedFields((prev) => new Set(prev).add(field))
  }

  const isFieldCleared = (field: keyof PacketaConfigInput) =>
    isClearableField(field) && clearedFields.has(field)

  const credentialFields: FieldConfig[] = [
    {
      colSpan: 2,
      field: "api_password",
      isSet: packetaConfig?.api_password_set ?? false,
      label: "API Password",
      placeholder: "Your Packeta API password",
      type: "password",
    },
    {
      field: "sender_label",
      label: "Sender Label (eshop)",
      placeholder: "Eshop identifier shown on labels",
    },
    {
      field: "eshop_id",
      label: "Eshop ID",
      placeholder: "Optional, account-specific",
    },
  ]

  const codFields: FieldConfig[] = [
    {
      field: "cod_bank_account",
      isSet: packetaConfig?.cod_bank_account_set ?? false,
      label: "Bank Account",
      placeholder: "Bank account",
    },
    {
      field: "cod_bank_code",
      isSet: packetaConfig?.cod_bank_code_set ?? false,
      label: "Bank Code",
      placeholder: "Bank code",
    },
    {
      field: "cod_iban",
      isSet: packetaConfig?.cod_iban_set ?? false,
      label: "IBAN",
      placeholder: "IBAN (alternative)",
    },
    {
      field: "cod_swift",
      isSet: packetaConfig?.cod_swift_set ?? false,
      label: "SWIFT",
      placeholder: "SWIFT (with IBAN)",
    },
  ]

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">Packeta Configuration</Heading>
        <Text className="text-ui-fg-subtle">
          Environment: {packetaConfig?.environment}
        </Text>
      </div>

      <form onSubmit={handleSubmit}>
        {/* General */}
        <div className="px-6 py-4">
          <Heading className="mb-4" level="h2">
            General
          </Heading>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <Label
                  htmlFor="packeta-is-enabled"
                  id="packeta-is-enabled-label"
                >
                  Enable Packeta
                </Label>
                <Text
                  className="text-sm text-ui-fg-subtle"
                  id="packeta-is-enabled-desc"
                >
                  Enable or disable Packeta shipping integration
                </Text>
              </div>
              <Switch
                aria-describedby="packeta-is-enabled-desc"
                aria-labelledby="packeta-is-enabled-label"
                checked={formData.is_enabled ?? false}
                id="packeta-is-enabled"
                onCheckedChange={(checked) => {
                  updateField("is_enabled", checked)
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="packeta-label-format">Label Format</Label>
                <Select
                  onValueChange={(value) => {
                    updateField("default_label_format", value)
                  }}
                  value={
                    formData.default_label_format ??
                    packetaConfig?.default_label_format ??
                    DEFAULT_LABEL_FORMAT
                  }
                >
                  <Select.Trigger id="packeta-label-format">
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
              <div className="flex flex-col gap-2">
                <Label htmlFor="packeta-label-offset">Label Offset</Label>
                <Input
                  id="packeta-label-offset"
                  max={3}
                  min={0}
                  onChange={(e) => {
                    const offset = Math.trunc(Number(e.target.value))
                    updateField(
                      "default_label_offset",
                      Number.isFinite(offset) ? offset : 0,
                    )
                  }}
                  type="number"
                  value={formData.default_label_offset ?? 0}
                />
              </div>
            </div>
          </div>
        </div>

        {/* API Credentials */}
        <div className="border-t px-6 py-4">
          <Heading className="mb-4" level="h2">
            API Credentials
          </Heading>
          <div className="grid grid-cols-2 gap-4">
            {credentialFields.map((f) => (
              <FormField
                fieldConfig={f}
                isCleared={isFieldCleared(f.field)}
                key={f.field}
                onChange={(v) => {
                  updateField(f.field, v)
                }}
                onClear={() => {
                  clearField(f.field)
                }}
                value={getStringField(formData, f.field)}
              />
            ))}
          </div>
        </div>

        {/* COD Banking */}
        <div className="border-t px-6 py-4">
          <Heading className="mb-2" level="h2">
            COD Banking
          </Heading>
          <Text className="mb-4 text-sm text-ui-fg-subtle">
            Bank details for cash on delivery payments
          </Text>
          <div className="grid grid-cols-2 gap-4">
            {codFields.map((f) => (
              <FormField
                fieldConfig={f}
                isCleared={isFieldCleared(f.field)}
                key={f.field}
                onChange={(v) => {
                  updateField(f.field, v)
                }}
                onClear={() => {
                  clearField(f.field)
                }}
                value={getStringField(formData, f.field)}
              />
            ))}
          </div>
        </div>

        {/* Fallback Sender Address */}
        <div className="border-t px-6 py-4">
          <Heading className="mb-2" level="h2">
            Fallback Sender Address
          </Heading>
          <Text className="mb-4 text-sm text-ui-fg-subtle">
            Used when no sender is configured in Packeta
          </Text>
          <div className="grid grid-cols-2 gap-4">
            {SENDER_FIELDS.map((f) => (
              <FormField
                fieldConfig={f}
                key={f.field}
                onChange={(v) => {
                  updateField(f.field, v)
                }}
                value={getStringField(formData, f.field)}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end border-t px-6 py-4">
          <Button isLoading={isPending} type="submit">
            Save Changes
          </Button>
        </div>
      </form>
    </Container>
  )
}

const PacketaSettingsPage = () => {
  const { data, dataUpdatedAt, error, isLoading } = useQuery({
    queryFn: async () => {
      const response: unknown = await sdk.client.fetch<unknown>(
        "/admin/packeta-config",
      )
      return packetaConfigEnvelopeSchema.parse(response)
    },
    queryKey: ["packeta-config"],
  })

  if (isLoading) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h1">Packeta Configuration</Heading>
        </div>
        <div className="px-6 py-4">
          <Text>Loading...</Text>
        </div>
      </Container>
    )
  }

  if (error !== null || data === undefined) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h1">Packeta Configuration</Heading>
        </div>
        <div className="px-6 py-4">
          <Text className="text-ui-fg-error">
            Error loading configuration. Make sure the Packeta module is
            enabled.
          </Text>
        </div>
      </Container>
    )
  }

  return <PacketaSettingsForm key={dataUpdatedAt} packetaConfig={data.config} />
}

export const config = defineRouteConfig({
  label: "Packeta",
})

export default PacketaSettingsPage
