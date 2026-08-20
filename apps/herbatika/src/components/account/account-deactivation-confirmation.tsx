"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useState } from "react"
import { StorefrontLink } from "@/components/storefront-link"
import { useConfirmAccountDeactivation } from "@/lib/storefront/auth"
import { cartStorage } from "@/lib/storefront/cart-storage"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { buildPath } from "@/lib/url/public-url"
import { AccountSurface } from "./account-surface"

const MISSING_TOKEN_MESSAGE = "Potvrdzovací odkaz neobsahuje platný token."
const INVALID_TOKEN_MESSAGE =
  "Potvrdzovací odkaz je neplatný alebo jeho platnosť vypršala."
const DEACTIVATION_FAILED_MESSAGE = "Účet sa nepodarilo zrušiť."
const INVALID_TOKEN_ERROR_MESSAGE =
  "Account deactivation link is invalid or expired."

type AccountDeactivationConfirmationProps = {
  token: string
}

const isInvalidTokenError = (error: unknown) =>
  resolveErrorMessage(error, "").includes(INVALID_TOKEN_ERROR_MESSAGE)

export function AccountDeactivationConfirmation({
  token,
}: AccountDeactivationConfirmationProps) {
  const normalizedToken = token.trim()
  const { code: market } = useMarketContext()
  const homeHref = buildPath({ kind: "home" }, market)
  const confirmAccountDeactivationMutation = useConfirmAccountDeactivation()
  const [confirmationError, setConfirmationError] = useState<string | null>(
    null
  )
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
      window.setTimeout(() => window.location.replace(homeHref), 1200)
    } catch (error) {
      setConfirmationError(
        isInvalidTokenError(error)
          ? INVALID_TOKEN_MESSAGE
          : DEACTIVATION_FAILED_MESSAGE
      )
    }
  }

  return (
    <main className="mx-auto w-full max-w-max-w p-account-page 2xl:p-account-page-lg">
      <AccountSurface className="mx-auto max-w-auth-content space-y-400">
        <header className="space-y-200">
          <h1 className="font-semibold text-2xl">Potvrdenie zrušenia účtu</h1>
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

            <LinkButton
              as={StorefrontLink}
              href={homeHref}
              size="md"
              variant="primary"
            >
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
                as={StorefrontLink}
                href={homeHref}
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
