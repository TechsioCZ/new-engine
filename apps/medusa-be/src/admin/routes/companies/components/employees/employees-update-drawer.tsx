import { Drawer, type toast as toastType } from "@medusajs/ui"
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
  const { mutateAsync, isPending, error } = useUpdateEmployee(
    employee.company_id,
    employee.id
  )

  const handleSubmit = async (formData: AdminUpdateEmployee) => {
    await mutateAsync(formData, {
      onSuccess: () => {
        setOpen(false)
        toast.success(
          `Employee ${employee?.customer?.email} updated successfully`
        )
      },
    })
  }

  return (
    <Drawer onOpenChange={setOpen} open={open}>
      <Drawer.Content className="z-50 overflow-auto">
        <Drawer.Header>
          <Drawer.Title>Edit Employee</Drawer.Title>
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
