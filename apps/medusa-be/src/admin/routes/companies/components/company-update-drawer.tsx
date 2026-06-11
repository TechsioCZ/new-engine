import { Drawer, toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { AdminUpdateCompany, QueryCompany } from "../../../../types"
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

  const currentData = {
    address: company.address,
    city: company.city,
    country: company.country,
    currency_code: company.currency_code,
    email: company.email,
    logo_url: company.logo_url,
    name: company.name,
    phone: company.phone,
    state: company.state,
    zip: company.zip,
  }

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
