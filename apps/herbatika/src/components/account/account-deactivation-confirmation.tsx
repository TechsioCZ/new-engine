"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import NextLink from "next/link"
import { useState } from "react"
import { useConfirmAccountDeactivation } from "@/lib/storefront/auth"
import { cartStorage } from "@/lib/storefront/cart-storage"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { AccountSurface } from "./account-surface"

const MISSING_TOKEN_MESSAGE = "Potvrdzovací odkaz neobsahuje platný token."
const INVALID_TOKEN_MESSAGE =
  "Potvrdzovací odkaz je neplatný alebo jeho platnosť vypršala."
const DEACTIVATION_FAILED_MESSAGE = "Účet sa nepodarilo zrušiť."

type AccountDeactivationConfirmationProps = {
  token: string
}

export function AccountDeactivationConfirmation({
  token,
}: AccountDeactivationConfirmationProps) {
  const normalizedToken = token.trim()
  const confirmAccountDeactivationMutation = useConfirmAccountDeactivation()
  const [confirmationError, setConfirmationError] = useState<string | null>(null)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const displayedError = normalizedToken
    ? confirmationError
    : MISSING_TOKEN_MESSAGE

  const handleConfirmAccountDeactivation = async () => {
    if (!normalizedToken) {
      return
    }

    setConfirmationError(null)

    try {
      const result = await confirmAccountDeactivationMutation.mutateAsync({
        token: normalizedToken,
      })
      if (!result.deleted) {
        setConfirmationError(DEACTIVATION_FAILED_MESSAGE)
        return
      }

      cartStorage.clearCartId()
      setIsConfirmed(true)
      window.setTimeout(() => window.location.replace("/"), 1200)
    } catch {
      setConfirmationError(INVALID_TOKEN_MESSAGE)
    }
  }

  return (
    <main className="mx-auto w-full max-w-max-w p-account-page 2xl:p-account-page-lg">
      <AccountSurface className="mx-auto max-w-auth-content space-y-400">
        <header className="space-y-200">
          <h1 className="font-semibold text-2xl">
            Potvrdenie zrušenia účtu
          </h1>
          <p className="text-fg-secondary text-sm">
            Po potvrdení sa už nebudete môcť prihlásiť. Vaše existujúce
            objednávky zostanú bezpečne uložené.
          </p>
        </header>

        {isConfirmed ? (
          <div className="space-y-300">
            <StatusText align="start" showIcon status="success">
              Účet bol zrušený. Pri opätovnej registrácii s rovnakým e-mailom sa
              obnoví pôvodný účet aj história objednávok.
            </StatusText>

            <LinkButton as={NextLink} href="/" size="md" variant="primary">
              Pokračovať do obchodu
            </LinkButton>
          </div>
        ) : (
          <div className="space-y-300">
            {displayedError ? (
              <StatusText align="start" showIcon status="error">
                {displayedError}
              </StatusText>
            ) : null}

            <div className="flex flex-col gap-200 sm:flex-row sm:items-center">
              <Button
                disabled={
                  !normalizedToken ||
                  confirmAccountDeactivationMutation.isPending
                }
                isLoading={confirmAccountDeactivationMutation.isPending}
                loadingText="Ruší sa účet"
                onClick={() => {
                  runDetachedPromise(handleConfirmAccountDeactivation())
                }}
                variant="danger"
              >
                Potvrdiť zrušenie účtu
              </Button>

              <LinkButton
                as={NextLink}
                href="/"
                size="md"
                theme="outlined"
                variant="secondary"
              >
                Ponechať účet
              </LinkButton>
            </div>
          </div>
        )}
      </AccountSurface>
    </main>
  )
}
