import { EllipsisHorizontal, PencilSquare, Trash } from "@medusajs/icons"
import { DropdownMenu, IconButton, toast } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { QueryCompany, QueryEmployee } from "../../../../../types"
import { DeletePrompt } from "../../../../components/common"
import { useDeleteEmployee } from "../../../../hooks/api"
import { EmployeesUpdateDrawer } from "."

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

export const EmployeesActionsMenu = ({
  company,
  employee,
}: {
  company: QueryCompany
  employee: QueryEmployee
}) => {
  const { t } = useTranslation("companies")
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { mutateAsync: mutateDelete, isPending: loadingDelete } =
    useDeleteEmployee(company.id)

  const handleDelete = async () => {
    await mutateDelete(employee.id, {
      onError: (error) => {
        toast.error(
          `${t("errors.deleteEmployeeFailed")}: ${getErrorMessage(error)}`
        )
      },
      onSuccess: () => {
        toast.success(t("toasts.employeeDeleted"))
      },
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenu.Trigger asChild>
          <IconButton variant="transparent">
            <EllipsisHorizontal />
          </IconButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item
            className="gap-x-2"
            onClick={() => setEditOpen(true)}
          >
            <PencilSquare />
            {t("actions.edit")}
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            className="gap-x-2"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash />
            {t("actions.delete")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
      <EmployeesUpdateDrawer
        company={company}
        employee={employee}
        open={editOpen}
        setOpen={setEditOpen}
        toast={toast}
      />
      <DeletePrompt
        cancelText={t("actions.cancel")}
        confirmText={t("actions.delete")}
        description={t("prompts.deleteEmployeeDescription", {
          email: employee.customer?.email ?? employee.id,
        })}
        handleDelete={handleDelete}
        loading={loadingDelete}
        open={deleteOpen}
        setOpen={setDeleteOpen}
        title={t("prompts.deleteEmployeeTitle")}
      />
    </>
  )
}
