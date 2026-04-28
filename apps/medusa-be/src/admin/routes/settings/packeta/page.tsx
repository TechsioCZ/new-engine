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
import { useEffect, useState } from "react"
import { sdk } from "../../../lib/sdk"

type PacketaConfigResponse = {
  id: string
  environment: string
  is_enabled: boolean
  api_password_set: boolean
  sender_label: string | null
  eshop_id: string | null
  default_label_format: string
  default_label_offset: number
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

type PacketaConfigInput = {
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

const CLEARABLE_FIELDS = new Set([
  "api_password",
  "cod_bank_account",
  "cod_bank_code",
  "cod_iban",
  "cod_swift",
])

const LABEL_FORMATS = [
  { value: "A6", label: "A6 (thermal)" },
  { value: "A7", label: "A7" },
]

const DEFAULT_LABEL_FORMAT = "A6"

type FieldConfig = {
  field: keyof PacketaConfigInput
  label: string
  placeholder: string
  type?: "text" | "password" | "email"
  isSet?: boolean
  colSpan?: 1 | 2
}

const getPlaceholder = (
  isCleared: boolean | undefined,
  fieldConfig: FieldConfig
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
  onClear?: () => void
  isCleared?: boolean
}) => {
  const inputId = `packeta-${fieldConfig.field}`
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
        {canClear && onClear && (
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
        onChange={(e) => onChange(e.target.value)}
        placeholder={getPlaceholder(isCleared, fieldConfig)}
        type={fieldConfig.type || "text"}
        value={isCleared ? "" : value}
      />
    </div>
  )
}

const PacketaSettingsPage = () => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<PacketaConfigInput>({})
  const [clearedFields, setClearedFields] = useState<Set<string>>(new Set())

  const { data, isLoading, error } = useQuery({
    queryFn: () =>
      sdk.client.fetch<{ config: PacketaConfigResponse }>(
        "/admin/packeta-config"
      ),
    queryKey: ["packeta-config"],
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: PacketaConfigInput) =>
      sdk.client.fetch("/admin/packeta-config", {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packeta-config"] })
      toast.success("Packeta configuration saved")
    },
    onError: (err) => {
      toast.error(`Failed to save configuration: ${err.message}`)
    },
  })

  const packetaConfig = data?.config

  useEffect(() => {
    if (packetaConfig) {
      setFormData({
        is_enabled: packetaConfig.is_enabled,
        sender_label: packetaConfig.sender_label || "",
        eshop_id: packetaConfig.eshop_id || "",
        default_label_format:
          packetaConfig.default_label_format || DEFAULT_LABEL_FORMAT,
        default_label_offset: packetaConfig.default_label_offset,
        sender_name: packetaConfig.sender_name || "",
        sender_street: packetaConfig.sender_street || "",
        sender_city: packetaConfig.sender_city || "",
        sender_zip_code: packetaConfig.sender_zip_code || "",
        sender_country: packetaConfig.sender_country || "",
        sender_phone: packetaConfig.sender_phone || "",
        sender_email: packetaConfig.sender_email || "",
      })
      setClearedFields(new Set())
    }
  }, [packetaConfig])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...formData }
    if (payload.default_label_format === "") {
      payload.default_label_format = undefined
    }
    for (const field of clearedFields) {
      payload[field as keyof PacketaConfigInput] = null as never
    }
    mutate(payload)
  }

  const updateField = (
    field: keyof PacketaConfigInput,
    value: string | boolean | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (clearedFields.has(field)) {
      setClearedFields((prev) => {
        const next = new Set(prev)
        next.delete(field)
        return next
      })
    }
  }

  const clearField = (field: string) => {
    setClearedFields((prev) => new Set(prev).add(field))
  }

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

  if (error) {
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

  const credentialFields: FieldConfig[] = [
    {
      field: "api_password",
      label: "API Password",
      placeholder: "Your Packeta API password",
      type: "password",
      isSet: packetaConfig?.api_password_set,
      colSpan: 2,
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
      label: "Bank Account",
      placeholder: "Bank account",
      isSet: packetaConfig?.cod_bank_account_set,
    },
    {
      field: "cod_bank_code",
      label: "Bank Code",
      placeholder: "Bank code",
      isSet: packetaConfig?.cod_bank_code_set,
    },
    {
      field: "cod_iban",
      label: "IBAN",
      placeholder: "IBAN (alternative)",
      isSet: packetaConfig?.cod_iban_set,
    },
    {
      field: "cod_swift",
      label: "SWIFT",
      placeholder: "SWIFT (with IBAN)",
      isSet: packetaConfig?.cod_swift_set,
    },
  ]

  const senderFields: FieldConfig[] = [
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
      field: "sender_email",
      label: "Email",
      placeholder: "Email address",
      type: "email",
      colSpan: 2,
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
                onCheckedChange={(checked) =>
                  updateField("is_enabled", checked)
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="packeta-label-format">Label Format</Label>
                <Select
                  onValueChange={(value) =>
                    updateField("default_label_format", value)
                  }
                  value={
                    formData.default_label_format ||
                    packetaConfig?.default_label_format ||
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
                  onChange={(e) =>
                    updateField(
                      "default_label_offset",
                      Number.parseInt(e.target.value, 10) || 0
                    )
                  }
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
                isCleared={clearedFields.has(f.field)}
                key={f.field}
                onChange={(v) => updateField(f.field, v)}
                onClear={() => clearField(f.field)}
                value={(formData[f.field] as string) ?? ""}
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
                isCleared={clearedFields.has(f.field)}
                key={f.field}
                onChange={(v) => updateField(f.field, v)}
                onClear={() => clearField(f.field)}
                value={(formData[f.field] as string) ?? ""}
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
            {senderFields.map((f) => (
              <FormField
                fieldConfig={f}
                key={f.field}
                onChange={(v) => updateField(f.field, v)}
                value={(formData[f.field] as string) ?? ""}
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

export const config = defineRouteConfig({
  label: "Packeta",
})

export default PacketaSettingsPage
