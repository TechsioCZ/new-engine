import { Button, Drawer, toast } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { QueryCompany } from "../../../../../types"
import {
  useAdminCreateCustomer,
  useAdminFindCustomerByEmail,
  useCreateEmployee,
} from "../../../../hooks/api"
import {
  type EmployeeCreateSubmitData,
  EmployeesCreateForm,
} from "./employees-create-form"

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

export function EmployeeCreateDrawer({ company }: { company: QueryCompany }) {
  const { t } = useTranslation("companies")
  const [open, setOpen] = useState(false)

  const { mutateAsync: createEmployee, isPending: createEmployeeLoading } =
    useCreateEmployee(company.id)

  const { mutateAsync: createCustomer, isPending: createCustomerLoading } =
    useAdminCreateCustomer()
  const { mutateAsync: findCustomerByEmail, isPending: findCustomerLoading } =
    useAdminFindCustomerByEmail()

  const resolveCustomerId = async (
    email: string,
    customerData: {
      first_name: string
      last_name: string
      phone?: string
    }
  ) => {
    const existingCustomer = await findCustomerByEmail(email)

    if (existingCustomer?.id) {
      return { customerId: existingCustomer.id, reusedExistingCustomer: true }
    }

    try {
      const { customer } = await createCustomer({
        email,
        ...customerData,
        company_name: company.name,
      })

      if (customer?.id) {
        return { customerId: customer.id, reusedExistingCustomer: false }
      }
    } catch (error) {
      const existingCustomerAfterConflict = await findCustomerByEmail(email)

      if (existingCustomerAfterConflict?.id) {
        return {
          customerId: existingCustomerAfterConflict.id,
          reusedExistingCustomer: true,
        }
      }

      throw error
    }

    return
  }

  const handleSubmit = async (formData: EmployeeCreateSubmitData) => {
    const { email, first_name, last_name, phone, spending_limit, is_admin } =
      formData

    let customerId: string
    let reusedExistingCustomer = false

    try {
      const resolvedCustomer = await resolveCustomerId(email, {
        first_name,
        last_name,
        phone,
      })

      if (!resolvedCustomer) {
        toast.error(t("errors.createCustomerFailed"))
        return
      }

      customerId = resolvedCustomer.customerId
      reusedExistingCustomer = resolvedCustomer.reusedExistingCustomer
    } catch (error) {
      toast.error(
        `${t("errors.createCustomerFailed")}: ${getErrorMessage(error)}`
      )
      return
    }

    try {
      const employee = await createEmployee({
        spending_limit,
        is_admin,
        customer_id: customerId,
      })

      if (!employee) {
        toast.error(t("errors.createEmployeeFailed"))
        return
      }
    } catch (error) {
      toast.error(
        `${t("errors.createEmployeeFailed")}: ${getErrorMessage(error)}`
      )
      return
    }

    setOpen(false)
    toast.success(
      t(
        reusedExistingCustomer
          ? "toasts.employeeLinked"
          : "toasts.employeeCreated",
        {
          name: [first_name, last_name].filter(Boolean).join(" ") || email,
        }
      )
    )
  }

  const loading =
    createCustomerLoading || createEmployeeLoading || findCustomerLoading

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
          handleSubmit={handleSubmit}
          loading={loading}
        />
      </Drawer.Content>
    </Drawer>
  )
}
