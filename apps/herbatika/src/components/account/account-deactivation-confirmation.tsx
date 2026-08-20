"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { StorefrontLink } from "@/components/storefront-link"
import { useConfirmAccountDeactivation } from "@/lib/storefront/auth"
import { cartStorage } from "@/lib/storefront/cart-storage"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { buildPath } from "@/lib/url/public-url"
import { AccountSurface } from "./account-surface"

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
  const t = useTranslations("auth")
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
    : t("deactivation.confirmation.missing_token")

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
        setConfirmationError(t("deactivation.confirmation.failed"))
        return
      }

      cartStorage.clearCartId()
      setIsConfirmed(true)
      window.setTimeout(() => window.location.replace(homeHref), 1200)
    } catch (error) {
      setConfirmationError(
        isInvalidTokenError(error)
          ? t("deactivation.confirmation.invalid_token")
          : t("deactivation.confirmation.failed")
      )
    }
  }

  return (
    <main className="mx-auto w-full max-w-max-w p-account-page 2xl:p-account-page-lg">
      <AccountSurface className="mx-auto max-w-auth-content space-y-400">
        <header className="space-y-200">
          <h1 className="font-semibold text-2xl">
            {t("deactivation.confirmation.title")}
          </h1>
          <p className="text-fg-secondary text-sm">
            {t("deactivation.confirmation.description")}
          </p>
        </header>

        {isConfirmed ? (
          <div className="space-y-300">
            <StatusText align="start" showIcon status="success">
              {t("deactivation.confirmation.success")}
            </StatusText>

            <LinkButton
              as={StorefrontLink}
              href={homeHref}
              size="md"
              variant="primary"
            >
              {t("deactivation.confirmation.continue")}
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
                loadingText={t("deactivation.confirmation.confirming")}
                onClick={() => {
                  runDetachedPromise(handleConfirmAccountDeactivation())
                }}
                variant="danger"
              >
                {t("deactivation.confirmation.confirm")}
              </Button>

              <LinkButton
                as={StorefrontLink}
                href={homeHref}
                size="md"
                theme="outlined"
                variant="secondary"
              >
                {t("deactivation.dialog.keep_account")}
              </LinkButton>
            </div>
          </div>
        )}
      </AccountSurface>
    </main>
  )
}
