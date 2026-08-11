import { Check, Clock, XMark } from "@medusajs/icons"
import { Button, DropdownMenu, toast, usePrompt } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { QueryCompany } from "../../../../types"
import { useUpdateCompanyApplicationStatusMutation } from "../../../hooks/api"

type CompanyApplicationStatus = "approved" | "pending" | "rejected"

const APPLICATION_STATUS_ACTIONS: Array<{
  icon: typeof Check
  labelKey:
    | "actions.approveApplication"
    | "actions.markApplicationPending"
    | "actions.rejectApplication"
  status: CompanyApplicationStatus
  toastKey:
    | "toasts.companyApplicationApproved"
    | "toasts.companyApplicationPending"
    | "toasts.companyApplicationRejected"
}> = [
  {
    icon: Check,
    labelKey: "actions.approveApplication",
    status: "approved",
    toastKey: "toasts.companyApplicationApproved",
  },
  {
    icon: Clock,
    labelKey: "actions.markApplicationPending",
    status: "pending",
    toastKey: "toasts.companyApplicationPending",
  },
  {
    icon: XMark,
    labelKey: "actions.rejectApplication",
    status: "rejected",
    toastKey: "toasts.companyApplicationRejected",
  },
]

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

export const CompanyApplicationStatusButton = ({
  company,
}: {
  company: QueryCompany
}) => {
  const { t } = useTranslation("companies")
  const dialog = usePrompt()
  const {
    mutateAsync: mutateApplicationStatus,
    isPending: loadingApplicationStatus,
  } = useUpdateCompanyApplicationStatusMutation(company.id)

  const handleApplicationStatusChange = async ({
    status,
    toastKey,
  }: {
    status: CompanyApplicationStatus
    toastKey: (typeof APPLICATION_STATUS_ACTIONS)[number]["toastKey"]
  }) => {
    const confirmed = await dialog({
      title: t("prompts.changeApplicationStatusTitle"),
      description: t("prompts.changeApplicationStatusDescription", {
        name: company.name,
        status: t(`status.${status}`),
      }),
      confirmText: t("actions.changeApplicationState"),
      cancelText: t("actions.cancel"),
    })

    if (!confirmed) {
      return
    }

    try {
      await mutateApplicationStatus(
        { status },
        {
          onSuccess: () => {
            toast.success(t(toastKey, { name: company.name }))
          },
        }
      )
    } catch (error) {
      toast.error(
        `${t("errors.changeCompanyApplicationStatusFailed")}: ${getErrorMessage(error)}`
      )
      return
    }
  }

  if (company.deleted_at) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <Button
          isLoading={loadingApplicationStatus}
          size="small"
          variant="secondary"
        >
          {t("actions.changeApplicationState")}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content onClick={(event) => event.stopPropagation()}>
        {APPLICATION_STATUS_ACTIONS.filter(
          (action) => action.status !== company.application_status
        ).map((action) => {
          const Icon = action.icon

          return (
            <DropdownMenu.Item
              className="flex items-center gap-x-2"
              disabled={loadingApplicationStatus}
              key={action.status}
              onClick={(event) => {
                event.stopPropagation()
                handleApplicationStatusChange(action)
              }}
            >
              <Icon className="text-ui-fg-subtle" />
              <span>{t(action.labelKey)}</span>
            </DropdownMenu.Item>
          )
        })}
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}
