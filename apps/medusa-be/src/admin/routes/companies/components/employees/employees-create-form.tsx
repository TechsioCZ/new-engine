import { Button, CurrencyInput, Drawer, Input, Label, Text } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { AdminCreateEmployee, QueryCompany } from "../../../../../types"
import { CoolSwitch } from "../../../../components/common"
import { currencySymbolMap } from "../../../../utils"

export function EmployeesCreateForm({
  handleSubmit,
  loading,
  error,
  company,
}: {
  handleSubmit: (data: AdminCreateEmployee) => Promise<void>
  loading: boolean
  error: Error | null
  company: QueryCompany
}) {
  const { t } = useTranslation("companies")
  const [formData, setFormData] = useState<
    Omit<AdminCreateEmployee, "spending_limit"> & {
      spending_limit: string
    }
  >({
    company_id: company.id,
    is_admin: false,
    spending_limit: "0",
    customer_id: "",
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value =
      e.target.type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : e.target.value

    setFormData({ ...formData, [e.target.name]: value })
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const spendingLimit = formData.spending_limit
      ? Number.parseInt(formData.spending_limit, 10)
      : 0

    const data = {
      ...formData,
      spending_limit: spendingLimit,
    }

    handleSubmit(data)
  }

  return (
    <form onSubmit={onSubmit}>
      <Drawer.Body className="flex flex-col gap-6 p-4">
        <div className="flex flex-col gap-3">
          <h2 className="h2-core">{t("employees.details")}</h2>
          <div className="flex flex-col gap-2">
            <Label className="txt-compact-small font-medium" size="xsmall">
              {t("employees.firstName")}
            </Label>
            <Input
              name="first_name"
              onChange={handleChange}
              placeholder={t("placeholders.firstName")}
              type="text"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="txt-compact-small font-medium" size="xsmall">
              {t("employees.lastName")}
            </Label>
            <Input
              name="last_name"
              onChange={handleChange}
              placeholder={t("placeholders.lastName")}
              type="text"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="txt-compact-small font-medium" size="xsmall">
              {t("columns.email")}
            </Label>
            <Input
              name="email"
              onChange={handleChange}
              placeholder={t("placeholders.employeeEmail")}
              type="email"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="txt-compact-small font-medium" size="xsmall">
              {t("columns.phone")}
            </Label>
            <Input
              name="phone"
              onChange={handleChange}
              placeholder={t("placeholders.phone")}
              type="text"
            />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="h2-core">{t("employees.permissions")}</h2>
          <div className="flex flex-col gap-2">
            <Label className="txt-compact-small font-medium" size="xsmall">
              {t("employees.spendingLimitWithCurrency", {
                currency: company.currency_code?.toUpperCase() || "USD",
              })}
            </Label>
            <CurrencyInput
              code={company.currency_code || "USD"}
              name="spending_limit"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  spending_limit: e.target.value.replace(/[^0-9]/g, ""),
                })
              }
              placeholder={t("placeholders.spendingLimit")}
              symbol={currencySymbolMap[company.currency_code || "USD"]}
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
        <Drawer.Close asChild>
          <Button type="button" variant="secondary">
            {t("actions.cancel")}
          </Button>
        </Drawer.Close>
        <Button disabled={loading} type="submit">
          {loading ? t("status.saving") : t("actions.save")}
        </Button>
        {error && <Text className="text-red-500">{error.message}</Text>}
      </Drawer.Footer>
    </form>
  )
}
