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

export const AccountDeactivationSection = () => {
  const tAuth = useTranslations("auth")
  const appToast = useAppToast()
  const requestAccountDeactivationMutation = useRequestAccountDeactivation()
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isRequestSent, setIsRequestSent] = useState(false)
  const [deactivationError, setDeactivationError] = useState<string | null>(
    null,
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
        setDeactivationError(
          tAuth("account.deactivation.errors.request_failed"),
        )
        return
      }

      setIsRequestSent(true)
      setIsDialogOpen(false)
      appToast.success({
        description: tAuth("account.deactivation.toast.description"),
        title: tAuth("account.deactivation.toast.title"),
      })
    } catch {
      setDeactivationError(tAuth("account.deactivation.errors.request_failed"))
    }
  }

  return (
    <AccountSurface className="space-y-400">
      <header className="space-y-200">
        <h2 className="font-semibold text-xl">
          {tAuth("account.deactivation.section.title")}
        </h2>
        <p className="text-fg-secondary text-sm">
          {tAuth("account.deactivation.section.description")}
        </p>
      </header>

      {isRequestSent && (
        <StatusText align="start" showIcon status="success">
          {tAuth("account.deactivation.section.sent_status")}
        </StatusText>
      )}

      <Button
        onClick={() => {
          setDeactivationError(null)
          setIsDialogOpen(true)
        }}
        variant="danger"
      >
        {tAuth(
          isRequestSent
            ? "account.deactivation.section.resend_action"
            : "account.deactivation.section.request_action",
        )}
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
              {tAuth("account.deactivation.dialog.keep_action")}
            </Button>
            <Button
              disabled={requestAccountDeactivationMutation.isPending}
              isLoading={requestAccountDeactivationMutation.isPending}
              loadingText={tAuth("account.deactivation.dialog.loading")}
              onClick={() => {
                runDetachedPromise(handleRequestAccountDeactivation())
              }}
              size="sm"
              type="button"
              variant="danger"
            >
              {tAuth("account.deactivation.dialog.submit_action")}
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
            <p>{tAuth("account.deactivation.dialog.intro")}</p>
            <ul className="list-disc space-y-100 pl-400">
              <li>{tAuth("account.deactivation.dialog.link_expiry")}</li>
              <li>
                {tAuth("account.deactivation.dialog.confirmation_required")}
              </li>
              <li>{tAuth("account.deactivation.dialog.orders_preserved")}</li>
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
        title={tAuth("account.deactivation.dialog.title")}
      >
        {deactivationError !== null && (
          <StatusText align="start" showIcon status="error">
            {deactivationError}
          </StatusText>
        )}
      </Dialog>
    </AccountSurface>
  )
}
