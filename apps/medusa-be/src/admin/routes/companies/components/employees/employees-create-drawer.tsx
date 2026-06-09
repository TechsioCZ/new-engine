import type { HttpTypes } from "@medusajs/types"
import { Button, Drawer, toast } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { AdminCreateEmployee, QueryCompany } from "../../../../../types"
import {
  useAdminCreateCustomer,
  useCreateEmployee,
} from "../../../../hooks/api"
import { EmployeesCreateForm } from "./employees-create-form"

export function EmployeeCreateDrawer({ company }: { company: QueryCompany }) {
  const { t } = useTranslation("companies")
  const [open, setOpen] = useState(false)

  const {
    mutateAsync: createEmployee,
    isPending: createEmployeeLoading,
    error: createEmployeeError,
  } = useCreateEmployee(company.id)

  const {
    mutateAsync: createCustomer,
    isPending: createCustomerLoading,
    error: createCustomerError,
  } = useAdminCreateCustomer()

  const handleSubmit = async (
    formData: AdminCreateEmployee & HttpTypes.AdminCreateCustomer
  ) => {
    const { email, first_name, last_name, phone, spending_limit, is_admin } =
      formData

    if (
      !(email && first_name && last_name && phone) ||
      spending_limit === undefined ||
      is_admin === undefined
    ) {
      toast.error(t("errors.missingEmployeeDetails"))
      return
    }

    const { customer } = await createCustomer({
      email,
      first_name,
      last_name,
      phone,
      company_name: company.name,
    })

    if (!customer?.id) {
      toast.error(t("errors.createCustomerFailed"))
      return
    }

    const employee = await createEmployee({
      spending_limit,
      is_admin,
      customer_id: customer.id,
    })

    if (!employee) {
      toast.error(t("errors.createEmployeeFailed"))
      return
    }

    setOpen(false)
    toast.success(
      t("toasts.employeeCreated", {
        name: `${customer?.first_name} ${customer?.last_name}`,
      })
    )
  }

  const loading = createCustomerLoading || createEmployeeLoading
  const error = createCustomerError || createEmployeeError

  return (
    <Drawer onOpenChange={setOpen} open={open}>
      <Drawer.Trigger asChild>
        <Button size="small" variant="secondary">
          {t("actions.add")}
        </Button>
      </Drawer.Trigger>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("employees.createTitle")}</Drawer.Title>
        </Drawer.Header>
        <EmployeesCreateForm
          company={company}
          error={error}
          handleSubmit={handleSubmit}
          loading={loading}
        />
      </Drawer.Content>
    </Drawer>
  )
}
