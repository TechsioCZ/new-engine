import { Drawer, type toast as toastType } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type {
  AdminUpdateEmployee,
  QueryCompany,
  QueryEmployee,
} from "../../../../../types"
import { useUpdateEmployee } from "../../../../hooks/api"
import { EmployeesUpdateForm } from "."

export function EmployeesUpdateDrawer({
  company,
  employee,
  open,
  setOpen,
  toast,
}: {
  company: QueryCompany
  employee: QueryEmployee
  open: boolean
  setOpen: (open: boolean) => void
  toast: typeof toastType
}) {
  const { t } = useTranslation("companies")
  const { mutateAsync, isPending, error } = useUpdateEmployee(
    employee.company_id,
    employee.id
  )

  const handleSubmit = async (formData: AdminUpdateEmployee) => {
    await mutateAsync(formData, {
      onSuccess: () => {
        setOpen(false)
        toast.success(
          t("toasts.employeeUpdated", { email: employee?.customer?.email })
        )
      },
    })
  }

  return (
    <Drawer onOpenChange={setOpen} open={open}>
      <Drawer.Content className="z-50 overflow-auto">
        <Drawer.Header>
          <Drawer.Title>{t("employees.editTitle")}</Drawer.Title>
        </Drawer.Header>

        <EmployeesUpdateForm
          company={company}
          employee={employee}
          error={error}
          handleSubmit={handleSubmit}
          loading={isPending}
        />
      </Drawer.Content>
    </Drawer>
  )
}
