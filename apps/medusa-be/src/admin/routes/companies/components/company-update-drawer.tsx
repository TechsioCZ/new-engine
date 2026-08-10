import { Drawer, toast } from "@medusajs/ui"
import { getErrorMessage, omitUndefined } from "@techsio/std/object"
import { useTranslation } from "react-i18next"

import type { AdminUpdateCompany, QueryCompany } from "../../../../types"
import { useUpdateCompany } from "../../../hooks/api/companies"
import { CompanyForm } from "./company-form"

export const CompanyUpdateDrawer = ({
  company,
  open,
  setOpen,
}: {
  company: QueryCompany
  open: boolean
  setOpen: (open: boolean) => void
}) => {
  const { t } = useTranslation("companies")
  const { mutateAsync, isPending } = useUpdateCompany(company.id)

  const currentData = omitUndefined({
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
        `${t("errors.updateCompanyFailed")}: ${getErrorMessage(error)}`,
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
