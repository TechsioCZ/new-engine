import { Button, Drawer } from "@medusajs/ui"
import { useState } from "react"
import type { AdminCreateCompany } from "../../../../types"
import { useCreateCompany } from "../../../hooks/api"
import { CompanyForm } from "./company-form"

export function CompanyCreateDrawer() {
  const [open, setOpen] = useState(false)

  const { mutateAsync, isPending, error } = useCreateCompany()

  const handleSubmit = async (formData: AdminCreateCompany) => {
    await mutateAsync(formData, {
      onSuccess: () => {
        setOpen(false)
      },
    })
  }

  return (
    <Drawer onOpenChange={setOpen} open={open}>
      <Drawer.Trigger asChild>
        <Button size="small" variant="secondary">
          Create
        </Button>
      </Drawer.Trigger>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Create Company</Drawer.Title>
        </Drawer.Header>
        <CompanyForm
          error={error}
          handleSubmit={handleSubmit}
          loading={isPending}
        />
      </Drawer.Content>
    </Drawer>
  )
}
