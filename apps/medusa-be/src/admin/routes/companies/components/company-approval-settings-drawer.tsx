import { Button, Drawer, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type { QueryCompany } from "../../../../types"
import { CoolSwitch } from "../../../components"
import { useUpdateApprovalSettings } from "../../../hooks/api"

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

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
    company.approval_settings?.requires_admin_approval ?? false
  )
  const [requiresSalesManagerApproval, setRequiresSalesManagerApproval] =
    useState(
      company.approval_settings?.requires_sales_manager_approval ?? false
    )

  const { mutateAsync, isPending } = useUpdateApprovalSettings(company.id)

  useEffect(() => {
    setRequiresAdminApproval(
      company.approval_settings?.requires_admin_approval ?? false
    )
    setRequiresSalesManagerApproval(
      company.approval_settings?.requires_sales_manager_approval ?? false
    )
  }, [company.approval_settings])

  const handleSubmit = async () => {
    try {
      await mutateAsync({
        requires_admin_approval: requiresAdminApproval,
        requires_sales_manager_approval: requiresSalesManagerApproval,
      })
      setOpen(false)
      toast.success(t("toasts.approvalSettingsUpdated"))
    } catch (error) {
      toast.error(
        `${t("errors.updateApprovalSettingsFailed")}: ${getErrorMessage(error)}`
      )
    }
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
          <Button
            onClick={() => setOpen(false)}
            size="small"
            variant="secondary"
          >
            {t("actions.cancel")}
          </Button>
          <Button isLoading={isPending} onClick={handleSubmit} size="small">
            {t("actions.save")}
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}
