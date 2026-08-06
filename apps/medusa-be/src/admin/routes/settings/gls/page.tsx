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
import { useEffect, useRef, useState } from "react"
import type { SubmitEvent } from "react"

import type {
  GLSCountryCode,
  GLSEnvironment,
  GLSPrinterType,
} from "../../../../modules/gls-client/types"
import { sdk } from "../../../lib/sdk"

export const handle = {
  breadcrumb: () => "GLS",
}

interface GLSConfigResponse {
  id: string
  environment: GLSEnvironment
  is_enabled: boolean
  username: string | null
  password_set: boolean
  client_number: number | null
  country_code: GLSCountryCode
  webshop_engine: string | null
  type_of_printer: GLSPrinterType
  print_position: number
  hide_phone_number_on_labels: boolean
  sender_name: string | null
  sender_street: string | null
  sender_house_number: string | null
  sender_house_number_info: string | null
  sender_city: string | null
  sender_zip_code: string | null
  sender_country: string | null
  sender_phone: string | null
  sender_email: string | null
}

interface GLSConfigInput {
  is_enabled?: boolean
  username?: string
  password?: string | null
  client_number?: number | null
  country_code?: string
  webshop_engine?: string
  type_of_printer?: string
  print_position?: number
  hide_phone_number_on_labels?: boolean
  sender_name?: string
  sender_street?: string
  sender_house_number?: string
  sender_house_number_info?: string
  sender_city?: string
  sender_zip_code?: string
  sender_country?: string
  sender_phone?: string
  sender_email?: string
}

const COUNTRY_CODES = [
  { label: "Slovakia (api.mygls.sk)", value: "SK" },
  { label: "Czechia (api.mygls.cz)", value: "CZ" },
  { label: "Hungary (api.mygls.hu)", value: "HU" },
  { label: "Croatia (api.mygls.hr)", value: "HR" },
  { label: "Romania (api.mygls.ro)", value: "RO" },
  { label: "Slovenia (api.mygls.si)", value: "SI" },
  { label: "Serbia (api.mygls.rs)", value: "RS" },
]

const PRINTER_TYPES = [
  { label: "A4 2×2", value: "A4_2x2" },
  { label: "A4 4×1", value: "A4_4x1" },
  { label: "Connect", value: "Connect" },
  { label: "Thermo", value: "Thermo" },
  { label: "Thermo ZPL", value: "ThermoZPL" },
  { label: "Thermo ZPL 300 DPI", value: "ThermoZPL_300DPI" },
  { label: "ShipIt Thermo PDF", value: "ShipItThermoPdf" },
  { label: "ShipIt Thermo ZPL", value: "ShipItThermoZpl" },
]

const CLEARABLE_FIELDS = [
  "password",
] as const satisfies readonly (keyof GLSConfigInput)[]
type ClearableField = (typeof CLEARABLE_FIELDS)[number]

const CLEARABLE_FIELD_SET: ReadonlySet<keyof GLSConfigInput> = new Set(
  CLEARABLE_FIELDS,
)

const isClearableField = (
  field: keyof GLSConfigInput,
): field is ClearableField => CLEARABLE_FIELD_SET.has(field)

const getStringField = (
  data: GLSConfigInput,
  field: keyof GLSConfigInput,
): string => {
  const value: unknown = data[field]
  return typeof value === "string" ? value : ""
}

const buildConfigPayload = (data: GLSConfigInput): GLSConfigInput => {
  const payload: GLSConfigInput = { ...data }
  for (const [field, value] of Object.entries(payload)) {
    if (value === "") {
      Reflect.deleteProperty(payload, field)
    }
  }
  return payload
}

interface FieldConfig {
  field: keyof GLSConfigInput
  label: string
  placeholder: string
  type?: "text" | "password" | "email"
  isSet?: boolean
  colSpan?: 1 | 2
}

