import { Drawer, type toast as toastType } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type {
  AdminUpdateEmployee,
  QueryCompany,
  QueryEmployee,
} from "../../../../../types"
import { useUpdateEmployee } from "../../../../hooks/api"
import { EmployeesUpdateForm } from "."

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

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
  const { mutateAsync, isPending } = useUpdateEmployee(
    employee.company_id,
    employee.id
  )

  const handleSubmit = async (formData: AdminUpdateEmployee) => {
    try {
      await mutateAsync(formData)
      setOpen(false)
      toast.success(
        t("toasts.employeeUpdated", { email: employee?.customer?.email })
      )
    } catch (error) {
      toast.error(
        `${t("errors.updateEmployeeFailed")}: ${getErrorMessage(error)}`
      )
    }
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
          error={null}
          handleSubmit={handleSubmit}
          loading={isPending}
        />
      </Drawer.Content>
    </Drawer>
  )
}
