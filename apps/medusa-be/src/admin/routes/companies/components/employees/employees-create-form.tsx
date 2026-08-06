import type { HttpTypes } from "@medusajs/types"
import {
  Button,
  CurrencyInput,
  clx,
  Drawer,
  Input,
  Label,
  Text,
} from "@medusajs/ui"
import { useState } from "react"
import type { ChangeEvent, SubmitEvent } from "react"
import { useTranslation } from "react-i18next"

import type { AdminCreateEmployee, QueryCompany } from "../../../../../types"
import { CoolSwitch } from "../../../../components"
import { useAdminCustomerSearch } from "../../../../hooks/api/customers"
import { useDebouncedValue } from "../../../../lib/use-debounced-value"
import { currencySymbolMap } from "../../../../utils/currency-symbol-map"

type EmployeeCreateFormData = Omit<
  AdminCreateEmployee,
  "customer_id" | "spending_limit"
> & {
  customer_id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  spending_limit: string
}

export type EmployeeCreateSubmitData = Omit<
  AdminCreateEmployee,
  "spending_limit"
> &
  Omit<
    Pick<
      HttpTypes.AdminCreateCustomer,
      "email" | "first_name" | "last_name" | "phone"
    >,
    "email"
  > & {
    email: string
    spending_limit: number
  }

type EmployeeCreateRequiredField = "email"

type EmployeeValidationErrors = Partial<
  Record<EmployeeCreateRequiredField, string>
>

type CustomerOption = Pick<
  HttpTypes.AdminCustomer,
  "email" | "first_name" | "id" | "last_name" | "phone"
>

const currencySymbols: Record<string, string> = currencySymbolMap

const getCurrencySymbol = (currencyCode: string) =>
  currencySymbols[currencyCode] ?? currencyCode.toUpperCase()

const resolveCurrencyCode = (rawCurrencyCode: string | null) => {
  const normalized = rawCurrencyCode?.toLowerCase() ?? ""

  return normalized.length === 0 ? "usd" : normalized
}

const toCustomerOption = (
  customer: HttpTypes.AdminCustomer,
): CustomerOption | null => {
  if (!customer.id) {
    return null
  }

  return {
    email: customer.email,
    first_name: customer.first_name,
    id: customer.id,
    last_name: customer.last_name,
    phone: customer.phone ?? null,
  }
}

const toCustomerOptions = (
  customers: readonly HttpTypes.AdminCustomer[] | undefined,
): CustomerOption[] =>
  (customers ?? []).flatMap((customer) => {
    const customerOption = toCustomerOption(customer)

    return customerOption === null ? [] : [customerOption]
  })

const findCustomerByEmail = (
  options: CustomerOption[],
  normalizedEmail: string,
): CustomerOption | null =>
  options.find(
    (customer) => customer.email?.toLowerCase() === normalizedEmail,
  ) ?? null

const findCustomerById = (
  options: CustomerOption[],
  customerId: string,
): CustomerOption | null =>
  options.find((customer) => customer.id === customerId) ?? null

/**
 * Applies the exact-email customer match during render instead of syncing it
 * back into state from an effect, so the drawer never paints a stale selection.
 */
const resolveFormData = (
  formState: EmployeeCreateFormData,
  exactCustomer: CustomerOption | null,
): EmployeeCreateFormData => {
  if (exactCustomer === null) {
    return formState
  }

  if (formState.customer_id === exactCustomer.id) {
    return formState
  }

  return {
    ...formState,
    customer_id: exactCustomer.id,
    first_name: "",
    last_name: "",
    phone: "",
  }
}

const shouldShowNewCustomerFields = ({
  customerId,
  emailInput,
  exactCustomer,
  isSearching,
  searchEnabled,
}: {
  customerId: string
  emailInput: string
  exactCustomer: CustomerOption | null
  isSearching: boolean
  searchEnabled: boolean
}): boolean => {
  if (emailInput.length === 0) {
    return false
  }

  if (customerId.length > 0) {
    return false
  }

  if (!searchEnabled) {
    return false
  }

  if (isSearching) {
    return false
  }

  return exactCustomer === null
}

