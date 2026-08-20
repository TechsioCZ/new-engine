import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Button,
  Checkbox,
  Container,
  Heading,
  Input,
  Label,
  Prompt,
  Select,
  Switch,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { type FormEvent, useEffect, useState } from "react"
import type {
  GLSCountryCode,
  GLSEnvironment,
  GLSPrinterType,
} from "../../../../modules/gls-client/types"
import { sdk } from "../../../lib/sdk"

export const handle = {
  breadcrumb: () => "GLS",
}

type GLSConfigResponse = {
  id: string
  environment: GLSEnvironment
  is_active: boolean
  is_enabled: boolean
  username: string | null
  password_set: boolean
  client_number: number | null
  country_code: GLSCountryCode
  supported_countries: GLSCountryCode[]
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

type GLSProfilesResponse = {
  active_environment: GLSEnvironment
  profiles: GLSConfigResponse[]
}

type GLSConfigInput = {
  is_enabled?: boolean
  username?: string
  password?: string | null
  client_number?: number | null
  country_code?: string
  supported_countries?: GLSCountryCode[]
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
  { value: "SK", label: "Slovakia (api.mygls.sk)" },
  { value: "CZ", label: "Czechia (api.mygls.cz)" },
  { value: "HU", label: "Hungary (api.mygls.hu)" },
  { value: "HR", label: "Croatia (api.mygls.hr)" },
  { value: "RO", label: "Romania (api.mygls.ro)" },
  { value: "SI", label: "Slovenia (api.mygls.si)" },
  { value: "RS", label: "Serbia (api.mygls.rs)" },
]

const STOREFRONT_MARKETS = COUNTRY_CODES.filter((country) =>
  ["SK", "CZ", "HU", "RO"].includes(country.value)
)

const PRINTER_TYPES = [
  { value: "A4_2x2", label: "A4 2×2" },
  { value: "A4_4x1", label: "A4 4×1" },
  { value: "Connect", label: "Connect" },
  { value: "Thermo", label: "Thermo" },
  { value: "ThermoZPL", label: "Thermo ZPL" },
  { value: "ThermoZPL_300DPI", label: "Thermo ZPL 300 DPI" },
  { value: "ShipItThermoPdf", label: "ShipIt Thermo PDF" },
  { value: "ShipItThermoZpl", label: "ShipIt Thermo ZPL" },
]

const CLEARABLE_FIELDS = [
  "password",
] as const satisfies readonly (keyof GLSConfigInput)[]
type ClearableField = (typeof CLEARABLE_FIELDS)[number]

const CLEARABLE_FIELD_SET: ReadonlySet<keyof GLSConfigInput> = new Set(
  CLEARABLE_FIELDS
)

const isClearableField = (
  field: keyof GLSConfigInput
): field is ClearableField => CLEARABLE_FIELD_SET.has(field)

const getStringField = (
  data: GLSConfigInput,
  field: keyof GLSConfigInput
): string => {
  const value: unknown = data[field]
  return typeof value === "string" ? value : ""
}

const buildConfigPayload = (data: GLSConfigInput): GLSConfigInput => {
  const payload: GLSConfigInput = { ...data }
  for (const field of Object.keys(payload) as (keyof GLSConfigInput)[]) {
    if (payload[field] === "") {
      delete payload[field]
    }
  }
  return payload
}

type FieldConfig = {
  field: keyof GLSConfigInput
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
  const inputId = `gls-${fieldConfig.field}`
  const canClear =
    CLEARABLE_FIELD_SET.has(fieldConfig.field) &&
    fieldConfig.isSet &&
    !isCleared

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
        type={fieldConfig.type ?? "text"}
        value={isCleared ? "" : value}
      />
    </div>
  )
}

const buildSenderFormData = (
  configuration: GLSConfigResponse
): GLSConfigInput => ({
  sender_name: configuration.sender_name ?? "",
  sender_street: configuration.sender_street ?? "",
  sender_house_number: configuration.sender_house_number ?? "",
  sender_house_number_info: configuration.sender_house_number_info ?? "",
  sender_city: configuration.sender_city ?? "",
  sender_zip_code: configuration.sender_zip_code ?? "",
  sender_country:
    configuration.sender_country ?? configuration.country_code ?? "SK",
  sender_phone: configuration.sender_phone ?? "",
  sender_email: configuration.sender_email ?? "",
})

const buildFormDataFromConfig = (
  configuration: GLSConfigResponse
): GLSConfigInput => ({
  is_enabled: configuration.is_enabled,
  username: configuration.username ?? "",
  client_number: configuration.client_number ?? null,
  country_code: configuration.country_code ?? "SK",
  supported_countries: configuration.supported_countries,
  type_of_printer: configuration.type_of_printer ?? "A4_2x2",
  print_position: configuration.print_position ?? 1,
  hide_phone_number_on_labels:
    configuration.hide_phone_number_on_labels ?? false,
  ...buildSenderFormData(configuration),
})

