import { Button, Drawer, toast } from "@medusajs/ui"
import { getErrorMessage } from "@techsio/std/object"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import type { AdminCreateCompany, AdminUpdateCompany } from "../../../../types"
import { useCreateCompany } from "../../../hooks/api/companies"
import { CompanyForm } from "./company-form"

export const CompanyCreateDrawer = () => {
  const { t } = useTranslation("companies")
  const [open, setOpen] = useState(false)

  const { mutateAsync, isPending } = useCreateCompany()

  const handleSubmit = async (formData: AdminUpdateCompany) => {
    const { currency_code, email, name } = formData

    if (
      currency_code === undefined ||
      email === undefined ||
      name === undefined
    ) {
      toast.error(t("errors.createCompanyFailed"))
      return
    }

    const company: AdminCreateCompany = {
      address: formData.address ?? null,
      city: formData.city ?? null,
      country: formData.country ?? null,
      currency_code,
      email,
      logo_url: formData.logo_url ?? null,
      name,
      phone: formData.phone ?? "",
      state: formData.state ?? null,
      zip: formData.zip ?? null,
    }

    try {
      await mutateAsync(company)
      setOpen(false)
    } catch (error) {
      toast.error(
        `${t("errors.createCompanyFailed")}: ${getErrorMessage(error)}`,
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
