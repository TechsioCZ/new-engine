import { Button, CurrencyInput, Drawer, Input, Label, Text } from "@medusajs/ui"
import { useState } from "react"
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
      ? Number.parseInt(formData.spending_limit)
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
          <h2 className="h2-core">Details</h2>
          <div className="flex flex-col gap-2">
            <Label className="txt-compact-small font-medium" size="xsmall">
              First Name
            </Label>
            <Input
              name="first_name"
              onChange={handleChange}
              placeholder="John"
              type="text"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="txt-compact-small font-medium" size="xsmall">
              Last Name
            </Label>
            <Input
              name="last_name"
              onChange={handleChange}
              placeholder="Doe"
              type="text"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="txt-compact-small font-medium" size="xsmall">
              Email
            </Label>
            <Input
              name="email"
              onChange={handleChange}
              placeholder="john.doe@example.com"
              type="email"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="txt-compact-small font-medium" size="xsmall">
              Phone
            </Label>
            <Input
              name="phone"
              onChange={handleChange}
              placeholder="0612345678"
              type="text"
            />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="h2-core">Permissions</h2>
          <div className="flex flex-col gap-2">
            <Label className="txt-compact-small font-medium" size="xsmall">
              Spending Limit ({company.currency_code?.toUpperCase() || "USD"})
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
              placeholder="1000"
              symbol={currencySymbolMap[company.currency_code || "USD"]}
              type="text"
              value={formData.spending_limit ? formData.spending_limit : ""}
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
