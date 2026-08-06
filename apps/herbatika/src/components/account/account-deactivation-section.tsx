"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { useAppToast } from "@/hooks/use-app-toast"
import { useDeactivateAccount } from "@/lib/storefront/auth"
import { cartStorage } from "@/lib/storefront/cart-storage"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import { AccountSurface } from "./account-surface"

export function AccountDeactivationSection() {
  const router = useRouter()
  const appToast = useAppToast()
  const deactivateAccountMutation = useDeactivateAccount()
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deactivationError, setDeactivationError] = useState<string | null>(
    null
  )

  const closeDialog = () => {
    if (deactivateAccountMutation.isPending) {
      return
    }

    setDeactivationError(null)
    setIsDialogOpen(false)
  }

  const handleDeactivateAccount = async () => {
    setDeactivationError(null)

    try {
      await deactivateAccountMutation.mutateAsync()
      cartStorage.clearCartId()
      setIsDialogOpen(false)
      appToast.success({
        title: "Účet bol zrušený",
        description: "Boli ste bezpečne odhlásení.",
      })
      router.replace("/")
    } catch (error) {
      setDeactivationError(resolveErrorMessage(error))
    }
  }

  return (
    <AccountSurface className="space-y-400">
      <header className="space-y-200">
        <h2 className="font-semibold text-xl">Zrušenie účtu</h2>
        <p className="text-fg-secondary text-sm">
          Po zrušení účtu sa už neprihlásite a stratíte prístup k jeho obsahu.
          Objednávky zostanú bezpečne uložené kvôli ich vybaveniu a zákonným
          povinnostiam.
        </p>
      </header>

      <Button
        onClick={() => {
          setDeactivationError(null)
          setIsDialogOpen(true)
        }}
        variant="danger"
      >
        Zrušiť účet
      </Button>

      <Dialog
        actions={
          <>
            <Button
              disabled={deactivateAccountMutation.isPending}
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
              disabled={deactivateAccountMutation.isPending}
              icon="token-icon-trash"
              isLoading={deactivateAccountMutation.isPending}
              loadingText="Ruší sa účet"
              onClick={() => {
                runDetachedPromise(handleDeactivateAccount())
              }}
              size="sm"
              type="button"
              variant="danger"
            >
              Áno, zrušiť účet
            </Button>
          </>
        }
        behavior="modal"
        className="shadow-md"
        closeOnEscape={!deactivateAccountMutation.isPending}
        closeOnInteractOutside={!deactivateAccountMutation.isPending}
        customTrigger
        description={
          <div className="space-y-200">
            <p>Táto akcia sa z pohľadu používateľa nedá vrátiť späť.</p>
            <ul className="list-disc space-y-100 pl-400">
              <li>Vaše prihlasovacie údaje prestanú fungovať.</li>
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
        title="Naozaj chcete zrušiť účet?"
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
