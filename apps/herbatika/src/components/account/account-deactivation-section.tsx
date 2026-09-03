"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import { useTranslations } from "next-intl"
import { useRef, useState } from "react"
import { useAppToast } from "@/hooks/use-app-toast"
import { useRequestAccountDeactivation } from "@/lib/storefront/auth"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { AccountSurface } from "./account-surface"

export function AccountDeactivationSection() {
  const t = useTranslations("auth")
  const appToast = useAppToast()
  const requestAccountDeactivationMutation = useRequestAccountDeactivation()
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isRequestSent, setIsRequestSent] = useState(false)
  const [deactivationError, setDeactivationError] = useState<string | null>(
    null
  )

  const closeDialog = () => {
    if (requestAccountDeactivationMutation.isPending) {
      return
    }

    setDeactivationError(null)
    setIsDialogOpen(false)
  }

  const handleRequestAccountDeactivation = async () => {
    setDeactivationError(null)

    try {
      const result = await requestAccountDeactivationMutation.mutateAsync()
      if (!result.sent) {
        setDeactivationError(t("deactivation.request.failed"))
        return
      }

      setIsRequestSent(true)
      setIsDialogOpen(false)
      appToast.success({
        title: t("deactivation.request.toast_title"),
        description: t("deactivation.request.toast_description"),
      })
    } catch {
      setDeactivationError(t("deactivation.request.failed"))
    }
  }

  return (
    <AccountSurface className="space-y-400">
      <header className="space-y-200">
        <h2 className="font-semibold text-xl">
          {t("deactivation.request.title")}
        </h2>
        <p className="text-fg-secondary text-sm">
          {t("deactivation.request.description")}
        </p>
      </header>

      {isRequestSent && (
        <StatusText align="start" showIcon status="success">
          {t("deactivation.request.sent_status")}
        </StatusText>
      )}

      <Button
        onClick={() => {
          setDeactivationError(null)
          setIsDialogOpen(true)
        }}
        variant="danger"
      >
        {isRequestSent
          ? t("deactivation.request.resend_action")
          : t("deactivation.request.action")}
      </Button>

      <Dialog
        actions={
          <>
            <Button
              disabled={requestAccountDeactivationMutation.isPending}
              onClick={closeDialog}
              ref={cancelButtonRef}
              size="sm"
              theme="outlined"
              type="button"
              variant="secondary"
            >
              {t("deactivation.dialog.keep_account")}
            </Button>
            <Button
              disabled={requestAccountDeactivationMutation.isPending}
              isLoading={requestAccountDeactivationMutation.isPending}
              loadingText={t("deactivation.dialog.sending")}
              onClick={() => {
                runDetachedPromise(handleRequestAccountDeactivation())
              }}
              size="sm"
              type="button"
              variant="danger"
            >
              {t("deactivation.dialog.send")}
            </Button>
          </>
        }
        behavior="modal"
        className="shadow-md"
        closeOnEscape={!requestAccountDeactivationMutation.isPending}
        closeOnInteractOutside={!requestAccountDeactivationMutation.isPending}
        customTrigger
        description={
          <div className="space-y-200">
            <p>{t("deactivation.dialog.intro")}</p>
            <ul className="list-disc space-y-100 pl-400">
              <li>{t("deactivation.dialog.email_notice")}</li>
              <li>{t("deactivation.dialog.confirmation_notice")}</li>
              <li>{t("deactivation.dialog.orders_notice")}</li>
            </ul>
          </div>
        }
        hideCloseButton
        initialFocusEl={() => cancelButtonRef.current}
        onOpenChange={({ open }) => {
          if (open) {
            setIsDialogOpen(true)
            return
          }

          closeDialog()
        }}
        open={isDialogOpen}
        role="alertdialog"
        size="sm"
        title={t("deactivation.dialog.title")}
      >
        {deactivationError && (
          <StatusText align="start" showIcon status="error">
            {deactivationError}
          </StatusText>
        )}
      </Dialog>
    </AccountSurface>
  )
}
