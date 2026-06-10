import {
  ArrowUturnLeft,
  Link,
  LockClosedSolid,
  PencilSquare,
  Trash,
} from "@medusajs/icons"
import { toast } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import type { QueryCompany } from "../../../../types"
import { ActionMenu, DeletePrompt } from "../../../components"
import { useDeleteCompany, useRestoreCompany } from "../../../hooks/api"
import {
  CompanyApprovalSettingsDrawer,
  CompanyCustomerGroupDrawer,
  CompanyUpdateDrawer,
} from "./"

export const CompanyActionsMenu = ({ company }: { company: QueryCompany }) => {
  const { t } = useTranslation("companies")
  const [editOpen, setEditOpen] = useState(false)
  const [customerGroupOpen, setCustomerGroupOpen] = useState(false)
  const [approvalSettingsOpen, setApprovalSettingsOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { mutateAsync: mutateDelete, isPending: loadingDelete } =
    useDeleteCompany(company.id)
  const { mutateAsync: mutateRestore, isPending: loadingRestore } =
    useRestoreCompany(company.id)

  const navigate = useNavigate()

  const handleDelete = () => {
    mutateDelete(undefined, {
      onSuccess: () => {
        navigate("/companies")
        toast.success(t("toasts.companyDeleted", { name: company.name }))
      },
    })
  }

  const handleRestore = () => {
    mutateRestore(undefined, {
      onSuccess: () => {
        toast.success(t("toasts.companyRestored", { name: company.name }))
      },
      onError: () => {
        toast.error(t("errors.restoreCompanyFailed"))
      },
    })
  }

  if (company.deleted_at) {
    return (
      <ActionMenu
        groups={[
          {
            actions: [
              {
                disabled: loadingRestore,
                icon: <ArrowUturnLeft />,
                label: t("actions.restore"),
                onClick: handleRestore,
              },
            ],
          },
        ]}
      />
    )
  }

  return (
    <>
      <ActionMenu
        groups={[
          {
            actions: [
              {
                icon: <PencilSquare />,
                label: t("actions.editDetails"),
                onClick: () => setEditOpen(true),
              },
              {
                icon: <Link />,
                label: t("actions.manageCustomerGroup"),
                onClick: () => setCustomerGroupOpen(true),
              },
              {
                icon: <LockClosedSolid />,
                label: t("approvalSettings.title"),
                onClick: () => setApprovalSettingsOpen(true),
              },
            ],
          },
          {
            actions: [
              {
                icon: <Trash />,
                label: t("actions.delete"),
                onClick: () => setDeleteOpen(true),
              },
            ],
          },
        ]}
      />

      <CompanyUpdateDrawer
        company={company}
        open={editOpen}
        setOpen={setEditOpen}
      />
      <CompanyCustomerGroupDrawer
        company={company}
        open={customerGroupOpen}
        setOpen={setCustomerGroupOpen}
      />
      <CompanyApprovalSettingsDrawer
        company={company}
        open={approvalSettingsOpen}
        setOpen={setApprovalSettingsOpen}
      />
      <DeletePrompt
        cancelText={t("actions.cancel")}
        confirmText={t("actions.delete")}
        description={t("prompts.deleteDescription")}
        handleDelete={handleDelete}
        loading={loadingDelete}
        open={deleteOpen}
        setOpen={setDeleteOpen}
        title={t("prompts.deleteTitle")}
      />
    </>
  )
}
