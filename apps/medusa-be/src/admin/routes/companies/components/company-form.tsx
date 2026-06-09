import { Button, Drawer, Input, Label, Select, Text } from "@medusajs/ui"
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import type { AdminUpdateCompany } from "../../../../types"
import { useRegions } from "../../../hooks/api"

const requiredCompanyFields = ["name", "email", "currency_code"] as const

type RequiredCompanyField = (typeof requiredCompanyFields)[number]

const isRequiredCompanyField = (field: string): field is RequiredCompanyField =>
  requiredCompanyFields.includes(field as RequiredCompanyField)

const normalizeCompanyFormData = (
  company?: AdminUpdateCompany
): AdminUpdateCompany => ({
  address: company?.address ?? "",
  city: company?.city ?? "",
  country: company?.country ?? "",
  currency_code: company?.currency_code ?? "",
  email: company?.email ?? "",
  logo_url: company?.logo_url ?? "",
  name: company?.name ?? "",
  phone: company?.phone ?? "",
  state: company?.state ?? "",
  zip: company?.zip ?? "",
})

const RequiredLabel = ({
  children,
  required,
}: {
  children: ReactNode
  required?: boolean
}) => (
  <Label size="xsmall">
    {children}
    {required && (
      <span aria-hidden="true" className="text-ui-fg-error">
        {" "}
        *
      </span>
    )}
  </Label>
)

const FieldError = ({ error, id }: { error?: string; id: string }) => {
  if (!error) {
    return null
  }

  return (
    <Text className="text-ui-fg-error" id={id} size="small">
      {error}
    </Text>
  )
}

const CompanyTextInput = ({
  error,
  errorId,
  label,
  name,
  onChange,
  placeholder,
  required,
  type = "text",
  value,
}: {
  error?: string
  errorId: string
  label: string
  name: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  required?: boolean
  type?: string
  value?: string | null
}) => (
  <>
    <RequiredLabel required={required}>{label}</RequiredLabel>
    <Input
      aria-describedby={error ? errorId : undefined}
      aria-invalid={!!error}
      aria-required={required}
      name={name}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      type={type}
      value={value || ""}
    />
    <FieldError error={error} id={errorId} />
  </>
)

