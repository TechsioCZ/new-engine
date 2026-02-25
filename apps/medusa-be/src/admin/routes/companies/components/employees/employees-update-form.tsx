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
              <h2 className="h2-core">Details</h2>
              <a
                className="txt-compact-small self-end text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                href={`/app/customers/${employee?.customer!.id}/edit`}
              >
                Edit Customer Details
              </a>
            </div>
            <Container className="overflow-hidden p-0">
              <Table>
                <Table.Body>
                  <Table.Row>
                    <Table.Cell className="txt-compact-small font-medium font-sans">
                      Name
                    </Table.Cell>
                    <Table.Cell>
                      {employee?.customer!.first_name}{" "}
                      {employee?.customer!.last_name}
                    </Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="txt-compact-small font-medium font-sans">
                      Email
                    </Table.Cell>
                    <Table.Cell>{employee?.customer!.email}</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="txt-compact-small font-medium font-sans">
                      Phone
                    </Table.Cell>
                    <Table.Cell>{employee?.customer!.phone}</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell className="txt-compact-small font-medium font-sans">
                      Company
                    </Table.Cell>
                    <Table.Cell>{company.name}</Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table>
            </Container>
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="h2-core">Permissions</h2>
            <div className="flex flex-col gap-2">
              <Label className="txt-compact-small font-medium" size="xsmall">
                Spending Limit
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
                placeholder="1000"
                symbol={currencySymbolMap[company.currency_code || "USD"]}
                value={formData.spending_limit}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="txt-compact-small font-medium" size="xsmall">
                Admin Access
              </Label>
              <CoolSwitch
                checked={formData.is_admin}
                description="Enable to grant admin access"
                fieldName="is_admin"
                label="Is Admin"
                onChange={(checked) =>
                  setFormData({ ...formData, is_admin: checked })
                }
                tooltip="Admins can manage the company's details and employee permissions."
              />
            </div>
          </div>
        </div>
      </Drawer.Body>
      <Drawer.Footer>
        <Drawer.Close asChild>
          <Button variant="secondary">Cancel</Button>
        </Drawer.Close>
        <Button disabled={loading} type="submit">
          {loading ? "Saving..." : "Save"}
        </Button>
        {error && <Text className="text-red-500">{error.message}</Text>}
      </Drawer.Footer>
    </form>
  )
}