const GLSSettingsPage = () => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<GLSConfigInput>({})
  const [clearedFields, setClearedFields] = useState<Set<ClearableField>>(
    new Set()
  )
  const [seededConfigId, setSeededConfigId] = useState<string | null>(null)
  const [selectedEnvironment, setSelectedEnvironment] =
    useState<GLSEnvironment | null>(null)
  const [confirmProductionActivation, setConfirmProductionActivation] =
    useState(false)

  const { data, isLoading, error } = useQuery({
    queryFn: () => sdk.client.fetch<GLSProfilesResponse>("/admin/gls-config"),
    queryKey: ["gls-config"],
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: GLSConfigInput & { environment: GLSEnvironment }) =>
      sdk.client.fetch("/admin/gls-config", {
        method: "POST",
        body: payload,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["gls-config"] })
      setSeededConfigId(null)
      toast.success("GLS configuration saved")
    },
    onError: (err) => {
      toast.error(
        `Failed to save configuration: ${err instanceof Error ? err.message : String(err)}`
      )
    },
  })

  const { mutate: activateProfile, isPending: isActivating } = useMutation({
    mutationFn: (environment: GLSEnvironment) =>
      sdk.client.fetch("/admin/gls-config/active", {
        method: "POST",
        body: { environment, confirmed: environment === "production" },
      }),
    onSuccess: async () => {
      setConfirmProductionActivation(false)
      await queryClient.invalidateQueries({ queryKey: ["gls-config"] })
      toast.success("GLS configuration profile activated")
    },
    onError: (err) => {
      toast.error(
        `Failed to activate profile: ${err instanceof Error ? err.message : String(err)}`
      )
    },
  })

  const displayedEnvironment =
    selectedEnvironment ?? data?.active_environment ?? "testing"
  const glsConfig = data?.profiles.find(
    (profile) => profile.environment === displayedEnvironment
  )

  useEffect(() => {
    setSelectedEnvironment((current) =>
      current &&
      data?.profiles.some((profile) => profile.environment === current)
        ? current
        : (data?.active_environment ?? null)
    )
  }, [data])

  useEffect(() => {
    if (!(glsConfig && glsConfig.id !== seededConfigId)) {
      return
    }

    setFormData(buildFormDataFromConfig(glsConfig))
    setClearedFields(new Set())
    setSeededConfigId(glsConfig.id)
  }, [glsConfig, seededConfigId])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const payload = buildConfigPayload(formData)
    for (const field of clearedFields) {
      payload[field] = null
    }
    mutate({ ...payload, environment: displayedEnvironment })
  }

  const handleActivate = () => {
    if (displayedEnvironment === "production") {
      setConfirmProductionActivation(true)
      return
    }

    activateProfile(displayedEnvironment)
  }

  const updateField = (
    field: keyof GLSConfigInput,
    value: string | boolean | number | GLSCountryCode[] | null
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

  const clearField = (field: keyof GLSConfigInput) => {
    if (!isClearableField(field)) {
      return
    }
    setClearedFields((prev) => new Set(prev).add(field))
  }

  const isFieldCleared = (field: keyof GLSConfigInput) =>
    isClearableField(field) && clearedFields.has(field)

  const updateSupportedCountry = (
    country: GLSCountryCode,
    enabled: boolean
  ) => {
    const currentCountries = formData.supported_countries ?? []
    const nextCountries = enabled
      ? [...currentCountries, country]
      : currentCountries.filter((value) => value !== country)
    updateField("supported_countries", Array.from(new Set(nextCountries)))
  }

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
      field: "username",
      label: "MyGLS Username (email)",
      placeholder: "name@example.com",
      type: "email",
      colSpan: 2,
    },
    {
      field: "password",
      label: "MyGLS Password",
      placeholder: "Your MyGLS password",
      type: "password",
      isSet: glsConfig?.password_set,
      colSpan: 2,
    },
  ]

  const senderFields: FieldConfig[] = [
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
        <Heading level="h1">GLS Configuration</Heading>
      </div>

      <div className="px-6 py-4">
        <div className="flex items-end justify-between gap-4">
          <div className="flex w-full max-w-md flex-col gap-2">
            <Label htmlFor="gls-configuration-profile">
              Configuration profile
            </Label>
            <Select
              onValueChange={(value) => {
                setSelectedEnvironment(value as GLSEnvironment)
                setSeededConfigId(null)
              }}
              value={displayedEnvironment}
            >
              <Select.Trigger id="gls-configuration-profile">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="testing">Testing</Select.Item>
                <Select.Item value="production">Production</Select.Item>
              </Select.Content>
            </Select>
          </div>
          <Button
            disabled={glsConfig?.is_active || isActivating}
            isLoading={isActivating}
            onClick={handleActivate}
            type="button"
            variant={
              displayedEnvironment === "production" && !glsConfig?.is_active
                ? "danger"
                : "secondary"
            }
          >
            {glsConfig?.is_active ? "Active profile" : "Activate profile"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
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
                <Text
                  className="text-sm text-ui-fg-subtle"
                  id="gls-is-enabled-desc"
                >
                  Enable or disable GLS shipping integration
                </Text>
              </div>
              <Switch
                aria-describedby="gls-is-enabled-desc"
                aria-labelledby="gls-is-enabled-label"
                checked={formData.is_enabled ?? false}
                id="gls-is-enabled"
                onCheckedChange={(checked) =>
                  updateField("is_enabled", checked)
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="gls-country-code">Account country</Label>
                <Select
                  onValueChange={(value) => updateField("country_code", value)}
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
                  onChange={(e) =>
                    updateField(
                      "client_number",
                      e.target.value
                        ? Number.parseInt(e.target.value, 10)
                        : null
                    )
                  }
                  placeholder="GLS client number"
                  type="number"
                  value={formData.client_number ?? ""}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Supported storefront markets</Label>
              <Text className="text-sm text-ui-fg-subtle">
                Pickup points and GLS checkout options are limited to these
                markets.
              </Text>
              <div className="grid grid-cols-2 gap-3 pt-1">
                {STOREFRONT_MARKETS.map((country) => {
                  const checkboxId = `gls-supported-country-${country.value.toLowerCase()}`
                  return (
                    <div
                      className="flex items-center gap-2"
                      key={country.value}
                    >
                      <Checkbox
                        checked={
                          formData.supported_countries?.includes(
                            country.value as GLSCountryCode
                          ) ?? false
                        }
                        id={checkboxId}
                        onCheckedChange={(checked) =>
                          updateSupportedCountry(
                            country.value as GLSCountryCode,
                            checked === true
                          )
                        }
                      />
                      <Label htmlFor={checkboxId}>
                        {country.label.split(" (")[0]}
                      </Label>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t px-6 py-4">
          <Heading className="mb-4" level="h2">
            API Credentials
          </Heading>
          <div className="grid grid-cols-2 gap-4">
            {credentialFields.map((field) => (
              <FormField
                fieldConfig={field}
                isCleared={isFieldCleared(field.field)}
                key={field.field}
                onChange={(value) => updateField(field.field, value)}
                onClear={() => clearField(field.field)}
                value={getStringField(formData, field.field)}
              />
            ))}
          </div>
        </div>

        <div className="border-t px-6 py-4">
          <Heading className="mb-4" level="h2">
            Label Printing
          </Heading>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="gls-printer-type">Type of Printer</Label>
              <Select
                onValueChange={(value) => updateField("type_of_printer", value)}
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
                onChange={(e) =>
                  updateField(
                    "print_position",
                    Number.parseInt(e.target.value, 10) || 1
                  )
                }
                type="number"
                value={formData.print_position ?? 1}
              />
            </div>
            <div className="col-span-2 flex items-center justify-between">
              <div>
                <Label htmlFor="gls-hide-phone">
                  Hide phone number on labels
                </Label>
                <Text className="text-sm text-ui-fg-subtle">
                  Optional MyGLS print flag
                </Text>
              </div>
              <Switch
                checked={formData.hide_phone_number_on_labels ?? false}
                id="gls-hide-phone"
                onCheckedChange={(checked) =>
                  updateField("hide_phone_number_on_labels", checked)
                }
              />
            </div>
          </div>
        </div>

        <div className="border-t px-6 py-4">
          <Heading className="mb-2" level="h2">
            Sender Address
          </Heading>
          <Text className="mb-4 text-sm text-ui-fg-subtle">
            MyGLS sends this as PickupAddress when creating labels.
          </Text>
          <div className="grid grid-cols-2 gap-4">
            {senderFields.map((field) => (
              <FormField
                fieldConfig={field}
                key={field.field}
                onChange={(value) => updateField(field.field, value)}
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
      <Prompt
        onOpenChange={setConfirmProductionActivation}
        open={confirmProductionActivation}
        variant="confirmation"
      >
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>Activate GLS Production?</Prompt.Title>
            <Prompt.Description>
              New GLS fulfillment operations will use the saved Production
              credentials immediately. Existing shipments remain bound to the
              profile that created them.
            </Prompt.Description>
          </Prompt.Header>
          <Prompt.Footer>
            <Prompt.Cancel type="button">Cancel</Prompt.Cancel>
            <Prompt.Action
              disabled={isActivating}
              onClick={() => activateProfile("production")}
              type="button"
            >
              Activate Production
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "GLS",
})

export default GLSSettingsPage
