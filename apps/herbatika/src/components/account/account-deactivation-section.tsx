"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import { useRef, useState } from "react"
import { useAppToast } from "@/hooks/use-app-toast"
import { useRequestAccountDeactivation } from "@/lib/storefront/auth"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import { AccountSurface } from "./account-surface"

export function AccountDeactivationSection() {
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
        throw new Error("Potvrdzovací e-mail sa nepodarilo odoslať.")
      }

      setIsRequestSent(true)
      setIsDialogOpen(false)
      appToast.success({
        title: "Potvrdzovací e-mail bol odoslaný",
        description:
          "Účet zostáva aktívny, kým jeho zrušenie nepotvrdíte v e-maile.",
      })
    } catch (error) {
      setDeactivationError(resolveErrorMessage(error))
    }
  }

  return (
    <AccountSurface className="space-y-400">
      <header className="space-y-200">
        <h2 className="font-semibold text-xl">Zrušenie účtu</h2>
        <p className="text-fg-secondary text-sm">
          Pošleme vám e-mail s odkazom na potvrdenie. Účet zostane aktívny, kým
          odkaz nepoužijete. Existujúce objednávky sa nevymažú.
        </p>
      </header>

      {isRequestSent && (
        <StatusText align="start" showIcon status="success">
          Skontrolujte si e-mail. Potvrdzovací odkaz je platný 30 minút.
        </StatusText>
      )}

      <Button
        onClick={() => {
          setDeactivationError(null)
          setIsDialogOpen(true)
        }}
        variant="danger"
      >
        {isRequestSent ? "Znovu odoslať e-mail" : "Požiadať o zrušenie účtu"}
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
              Ponechať účet
            </Button>
            <Button
              disabled={requestAccountDeactivationMutation.isPending}
              isLoading={requestAccountDeactivationMutation.isPending}
              loadingText="Odosiela sa e-mail"
              onClick={() => {
                runDetachedPromise(handleRequestAccountDeactivation())
              }}
              size="sm"
              type="button"
              variant="danger"
            >
              Odoslať potvrdzovací e-mail
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
            <p>Účet sa týmto krokom ešte nezruší.</p>
            <ul className="list-disc space-y-100 pl-400">
              <li>Na váš e-mail pošleme odkaz platný 30 minút.</li>
              <li>Účet zrušíme až po otvorení odkazu a potvrdení.</li>
              <li>Existujúce objednávky sa nevymažú.</li>
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
        title="Odoslať potvrdenie zrušenia účtu?"
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
