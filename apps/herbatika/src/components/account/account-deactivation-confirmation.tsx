"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useTranslations } from "next-intl"
import NextLink from "next/link"
import { useState } from "react"

import { useConfirmAccountDeactivation } from "@/lib/storefront/auth"
import { cartStorage } from "@/lib/storefront/cart-storage"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"

import { AccountSurface } from "./account-surface"

interface AccountDeactivationConfirmationProps {
  token: string
}

export const AccountDeactivationConfirmation = ({
  token,
}: AccountDeactivationConfirmationProps) => {
  const tAuth = useTranslations("auth")
  const normalizedToken = token.trim()
  const confirmAccountDeactivationMutation = useConfirmAccountDeactivation()
  const [confirmationError, setConfirmationError] = useState<string | null>(
    normalizedToken ? null : tAuth("account.deactivation.errors.invalid_token"),
  )
  const [isConfirmed, setIsConfirmed] = useState(false)

  const handleConfirmAccountDeactivation = async () => {
    if (!normalizedToken) {
      setConfirmationError(tAuth("account.deactivation.errors.invalid_token"))
      return
    }

    setConfirmationError(null)

    try {
      const result = await confirmAccountDeactivationMutation.mutateAsync({
        token: normalizedToken,
      })
      if (!result.deleted) {
        setConfirmationError(
          tAuth("account.deactivation.errors.confirmation_failed"),
        )
        return
      }

      cartStorage.clearCartId()
      setIsConfirmed(true)
      window.setTimeout(() => {
        window.location.replace("/")
      }, 1200)
    } catch {
      setConfirmationError(
        tAuth("account.deactivation.errors.confirmation_failed"),
      )
    }
  }

  return (
    <main className="mx-auto w-full max-w-max-w p-account-page 2xl:p-account-page-lg">
      <AccountSurface className="mx-auto max-w-auth-content space-y-400">
        <header className="space-y-200">
          <h1 className="font-semibold text-2xl">
            {tAuth("account.deactivation.confirmation.title")}
          </h1>
          <p className="text-fg-secondary text-sm">
            {tAuth("account.deactivation.confirmation.description")}
          </p>
        </header>

        {isConfirmed ? (
          <div className="space-y-300">
            <StatusText align="start" showIcon status="success">
              {tAuth("account.deactivation.confirmation.success")}
            </StatusText>

            <LinkButton as={NextLink} href="/" size="md" variant="primary">
              {tAuth("account.deactivation.confirmation.store_action")}
            </LinkButton>
          </div>
        ) : (
          <div className="space-y-300">
            {confirmationError === null ? null : (
              <StatusText align="start" showIcon status="error">
                {confirmationError}
              </StatusText>
            )}

            <div className="flex flex-col gap-200 sm:flex-row sm:items-center">
              <Button
                disabled={
                  !normalizedToken ||
                  confirmAccountDeactivationMutation.isPending
                }
                isLoading={confirmAccountDeactivationMutation.isPending}
                loadingText={tAuth("account.deactivation.confirmation.loading")}
                onClick={() => {
                  runDetachedPromise(handleConfirmAccountDeactivation())
                }}
                variant="danger"
              >
                {tAuth("account.deactivation.confirmation.confirm_action")}
              </Button>

              <LinkButton
                as={NextLink}
                href="/"
                size="md"
                theme="outlined"
                variant="secondary"
              >
                {tAuth("account.deactivation.dialog.keep_action")}
              </LinkButton>
            </div>
          </div>
        )}
      </AccountSurface>
    </main>
  )
}