const RequiredLabel = ({
  children,
  required,
}: {
  children: string
  required: boolean
}) => (
  <Label className="txt-compact-small font-medium" size="xsmall">
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

const getCustomerName = (customer: CustomerOption) =>
  [customer.first_name, customer.last_name].filter(Boolean).join(" ")

const getCustomerLabel = (customer: CustomerOption) =>
  getCustomerName(customer) || customer.email || customer.id

const CustomerSelection = ({
  clearLabel,
  emailInput,
  onClear,
  onSelect,
  options,
  selectedCustomer,
}: {
  clearLabel: string
  emailInput: string
  onClear: () => void
  onSelect: (customer: CustomerOption) => void
  options: CustomerOption[]
  selectedCustomer: CustomerOption | null
}) => {
  if (selectedCustomer) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-ui-border-base bg-ui-bg-subtle px-3 py-2">
        <div className="flex min-w-0 flex-col">
          <Text leading="compact" size="small" weight="plus">
            {getCustomerLabel(selectedCustomer)}
          </Text>
          <Text
            className="truncate text-ui-fg-subtle"
            leading="compact"
            size="small"
          >
            {selectedCustomer.email}
          </Text>
        </div>
        <Button
          onClick={onClear}
          size="small"
          type="button"
          variant="secondary"
        >
          {clearLabel}
        </Button>
      </div>
    )
  }

  if (!options.length) {
    return null
  }

  const normalizedEmail = emailInput.toLowerCase()

  return (
    <div className="overflow-hidden rounded-md border border-ui-border-base bg-ui-bg-base">
      {options.map((customer) => (
        <button
          className={clx(
            "flex w-full flex-col px-3 py-2 text-left hover:bg-ui-bg-base-hover",
            customer.email?.toLowerCase() === normalizedEmail &&
              "bg-ui-bg-subtle",
          )}
          key={customer.id}
          onClick={() => {
            onSelect(customer)
          }}
          type="button"
        >
          <Text leading="compact" size="small" weight="plus">
            {getCustomerLabel(customer)}
          </Text>
          <Text className="text-ui-fg-subtle" leading="compact" size="small">
            {customer.email}
          </Text>
        </button>
      ))}
    </div>
  )
}

