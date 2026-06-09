import { Button, Drawer } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { AdminCreateCompany, AdminUpdateCompany } from "../../../../types"
import { useCreateCompany } from "../../../hooks/api"
import { CompanyForm } from "./company-form"

export function CompanyCreateDrawer() {
  const { t } = useTranslation("companies")
  const [open, setOpen] = useState(false)

  const { mutateAsync, isPending, error } = useCreateCompany()

  const handleSubmit = async (formData: AdminUpdateCompany) => {
    await mutateAsync(formData as AdminCreateCompany, {
      onSuccess: () => {
        setOpen(false)
      },
    })
  }

  return (
    <Drawer onOpenChange={setOpen} open={open}>
      <Drawer.Trigger asChild>
        <Button size="small" variant="secondary">
          {t("actions.add")}
        </Button>
      </Drawer.Trigger>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("actions.createCompany")}</Drawer.Title>
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
