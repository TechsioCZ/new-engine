import { Button, Drawer, toast } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { AdminCreateCompany, AdminUpdateCompany } from "../../../../types"
import { useCreateCompany } from "../../../hooks/api"
import { CompanyForm } from "./company-form"

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

export function CompanyCreateDrawer() {
  const { t } = useTranslation("companies")
  const [open, setOpen] = useState(false)

  const { mutateAsync, isPending } = useCreateCompany()

  const handleSubmit = async (formData: AdminUpdateCompany) => {
    try {
      await mutateAsync(formData as AdminCreateCompany)
      setOpen(false)
    } catch (error) {
      toast.error(
        `${t("errors.createCompanyFailed")}: ${getErrorMessage(error)}`
      )
    }
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
          error={null}
          handleSubmit={handleSubmit}
          loading={isPending}
        />
      </Drawer.Content>
    </Drawer>
  )
}
