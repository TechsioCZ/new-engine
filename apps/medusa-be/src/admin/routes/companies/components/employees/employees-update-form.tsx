import {
  Button,
  Container,
  CurrencyInput,
  Drawer,
  Label,
  Table,
  Text,
} from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import type {
  AdminUpdateEmployee,
  QueryCompany,
  QueryEmployee,
} from "../../../../../types"
import { CoolSwitch } from "../../../../components/common"
import { currencySymbolMap } from "../../../../utils"

export function EmployeesUpdateForm({
  company,
  employee,
  handleSubmit,
  loading,
  error,
}: {
  employee: QueryEmployee
  company: QueryCompany
  handleSubmit: (data: AdminUpdateEmployee) => Promise<void>
  loading: boolean
  error: Error | null
}) {
  const { t } = useTranslation("companies")
  const [formData, setFormData] = useState<{
    spending_limit: string
    is_admin: boolean
  }>({
    spending_limit: employee?.spending_limit?.toString() || "0",
    is_admin: employee?.is_admin,
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const spendingLimit = formData.spending_limit
      ? Number(formData.spending_limit)
      : undefined

    const data = {
      ...formData,
      id: employee?.id,
      spending_limit: spendingLimit,
      raw_spending_limit: {
        value: spendingLimit,
      },
    }

    handleSubmit(data)
  }

  return (
    <form onSubmit={onSubmit}>
      <Drawer.Body className="p-4">
        <div className="flex flex-col gap-2">
          <div className="mb-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="h2-core">{t("employees.details")}</h2>
              <a
                className="txt-compact-small self-end text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                href={`/app/customers/${employee?.customer?.id}/edit`}
              >
                {t("actions.editCustomerDetails")}
              </a>
            </div>
            <Container className="overflow-hidden p-0">
              <Table>
                <Table.Body>
                  <Table.Row>
                    <Table.Cell className="txt-compact-small font-medium font-sans">
                      {t("columns.name")}
                    </Table.Cell>
                    <Table.Cell>
                      {employee?.customer?.first_name}{" "}
                      {employee?.customer?.last_name}
                    </Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="txt-compact-small font-medium font-sans">
                      {t("columns.email")}
                    </Table.Cell>
                    <Table.Cell>{employee?.customer?.email}</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="txt-compact-small font-medium font-sans">
                      {t("columns.phone")}
                    </Table.Cell>
                    <Table.Cell>{employee?.customer?.phone}</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="txt-compact-small font-medium font-sans">
                      {t("columns.company")}
                    </Table.Cell>
                    <Table.Cell>{company.name}</Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table>
            </Container>
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="h2-core">{t("employees.permissions")}</h2>
            <div className="flex flex-col gap-2">
              <Label className="txt-compact-small font-medium" size="xsmall">
                {t("columns.spendingLimit")}
              </Label>
              <CurrencyInput
                code={company.currency_code || "USD"}
                name="spending_limit"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    spending_limit: e.target.value.replace(/[^0-9.]/g, ""),
                  })
                }
                placeholder={t("placeholders.spendingLimit")}
                symbol={currencySymbolMap[company.currency_code || "USD"]}
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
                onChange={(checked) =>
                  setFormData({ ...formData, is_admin: checked })
                }
                tooltip={t("employees.adminTooltip")}
              />
            </div>
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
