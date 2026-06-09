import { Button, Drawer, toast } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { QueryCompany } from "../../../../types"
import { CoolSwitch } from "../../../components/common"
import { useUpdateApprovalSettings } from "../../../hooks/api"

export function CompanyApprovalSettingsDrawer({
  company,
  open,
  setOpen,
}: {
  company: QueryCompany
  open: boolean
  setOpen: (open: boolean) => void
}) {
  const { t } = useTranslation("companies")
  const [requiresAdminApproval, setRequiresAdminApproval] = useState(
    company.approval_settings?.requires_admin_approval
  )
  const [requiresSalesManagerApproval, setRequiresSalesManagerApproval] =
    useState(company.approval_settings?.requires_sales_manager_approval)

  const { mutateAsync, isPending } = useUpdateApprovalSettings(company.id)

  const { approval_settings } = company

  const handleSubmit = async () => {
    await mutateAsync(
      {
        id: approval_settings.id,
        requires_admin_approval: requiresAdminApproval,
        requires_sales_manager_approval: requiresSalesManagerApproval,
      },
      {
        onSuccess: async () => {
          setOpen(false)
          toast.success(t("toasts.approvalSettingsUpdated"))
        },
        onError: (_error) => {
          toast.error(t("errors.updateApprovalSettingsFailed"))
        },
      }
    )
  }

  return (
    <Drawer onOpenChange={setOpen} open={open}>
      <Drawer.Content className="z-50">
        <Drawer.Header>
          <Drawer.Title>{t("approvalSettings.title")}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <CoolSwitch
              checked={requiresAdminApproval}
              description={t("approvalSettings.adminApprovalDescription")}
              fieldName="requires_admin_approval"
              label={t("approvalSettings.adminApprovalLabel")}
              onChange={() => setRequiresAdminApproval(!requiresAdminApproval)}
            />
          </div>

          <div className="flex items-center gap-2">
            <CoolSwitch
              checked={requiresSalesManagerApproval}
              description={t(
                "approvalSettings.salesManagerApprovalDescription"
              )}
              fieldName="requires_sales_manager_approval"
              label={t("approvalSettings.salesManagerApprovalLabel")}
              onChange={() =>
                setRequiresSalesManagerApproval(!requiresSalesManagerApproval)
              }
            />
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <Button onClick={() => setOpen(false)} variant="secondary">
            {t("actions.cancel")}
          </Button>
          <Button isLoading={isPending} onClick={handleSubmit}>
            {t("actions.save")}
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}
