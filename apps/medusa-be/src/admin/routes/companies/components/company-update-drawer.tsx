import { Drawer, toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import type { AdminUpdateCompany, QueryCompany } from "../../../../types"
import { definedProperties } from "../../../../utils/defined-properties"
import { useUpdateCompany } from "../../../hooks/api"
import { CompanyForm } from "./company-form"

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

export function CompanyUpdateDrawer({
  company,
  open,
  setOpen,
}: {
  company: QueryCompany
  open: boolean
  setOpen: (open: boolean) => void
}) {
  const { t } = useTranslation("companies")
  const { mutateAsync, isPending } = useUpdateCompany(company.id)

  const currentData = definedProperties({
    address: company.address ?? undefined,
    city: company.city ?? undefined,
    country: company.country ?? undefined,
    currency_code: company.currency_code ?? undefined,
    email: company.email,
    logo_url: company.logo_url ?? undefined,
    name: company.name,
    phone: company.phone ?? undefined,
    state: company.state ?? undefined,
    zip: company.zip ?? undefined,
  })

  const handleSubmit = async (formData: AdminUpdateCompany) => {
    try {
      await mutateAsync(formData)
      setOpen(false)
      toast.success(t("toasts.companyUpdated", { name: formData.name }))
    } catch (error) {
      toast.error(
        `${t("errors.updateCompanyFailed")}: ${getErrorMessage(error)}`
      )
    }
  }

  return (
    <Drawer onOpenChange={setOpen} open={open}>
      <Drawer.Content className="z-50">
        <Drawer.Header>
          <Drawer.Title>{t("actions.editDetails")}</Drawer.Title>
        </Drawer.Header>

        <CompanyForm
          company={currentData}
          error={null}
          handleSubmit={handleSubmit}
          loading={isPending}
        />
      </Drawer.Content>
    </Drawer>
  )
}
