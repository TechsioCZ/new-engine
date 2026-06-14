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
import { useNavigate } from "react-router-dom"
import type {
  AdminUpdateEmployee,
  QueryCompany,
  QueryEmployee,
} from "../../../../../types"
import { CoolSwitch } from "../../../../components"
import { currencySymbolMap } from "../../../../utils"

const getCurrencySymbol = (currencyCode: string) =>
  currencySymbolMap[currencyCode as keyof typeof currencySymbolMap] ??
  currencyCode.toUpperCase()

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
  const navigate = useNavigate()
  const currencyCode = company.currency_code?.toLowerCase() || "usd"
  const customerId = employee.customer?.id
  const [formData, setFormData] = useState<{
    spending_limit: string
    is_admin: boolean
  }>({
    spending_limit: employee?.spending_limit?.toString() || "0",
    is_admin: employee?.is_admin,
  })

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const spendingLimit = formData.spending_limit
      ? Number(formData.spending_limit)
      : undefined

    const data = {
      is_admin: formData.is_admin,
      spending_limit: spendingLimit,
    }

    await handleSubmit(data)
  }

  return (
    <form onSubmit={onSubmit}>
      <Drawer.Body className="p-4">
        <div className="flex flex-col gap-2">
          <div className="mb-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Text leading="compact" size="small" weight="plus">
                {t("employees.details")}
              </Text>
              <Button
                disabled={!customerId}
                onClick={() => {
                  if (customerId) {
                    navigate(`/customers/${customerId}/edit`)
                  }
                }}
                size="small"
                type="button"
                variant="secondary"
              >
                {t("actions.editCustomerDetails")}
              </Button>
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
            <Text leading="compact" size="small" weight="plus">
              {t("employees.permissions")}
            </Text>
            <div className="flex flex-col gap-2">
              <Label className="txt-compact-small font-medium" size="xsmall">
                {t("columns.spendingLimit")}
              </Label>
              <CurrencyInput
                code={currencyCode}
                name="spending_limit"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    spending_limit: e.target.value.replace(/[^0-9.]/g, ""),
                  })
                }
                placeholder={t("placeholders.spendingLimit")}
                symbol={getCurrencySymbol(currencyCode)}
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
        <div className="flex w-full flex-col gap-3">
          {error && (
            <Text className="txt-compact-small text-ui-fg-error">
              {error.message}
            </Text>
          )}
          <div className="flex justify-end gap-2">
            <Drawer.Close asChild>
              <Button size="small" type="button" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </Drawer.Close>
            <Button disabled={loading} size="small" type="submit">
              {loading ? t("status.saving") : t("actions.save")}
            </Button>
          </div>
        </div>
      </Drawer.Footer>
    </form>
  )
}
