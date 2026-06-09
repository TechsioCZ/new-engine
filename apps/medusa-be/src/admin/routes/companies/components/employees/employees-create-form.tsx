import type { HttpTypes } from "@medusajs/types"
import { Button, CurrencyInput, Drawer, Input, Label, Text } from "@medusajs/ui"
import { type ChangeEvent, type FormEvent, useState } from "react"
import { useTranslation } from "react-i18next"
import type { AdminCreateEmployee, QueryCompany } from "../../../../../types"
import { CoolSwitch } from "../../../../components/common"
import { currencySymbolMap } from "../../../../utils"

type EmployeeCreateFormData = Omit<
  AdminCreateEmployee,
  "customer_id" | "spending_limit"
> &
  Pick<
    HttpTypes.AdminCreateCustomer,
    "email" | "first_name" | "last_name" | "phone"
  > & {
    customer_id: string
    spending_limit: string
  }

export type EmployeeCreateSubmitData = Omit<
  AdminCreateEmployee,
  "spending_limit"
> &
  Pick<
    HttpTypes.AdminCreateCustomer,
    "email" | "first_name" | "last_name" | "phone"
  > & {
    spending_limit: number
  }

type EmployeeCreateRequiredField = "email"

const getCurrencySymbol = (currencyCode: string) =>
  currencySymbolMap[currencyCode as keyof typeof currencySymbolMap] ??
  currencyCode.toUpperCase()

const RequiredLabel = ({
  children,
  required,
}: {
  children: string
  required?: boolean
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

export function EmployeesCreateForm({
  handleSubmit,
  loading,
  company,
}: {
  handleSubmit: (data: EmployeeCreateSubmitData) => Promise<void>
  loading: boolean
  company: QueryCompany
}) {
  const { t } = useTranslation("companies")
  const [formData, setFormData] = useState<EmployeeCreateFormData>({
    company_id: company.id,
    customer_id: "",
    email: "",
    first_name: "",
    is_admin: false,
    last_name: "",
    phone: "",
    spending_limit: "0",
  })
  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<EmployeeCreateRequiredField, string>>
  >({})

  const currencyCode = company.currency_code?.toLowerCase() || "usd"

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value
    const field = e.target.name

    setFormData({ ...formData, [field]: value })

    if (field === "email") {
      setValidationErrors((prev) => ({ ...prev, email: undefined }))
    }
  }

  const validateForm = () => {
    const nextErrors: Partial<Record<EmployeeCreateRequiredField, string>> = {}

    if (!formData.email?.trim()) {
      nextErrors.email = t("validation.required")
    }

    setValidationErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const spendingLimit = formData.spending_limit
      ? Number.parseInt(formData.spending_limit, 10)
      : 0

    const data = {
      ...formData,
      spending_limit: spendingLimit,
    }

    await handleSubmit(data)
  }

  return (
    <form noValidate onSubmit={onSubmit}>
      <Drawer.Body className="flex flex-col gap-6 p-4">
        <div className="flex flex-col gap-3">
          <Text leading="compact" size="small" weight="plus">
            {t("employees.details")}
          </Text>
          <div className="flex flex-col gap-2">
            <RequiredLabel>{t("employees.firstName")}</RequiredLabel>
            <Input
              name="first_name"
              onChange={handleChange}
              placeholder={t("placeholders.firstName")}
              type="text"
              value={formData.first_name || ""}
            />
          </div>
          <div className="flex flex-col gap-2">
            <RequiredLabel>{t("employees.lastName")}</RequiredLabel>
            <Input
              name="last_name"
              onChange={handleChange}
              placeholder={t("placeholders.lastName")}
              type="text"
              value={formData.last_name || ""}
            />
          </div>
          <div className="flex flex-col gap-2">
            <RequiredLabel required>{t("columns.email")}</RequiredLabel>
            <Input
              aria-describedby={
                validationErrors.email ? "employee-email-error" : undefined
              }
              aria-invalid={!!validationErrors.email}
              aria-required
              name="email"
              onChange={handleChange}
              placeholder={t("placeholders.employeeEmail")}
              required
              type="email"
              value={formData.email || ""}
            />
            <FieldError
              error={validationErrors.email}
              id="employee-email-error"
            />
          </div>
          <div className="flex flex-col gap-2">
            <RequiredLabel>{t("columns.phone")}</RequiredLabel>
            <Input
              name="phone"
              onChange={handleChange}
              placeholder={t("placeholders.phone")}
              type="text"
              value={formData.phone || ""}
            />
          </div>
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
              onChange={(e) =>
                setFormData({
                  ...formData,
                  spending_limit: e.target.value.replace(/[^0-9]/g, ""),
                })
              }
              placeholder={t("placeholders.spendingLimit")}
              symbol={getCurrencySymbol(currencyCode)}
              type="text"
              value={formData.spending_limit ? formData.spending_limit : ""}
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
              onChange={(checked) =>
                setFormData({ ...formData, is_admin: checked })
              }
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