export function CompanyForm({
  company,
  handleSubmit,
  loading,
  error,
}: {
  company?: AdminUpdateCompany
  handleSubmit: (data: AdminUpdateCompany) => Promise<void>
  loading: boolean
  error: Error | null
}) {
  const { t } = useTranslation("companies")
  const [formData, setFormData] = useState<AdminUpdateCompany>(
    normalizeCompanyFormData(company)
  )
  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<RequiredCompanyField, string>>
  >({})

  const { regions, isPending: regionsLoading } = useRegions()

  const currencyCodes = regions?.map((region) => region.currency_code)
  const countries = regions?.flatMap((region) => region.countries)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const field = e.target.name

    setFormData({ ...formData, [field]: e.target.value })

    if (isRequiredCompanyField(field)) {
      setValidationErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleCurrencyChange = (value: string) => {
    setFormData({ ...formData, currency_code: value })
    setValidationErrors((prev) => ({ ...prev, currency_code: undefined }))
  }

  const handleCountryChange = (value: string) => {
    setFormData({ ...formData, country: value })
  }

  const validateForm = () => {
    const nextErrors: Partial<Record<RequiredCompanyField, string>> = {}
    const requiredMessage = t("validation.required")

    if (!formData.name?.trim()) {
      nextErrors.name = requiredMessage
    }

    if (!formData.email?.trim()) {
      nextErrors.email = requiredMessage
    }

    if (!formData.currency_code) {
      nextErrors.currency_code = requiredMessage
    }

    setValidationErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    await handleSubmit(normalizeCompanyFormData(formData))
  }

  const hasValidationErrors = Object.values(validationErrors).some(Boolean)

  return (
    <form noValidate onSubmit={handleFormSubmit}>
      <Drawer.Body className="p-4">
        <div className="flex flex-col gap-2">
          <CompanyTextInput
            error={validationErrors.name}
            errorId="company-name-error"
            label={t("fields.name")}
            name="name"
            onChange={handleChange}
            placeholder={t("placeholders.name")}
            required
            type="text"
            value={formData.name || ""}
          />
          <CompanyTextInput
            errorId="company-phone-error"
            label={t("fields.phone")}
            name="phone"
            onChange={handleChange}
            placeholder={t("placeholders.phone")}
            type="text"
            value={formData.phone || ""}
          />
          <CompanyTextInput
            error={validationErrors.email}
            errorId="company-email-error"
            label={t("fields.email")}
            name="email"
            onChange={handleChange}
            placeholder={t("placeholders.email")}
            required
            type="email"
            value={formData.email || ""}
          />
          <CompanyTextInput
            errorId="company-address-error"
            label={t("fields.address")}
            name="address"
            onChange={handleChange}
            placeholder={t("placeholders.address")}
            type="text"
            value={formData.address || ""}
          />
          <CompanyTextInput
            errorId="company-city-error"
            label={t("fields.city")}
            name="city"
            onChange={handleChange}
            placeholder={t("placeholders.city")}
            type="text"
            value={formData.city || ""}
          />
          <CompanyTextInput
            errorId="company-state-error"
            label={t("fields.state")}
            name="state"
            onChange={handleChange}
            placeholder={t("placeholders.state")}
            type="text"
            value={formData.state || ""}
          />
          <CompanyTextInput
            errorId="company-zip-error"
            label={t("fields.zip")}
            name="zip"
            onChange={handleChange}
            placeholder={t("placeholders.zip")}
            type="text"
            value={formData.zip || ""}
          />
          <div className="flex w-full flex-col gap-4 sm:flex-row">
            <div className="flex w-full flex-col gap-2 sm:w-1/2">
              <Label size="xsmall">{t("fields.country")}</Label>
              <Select
                disabled={regionsLoading}
                name="country"
                onValueChange={handleCountryChange}
                value={formData.country || ""}
              >
                <Select.Trigger disabled={regionsLoading}>
                  <Select.Value placeholder={t("form.selectCountry")} />
                </Select.Trigger>
                <Select.Content className="z-50">
                  {countries?.map((country) => (
                    <Select.Item
                      key={country?.iso_2 || ""}
                      value={country?.iso_2 || ""}
                    >
                      {country?.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-1/2">
              <RequiredLabel required>{t("fields.currency")}</RequiredLabel>

              <Select
                defaultValue={currencyCodes?.[0]}
                disabled={regionsLoading}
                name="currency_code"
                onValueChange={handleCurrencyChange}
                value={formData.currency_code || ""}
              >
                <Select.Trigger
                  aria-describedby={
                    validationErrors.currency_code
                      ? "company-currency-error"
                      : undefined
                  }
                  aria-invalid={!!validationErrors.currency_code}
                  aria-required
                  disabled={regionsLoading}
                >
                  <Select.Value placeholder={t("form.selectCurrency")} />
                </Select.Trigger>

                <Select.Content className="z-50">
                  {currencyCodes?.map((currencyCode) => (
                    <Select.Item key={currencyCode} value={currencyCode}>
                      {currencyCode.toUpperCase()}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
              <FieldError
                error={validationErrors.currency_code}
                id="company-currency-error"
              />
            </div>
          </div>
          {/* TODO: Add logo upload */}
          <CompanyTextInput
            errorId="company-logo-url-error"
            label={t("fields.logoUrl")}
            name="logo_url"
            onChange={handleChange}
            placeholder={t("placeholders.logoUrl")}
            type="text"
            value={formData.logo_url || ""}
          />
        </div>
      </Drawer.Body>
      <Drawer.Footer>
        <div className="flex w-full flex-col gap-3">
          {error && !hasValidationErrors && (
            <Text className="txt-compact-small text-ui-fg-error">
              {t("errors.saveErrorPrefix")} {error?.message}
            </Text>
          )}
          <div className="flex justify-end gap-2">
            <Drawer.Close asChild>
              <Button size="small" type="button" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </Drawer.Close>
            <Button isLoading={loading} size="small" type="submit">
              {t("actions.save")}
            </Button>
          </div>
        </div>
      </Drawer.Footer>
    </form>
  )
}