const getPlaceholder = (
  fieldConfig: FieldConfig,
  isCleared: boolean | undefined = false,
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
  const inputId = `gls-${fieldConfig.field}`
  const canClear =
    CLEARABLE_FIELD_SET.has(fieldConfig.field) &&
    fieldConfig.isSet === true &&
    isCleared !== true

  return (
    <div
      className={`flex flex-col gap-2 ${fieldConfig.colSpan === 2 ? "col-span-2" : ""}`}
    >
      <div className="flex items-center justify-between">
        <Label htmlFor={inputId}>
          {fieldConfig.label}{" "}
          {isCleared === true ? (
            <span className="text-ui-fg-error">(will be cleared)</span>
          ) : (
            fieldConfig.isSet === true && (
              <span className="text-ui-fg-subtle">(set)</span>
            )
          )}
        </Label>
        {canClear && onClear !== undefined && (
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
        placeholder={getPlaceholder(fieldConfig, isCleared)}
        type={fieldConfig.type ?? "text"}
        value={isCleared === true ? "" : value}
      />
    </div>
  )
}

const buildSenderFormData = (
  configuration: GLSConfigResponse,
): GLSConfigInput => ({
  sender_city: configuration.sender_city ?? "",
  sender_country:
    configuration.sender_country ?? configuration.country_code ?? "SK",
  sender_email: configuration.sender_email ?? "",
  sender_house_number: configuration.sender_house_number ?? "",
  sender_house_number_info: configuration.sender_house_number_info ?? "",
  sender_name: configuration.sender_name ?? "",
  sender_phone: configuration.sender_phone ?? "",
  sender_street: configuration.sender_street ?? "",
  sender_zip_code: configuration.sender_zip_code ?? "",
})

const buildFormDataFromConfig = (
  configuration: GLSConfigResponse,
): GLSConfigInput => ({
  client_number: configuration.client_number ?? null,
  country_code: configuration.country_code ?? "SK",
  hide_phone_number_on_labels:
    configuration.hide_phone_number_on_labels ?? false,
  is_enabled: configuration.is_enabled,
  print_position: configuration.print_position ?? 1,
  type_of_printer: configuration.type_of_printer ?? "A4_2x2",
  username: configuration.username ?? "",
  webshop_engine: configuration.webshop_engine ?? "new-engine-medusa",
  ...buildSenderFormData(configuration),
})

const SENDER_FIELDS: FieldConfig[] = [
  { field: "sender_name", label: "Name", placeholder: "Company name" },
  { field: "sender_street", label: "Street", placeholder: "Street name" },
  {
    field: "sender_house_number",
    label: "House Number",
    placeholder: "123",
  },
  {
    field: "sender_house_number_info",
    label: "House Number Info",
    placeholder: "optional, e.g. /A",
  },
  { field: "sender_city", label: "City", placeholder: "City" },
  {
    field: "sender_zip_code",
    label: "ZIP Code",
    placeholder: "Postal code",
  },
  {
    field: "sender_country",
    label: "Country",
    placeholder: "Country code (e.g., SK)",
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

type UpdateField = (
  field: keyof GLSConfigInput,
  value: GLSConfigInput[keyof GLSConfigInput],
) => void

const GeneralSettings = ({
  formData,
  updateField,
}: {
  formData: GLSConfigInput
  updateField: UpdateField
}) => (
  <div className="px-6 py-4">
    <Heading className="mb-4" level="h2">
      General
    </Heading>
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="gls-is-enabled" id="gls-is-enabled-label">
            Enable GLS
          </Label>
          <Text className="text-sm text-ui-fg-subtle" id="gls-is-enabled-desc">
            Enable or disable GLS shipping integration
          </Text>
        </div>
        <Switch
          aria-describedby="gls-is-enabled-desc"
          aria-labelledby="gls-is-enabled-label"
          checked={formData.is_enabled ?? false}
          id="gls-is-enabled"
          onCheckedChange={(checked) => {
            updateField("is_enabled", checked)
          }}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="gls-country-code">Country Domain</Label>
          <Select
            onValueChange={(value) => {
              updateField("country_code", value)
            }}
            value={formData.country_code ?? "SK"}
          >
            <Select.Trigger id="gls-country-code">
              <Select.Value placeholder="Select country" />
            </Select.Trigger>
            <Select.Content>
              {COUNTRY_CODES.map((country) => (
                <Select.Item key={country.value} value={country.value}>
                  {country.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="gls-client-number">Client Number</Label>
          <Input
            id="gls-client-number"
            min={1}
            onChange={(e) => {
              updateField(
                "client_number",
                e.target.value ? Math.trunc(Number(e.target.value)) : null,
              )
            }}
            placeholder="GLS client number"
            type="number"
            value={formData.client_number ?? ""}
          />
        </div>
      </div>
    </div>
  </div>
)

const LabelPrintingSettings = ({
  formData,
  updateField,
}: {
  formData: GLSConfigInput
  updateField: UpdateField
}) => (
  <div className="border-t px-6 py-4">
    <Heading className="mb-4" level="h2">
      Label Printing
    </Heading>
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="gls-printer-type">Type of Printer</Label>
        <Select
          onValueChange={(value) => {
            updateField("type_of_printer", value)
          }}
          value={formData.type_of_printer ?? "A4_2x2"}
        >
          <Select.Trigger id="gls-printer-type">
            <Select.Value placeholder="Select printer type" />
          </Select.Trigger>
          <Select.Content>
            {PRINTER_TYPES.map((type) => (
              <Select.Item key={type.value} value={type.value}>
                {type.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="gls-print-position">Print Position</Label>
        <Input
          id="gls-print-position"
          max={4}
          min={1}
          onChange={(e) => {
            updateField(
              "print_position",
              Math.trunc(Number(e.target.value)) || 1,
            )
          }}
          type="number"
          value={formData.print_position ?? 1}
        />
      </div>
      <div className="col-span-2 flex items-center justify-between">
        <div>
          <Label htmlFor="gls-hide-phone">Hide phone number on labels</Label>
          <Text className="text-sm text-ui-fg-subtle">
            Optional MyGLS print flag
          </Text>
        </div>
        <Switch
          checked={formData.hide_phone_number_on_labels ?? false}
          id="gls-hide-phone"
          onCheckedChange={(checked) => {
            updateField("hide_phone_number_on_labels", checked)
          }}
        />
      </div>
      <FormField
        fieldConfig={{
          colSpan: 2,
          field: "webshop_engine",
          label: "Webshop Engine",
          placeholder: "new-engine-medusa",
        }}
        onChange={(value) => {
          updateField("webshop_engine", value)
        }}
        value={getStringField(formData, "webshop_engine")}
      />
    </div>
  </div>
)

const GLSSettingsPage = () => {
  const queryClient = useQueryClient()
  const [formState, setFormState] = useState<{
    clearedFields: Set<ClearableField>
    formData: GLSConfigInput
  }>({ clearedFields: new Set(), formData: {} })
  const { clearedFields, formData } = formState
  const seededConfigId = useRef<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryFn: async () =>
      await sdk.client.fetch<{ config: GLSConfigResponse }>(
        "/admin/gls-config",
      ),
    queryKey: ["gls-config"],
  })

  const { mutate, isPending } = useMutation({
    mutationFn: async (payload: GLSConfigInput) =>
      await sdk.client.fetch("/admin/gls-config", {
        body: payload,
        method: "POST",
      }),
    onError: (err) => {
      toast.error(
        `Failed to save configuration: ${err instanceof Error ? err.message : String(err)}`,
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["gls-config"] })
      seededConfigId.current = null
      toast.success("GLS configuration saved")
    },
  })

  const glsConfig = data?.config

  useEffect(() => {
    let cancelled = false
    if (glsConfig && glsConfig.id !== seededConfigId.current) {
      queueMicrotask(() => {
        if (cancelled) {
          return
        }
        setFormState({
          clearedFields: new Set(),
          formData: buildFormDataFromConfig(glsConfig),
        })
        seededConfigId.current = glsConfig.id
      })
    }
    return () => {
      cancelled = true
    }
  }, [glsConfig])

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload = buildConfigPayload(formData)
    for (const field of clearedFields) {
      payload[field] = null
    }
    mutate(payload)
  }

  const updateField = (
    field: keyof GLSConfigInput,
    value: GLSConfigInput[keyof GLSConfigInput],
  ) => {
    setFormState((previous) => {
      const nextClearedFields = new Set(previous.clearedFields)
      if (isClearableField(field)) {
        nextClearedFields.delete(field)
      }
      return {
        clearedFields: nextClearedFields,
        formData: { ...previous.formData, [field]: value },
      }
    })
  }

  const clearField = (field: keyof GLSConfigInput) => {
    if (!isClearableField(field)) {
      return
    }
    setFormState((previous) => ({
      ...previous,
      clearedFields: new Set(previous.clearedFields).add(field),
    }))
  }

  const isFieldCleared = (field: keyof GLSConfigInput) =>
    isClearableField(field) && clearedFields.has(field)

  if (isLoading) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h1">GLS Configuration</Heading>
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
          <Heading level="h1">GLS Configuration</Heading>
        </div>
        <div className="px-6 py-4">
          <Text className="text-ui-fg-error">
            Error loading configuration. Make sure the GLS module is enabled.
          </Text>
        </div>
      </Container>
    )
  }

  const credentialFields: FieldConfig[] = [
    {
      colSpan: 2,
      field: "username",
      label: "MyGLS Username (email)",
      placeholder: "name@example.com",
      type: "email",
    },
    {
      colSpan: 2,
      field: "password",
      ...(glsConfig?.password_set === undefined
        ? {}
        : { isSet: glsConfig.password_set }),
      label: "MyGLS Password",
      placeholder: "Your MyGLS password",
      type: "password",
    },
  ]

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">GLS Configuration</Heading>
        <Text className="text-ui-fg-subtle">
          Environment: {glsConfig?.environment}. MyGLS uses username, password
          and client number — not a separate API key.
        </Text>
      </div>

      <form onSubmit={handleSubmit}>
        <GeneralSettings formData={formData} updateField={updateField} />
        <div className="border-t px-6 py-4">
          <Heading className="mb-4" level="h2">
            MyGLS Credentials
          </Heading>
          <div className="grid grid-cols-2 gap-4">
            {credentialFields.map((field) => (
              <FormField
                fieldConfig={field}
                isCleared={isFieldCleared(field.field)}
                key={field.field}
                onChange={(value) => {
                  updateField(field.field, value)
                }}
                onClear={() => {
                  clearField(field.field)
                }}
                value={getStringField(formData, field.field)}
              />
            ))}
          </div>
        </div>

        <LabelPrintingSettings formData={formData} updateField={updateField} />
        <div className="border-t px-6 py-4">
          <Heading className="mb-2" level="h2">
            Pickup / Sender Address
          </Heading>
          <Text className="mb-4 text-sm text-ui-fg-subtle">
            MyGLS sends this as PickupAddress when creating labels.
          </Text>
          <div className="grid grid-cols-2 gap-4">
            {SENDER_FIELDS.map((field) => (
              <FormField
                fieldConfig={field}
                key={field.field}
                onChange={(value) => {
                  updateField(field.field, value)
                }}
                value={getStringField(formData, field.field)}
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
  label: "GLS",
})

export default GLSSettingsPage
