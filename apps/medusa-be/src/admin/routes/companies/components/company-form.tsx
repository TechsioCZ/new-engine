import { Button, Drawer, Input, Label, Select, Text } from "@medusajs/ui"
import { useState } from "react"
import type { ChangeEvent, ReactNode, SubmitEvent } from "react"
import { useTranslation } from "react-i18next"

import type { AdminUpdateCompany } from "../../../../types"
import { useRegions } from "../../../hooks/api/regions"

const requiredCompanyFields = ["name", "email", "currency_code"] as const

type RequiredCompanyField = (typeof requiredCompanyFields)[number]

type CompanyFormValues = Record<keyof AdminUpdateCompany, string>

type CompanyValidationErrors = Partial<Record<RequiredCompanyField, string>>

const isRequiredCompanyField = (field: string): field is RequiredCompanyField =>
  requiredCompanyFields.some((candidate) => candidate === field)

const normalizeCompanyFormData = (
  company?: AdminUpdateCompany,
): CompanyFormValues => {
  const source: AdminUpdateCompany = company ?? {}

  return {
    address: source.address ?? "",
    city: source.city ?? "",
    country: source.country ?? "",
    currency_code: source.currency_code ?? "",
    email: source.email ?? "",
    logo_url: source.logo_url ?? "",
    name: source.name ?? "",
    phone: source.phone ?? "",
    state: source.state ?? "",
    zip: source.zip ?? "",
  }
}

const omitValidationError = (
  errors: CompanyValidationErrors,
  field: RequiredCompanyField,
): CompanyValidationErrors => {
  const next: CompanyValidationErrors = {}

  for (const candidate of requiredCompanyFields) {
    const message = errors[candidate]

    if (candidate !== field && message !== undefined) {
      next[candidate] = message
    }
  }

  return next
}

const RequiredLabel = ({
  children,
  required,
}: {
  children: ReactNode
  required: boolean
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

const FieldError = ({
  error,
  id,
}: {
  error?: string | undefined
  id: string
}) => {
  if (error === undefined || error.length === 0) {
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
  error?: string | undefined
  errorId: string
  label: string
  name: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  required?: boolean
  type?: string
  value: string
}) => {
  const hasError = error !== undefined && error.length > 0

  return (
    <>
      <RequiredLabel required={required ?? false}>{label}</RequiredLabel>
      <Input
        aria-describedby={hasError ? errorId : undefined}
        aria-invalid={hasError}
        aria-required={required}
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
      <FieldError error={error} id={errorId} />
    </>
  )
}

export const CompanyForm = ({
  company,
  handleSubmit,
  loading,
  error,
}: {
  company?: AdminUpdateCompany
  handleSubmit: (data: AdminUpdateCompany) => Promise<void>
  loading: boolean
  error: Error | null
}) => {
  const { t } = useTranslation("companies")
  const [formData, setFormData] = useState<CompanyFormValues>(() =>
    normalizeCompanyFormData(company),
  )
  const [validationErrors, setValidationErrors] =
    useState<CompanyValidationErrors>({})

  const { regions, isPending: regionsLoading } = useRegions()

  const currencyCodes = regions?.map((region) => region.currency_code)
  const countries = regions?.flatMap((region) => region.countries)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const field = e.target.name

    setFormData({ ...formData, [field]: e.target.value })

    if (isRequiredCompanyField(field)) {
      setValidationErrors((prev) => omitValidationError(prev, field))
    }
  }

  const handleCurrencyChange = (value: string) => {
    setFormData({ ...formData, currency_code: value })
    setValidationErrors((prev) => omitValidationError(prev, "currency_code"))
  }

  const handleCountryChange = (value: string) => {
    setFormData({ ...formData, country: value })
  }

  const validateForm = () => {
    const nextErrors: CompanyValidationErrors = {}
    const requiredMessage = t("validation.required")

    if (formData.name.trim().length === 0) {
      nextErrors.name = requiredMessage
    }

    if (formData.email.trim().length === 0) {
      nextErrors.email = requiredMessage
    }

    if (formData.currency_code.length === 0) {
      nextErrors.currency_code = requiredMessage
    }

    setValidationErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  const handleFormSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    void handleSubmit(normalizeCompanyFormData(formData))
  }

  const hasValidationErrors = Object.values(validationErrors).some(Boolean)
  const currencyError = validationErrors.currency_code
  const hasCurrencyError =
    currencyError !== undefined && currencyError.length > 0

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
            value={formData.name}
          />
          <CompanyTextInput
            errorId="company-phone-error"
            label={t("fields.phone")}
            name="phone"
            onChange={handleChange}
            placeholder={t("placeholders.phone")}
            type="text"
            value={formData.phone}
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
            value={formData.email}
          />
          <CompanyTextInput
            errorId="company-address-error"
            label={t("fields.address")}
            name="address"
            onChange={handleChange}
            placeholder={t("placeholders.address")}
            type="text"
            value={formData.address}
          />
          <CompanyTextInput
            errorId="company-city-error"
            label={t("fields.city")}
            name="city"
            onChange={handleChange}
            placeholder={t("placeholders.city")}
            type="text"
            value={formData.city}
          />
          <CompanyTextInput
            errorId="company-state-error"
            label={t("fields.state")}
            name="state"
            onChange={handleChange}
            placeholder={t("placeholders.state")}
            type="text"
            value={formData.state}
          />
          <CompanyTextInput
            errorId="company-zip-error"
            label={t("fields.zip")}
            name="zip"
            onChange={handleChange}
            placeholder={t("placeholders.zip")}
            type="text"
            value={formData.zip}
          />
          <div className="flex w-full flex-col gap-4 sm:flex-row">
            <div className="flex w-full flex-col gap-2 sm:w-1/2">
              <Label size="xsmall">{t("fields.country")}</Label>
              <Select
                disabled={regionsLoading}
                name="country"
                onValueChange={handleCountryChange}
                value={formData.country}
              >
                <Select.Trigger disabled={regionsLoading}>
                  <Select.Value placeholder={t("form.selectCountry")} />
                </Select.Trigger>
                <Select.Content className="z-50">
                  {countries?.map((country) => (
                    <Select.Item
                      key={country?.iso_2 ?? ""}
                      value={country?.iso_2 ?? ""}
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
                defaultValue={currencyCodes?.[0] ?? ""}
                disabled={regionsLoading}
                name="currency_code"
                onValueChange={handleCurrencyChange}
                value={formData.currency_code}
              >
                <Select.Trigger
                  aria-describedby={
                    hasCurrencyError ? "company-currency-error" : undefined
                  }
                  aria-invalid={hasCurrencyError}
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
              <FieldError error={currencyError} id="company-currency-error" />
            </div>
          </div>
          {/* Logo is supplied as a URL until upload support ships. */}
          <CompanyTextInput
            errorId="company-logo-url-error"
            label={t("fields.logoUrl")}
            name="logo_url"
            onChange={handleChange}
            placeholder={t("placeholders.logoUrl")}
            type="text"
            value={formData.logo_url}
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
