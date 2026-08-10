import { Button, Drawer, toast } from "@medusajs/ui"
import { getErrorMessage } from "@techsio/std/object"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import type { QueryCompany } from "../../../../../types"
import {
  useAdminCreateCustomer,
  useAdminFindCustomerByEmail,
} from "../../../../hooks/api/customers"
import { useCreateEmployee } from "../../../../hooks/api/employees"
import { EmployeesCreateForm } from "./employees-create-form"
import type { EmployeeCreateSubmitData } from "./employees-create-form"

export const EmployeeCreateDrawer = ({
  company,
}: {
  company: QueryCompany
}) => {
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
      first_name?: string | null
      last_name?: string | null
      phone?: string | null
    },
  ) => {
    const existingCustomer = await findCustomerByEmail(email)

    if (existingCustomer?.id !== undefined && existingCustomer.id.length > 0) {
      return { customerId: existingCustomer.id, reusedExistingCustomer: true }
    }

    try {
      const { customer } = await createCustomer({
        email,
        ...customerData,
        company_name: company.name,
      })

      if (customer?.id !== undefined && customer.id.length > 0) {
        return { customerId: customer.id, reusedExistingCustomer: false }
      }
    } catch (error) {
      const existingCustomerAfterConflict = await findCustomerByEmail(email)

      if (
        existingCustomerAfterConflict?.id !== undefined &&
        existingCustomerAfterConflict.id.length > 0
      ) {
        return {
          customerId: existingCustomerAfterConflict.id,
          reusedExistingCustomer: true,
        }
      }

      throw error
    }

    return null
  }

  const handleSubmit = async (formData: EmployeeCreateSubmitData) => {
    const {
      customer_id,
      email,
      first_name,
      last_name,
      phone,
      spending_limit,
      is_admin,
    } = formData

    let customerId: string
    let reusedExistingCustomer =
      customer_id !== undefined && customer_id.length > 0

    if (customer_id !== undefined && customer_id.length > 0) {
      customerId = customer_id
    } else {
      try {
        const resolvedCustomer = await resolveCustomerId(email, {
          ...(first_name === undefined ? {} : { first_name }),
          ...(last_name === undefined ? {} : { last_name }),
          ...(phone === undefined ? {} : { phone }),
        })

        if (!resolvedCustomer) {
          toast.error(t("errors.createCustomerFailed"))
          return
        }

        const {
          customerId: resolvedCustomerId,
          reusedExistingCustomer: reused,
        } = resolvedCustomer
        customerId = resolvedCustomerId
        reusedExistingCustomer = reused
      } catch (error) {
        toast.error(
          `${t("errors.createCustomerFailed")}: ${getErrorMessage(error)}`,
        )
        return
      }
    }

    try {
      await createEmployee({
        customer_id: customerId,
        is_admin,
        spending_limit,
      })
    } catch (error) {
      toast.error(
        `${t("errors.createEmployeeFailed")}: ${getErrorMessage(error)}`,
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
        },
      ),
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
