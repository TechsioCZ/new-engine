import { Drawer, toast } from "@medusajs/ui"
import type { AdminUpdateCompany, QueryCompany } from "../../../../types"
import { useUpdateCompany } from "../../../hooks/api"
import { CompanyForm } from "./company-form"

export function CompanyUpdateDrawer({
  company,
  open,
  setOpen,
}: {
  company: QueryCompany
  open: boolean
  setOpen: (open: boolean) => void
}) {
  const { mutateAsync, isPending, error } = useUpdateCompany(company.id)

  const {
    created_at,
    updated_at,
    id,
    employees,
    customer_group,
    approval_settings,
    ...currentData
  } = company

  const handleSubmit = async (formData: AdminUpdateCompany) => {
    await mutateAsync(formData, {
      onSuccess: async () => {
        setOpen(false)
        toast.success(`Company ${formData.name} updated successfully`)
      },
      onError: (error) => {
        toast.error("Failed to update company")
      },
    })
  }

  return (
    <Drawer onOpenChange={setOpen} open={open}>
      <Drawer.Content className="z-50 overflow-auto">
        <Drawer.Header>
          <Drawer.Title>Edit Company</Drawer.Title>
        </Drawer.Header>

        <CompanyForm
          company={currentData}
          error={error}
          handleSubmit={handleSubmit}
          loading={isPending}
        />
      </Drawer.Content>
    </Drawer>
  )
}