export const EmployeesCreateForm = ({
  handleSubmit,
  loading,
  company,
}: {
  handleSubmit: (data: EmployeeCreateSubmitData) => Promise<void>
  loading: boolean
  company: QueryCompany
}) => {
  const { t } = useTranslation("companies")
  const [formState, setFormState] = useState<EmployeeCreateFormData>({
    company_id: company.id,
    customer_id: "",
    email: "",
    first_name: "",
    is_admin: false,
    last_name: "",
    phone: "",
    spending_limit: "0",
  })
  const [validationErrors, setValidationErrors] =
    useState<EmployeeValidationErrors>({})
  const emailInput = formState.email.trim()
  const debouncedEmail = useDebouncedValue(emailInput, 300)
  const searchEnabled = debouncedEmail.length >= 3
  const { data: customerSearch, isFetching: customerSearchLoading } =
    useAdminCustomerSearch(debouncedEmail, {
      enabled: searchEnabled,
    })

  const currencyCode = resolveCurrencyCode(company.currency_code)
  const customerOptions = toCustomerOptions(customerSearch?.customers)
  const exactCustomer = findCustomerByEmail(
    customerOptions,
    emailInput.toLowerCase(),
  )
  const formData = resolveFormData(formState, exactCustomer)
  const selectedCustomer = findCustomerById(
    customerOptions,
    formData.customer_id,
  )
  const showNewCustomerFields = shouldShowNewCustomerFields({
    customerId: formData.customer_id,
    emailInput,
    exactCustomer,
    isSearching: customerSearchLoading,
    searchEnabled,
  })
  const emailError = validationErrors.email
  const hasEmailError = emailError !== undefined && emailError.length > 0

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { checked, name, type, value } = event.target
    const nextValue = type === "checkbox" ? checked : value
    const field = name === "employee_customer_email" ? "email" : name

    setFormState({
      ...formData,
      [field]: nextValue,
      ...(field === "email" ? { customer_id: "" } : {}),
    })

    if (field === "email") {
      setValidationErrors({})
    }
  }

  const handleFormSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()

    const email = formData.email.trim()

    if (email.length === 0) {
      setValidationErrors({ email: t("validation.required") })
      return
    }

    setValidationErrors({})

    const spendingLimit =
      formData.spending_limit.length === 0
        ? 0
        : Math.trunc(Number(formData.spending_limit))

    void handleSubmit({
      ...formData,
      email,
      spending_limit: spendingLimit,
    })
  }

  const handleCustomerSelect = (customer: CustomerOption) => {
    setFormState({
      ...formData,
      customer_id: customer.id,
      email: customer.email ?? emailInput,
      first_name: "",
      last_name: "",
      phone: "",
    })
  }

  const handleCustomerClear = () => {
    setFormState({
      ...formData,
      customer_id: "",
      email: "",
      first_name: "",
      last_name: "",
      phone: "",
    })
  }

  return (
    <form autoComplete="off" noValidate onSubmit={handleFormSubmit}>
      <Drawer.Body className="flex flex-col gap-6 p-4">
        <div className="flex flex-col gap-3">
          <Text leading="compact" size="small" weight="plus">
            {t("employees.details")}
          </Text>
          <div className="flex flex-col gap-2">
            <RequiredLabel required>{t("columns.email")}</RequiredLabel>
            <Input
              aria-describedby={
                hasEmailError ? "employee-email-error" : undefined
              }
              aria-invalid={hasEmailError}
              aria-required
              autoComplete="off"
              autoFocus
              name="employee_customer_email"
              onChange={handleChange}
              placeholder={t("placeholders.employeeEmail")}
              required
              type="email"
              value={formData.email}
            />
            <FieldError error={emailError} id="employee-email-error" />
            {customerSearchLoading && (
              <Text
                className="text-ui-fg-subtle"
                leading="compact"
                size="small"
              >
                {t("employees.searchingCustomers")}
              </Text>
            )}
            <CustomerSelection
              clearLabel={t("actions.clear")}
              emailInput={emailInput}
              onClear={handleCustomerClear}
              onSelect={handleCustomerSelect}
              options={customerOptions}
              selectedCustomer={selectedCustomer}
            />
            {showNewCustomerFields && (
              <Text
                className="text-ui-fg-subtle"
                leading="compact"
                size="small"
              >
                {t("employees.newCustomerHint")}
              </Text>
            )}
          </div>
          {showNewCustomerFields && (
            <>
              <div className="flex flex-col gap-2">
                <RequiredLabel required={false}>
                  {t("employees.firstName")}
                </RequiredLabel>
                <Input
                  name="first_name"
                  onChange={handleChange}
                  placeholder={t("placeholders.firstName")}
                  type="text"
                  value={formData.first_name}
                />
              </div>
              <div className="flex flex-col gap-2">
                <RequiredLabel required={false}>
                  {t("employees.lastName")}
                </RequiredLabel>
                <Input
                  name="last_name"
                  onChange={handleChange}
                  placeholder={t("placeholders.lastName")}
                  type="text"
                  value={formData.last_name}
                />
              </div>
              <div className="flex flex-col gap-2">
                <RequiredLabel required={false}>
                  {t("columns.phone")}
                </RequiredLabel>
                <Input
                  name="phone"
                  onChange={handleChange}
                  placeholder={t("placeholders.phone")}
                  type="text"
                  value={formData.phone}
                />
              </div>
            </>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <Text leading="compact" size="small" weight="plus">
            {t("employees.permissions")}
          </Text>
          <div className="flex flex-col gap-2">
            <Label className="txt-compact-small font-medium" size="xsmall">
              {t("employees.spendingLimitWithCurrency", {
                currency: currencyCode.toUpperCase(),
              })}
            </Label>
            <CurrencyInput
              code={currencyCode}
              name="spending_limit"
              onChange={(event) => {
                setFormState({
                  ...formData,
                  spending_limit: event.target.value.replaceAll(/[^0-9]/gu, ""),
                })
              }}
              placeholder={t("placeholders.spendingLimit")}
              symbol={getCurrencySymbol(currencyCode)}
              type="text"
              value={formData.spending_limit}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="txt-compact-small font-medium" size="xsmall">
              {t("employees.adminLabel")}
            </Label>
            <CoolSwitch
              checked={formData.is_admin}
              description={t("employees.adminDescription")}
              fieldName="is_admin"
              label={t("employees.adminBadge")}
              onChange={(checked) => {
                setFormState({ ...formData, is_admin: checked })
              }}
              tooltip={t("employees.adminTooltip")}
            />
          </div>
        </div>
      </Drawer.Body>
      <Drawer.Footer>
        <div className="flex w-full justify-end gap-2">
          <Drawer.Close asChild>
            <Button size="small" type="button" variant="secondary">
              {t("actions.cancel")}
            </Button>
          </Drawer.Close>
          <Button disabled={loading} size="small" type="submit">
            {loading ? t("status.saving") : t("actions.save")}
          </Button>
        </div>
      </Drawer.Footer>
    </form>
  )
}
