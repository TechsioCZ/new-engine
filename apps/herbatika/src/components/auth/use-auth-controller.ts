"use client"

import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { useTranslations } from "next-intl"
import { redirect, useRouter } from "next/navigation"
import { useState } from "react"

import {
  buildAuthRouteHref,
  buildLoginDefaults,
  buildRegisterDefaults,
  buildRegisterSuccessNotice,
  resolveSafeRedirectHref,
} from "@/components/auth/auth-helpers"
import { usePostAuthCartTransfer } from "@/components/auth/use-post-auth-cart-transfer"
import { useRegisterCountryItems } from "@/components/auth/use-register-country-items"
import {
  isWholesaleRegistration,
  resolveLoginSubmitError,
  resolveRegisterSubmitError,
} from "@/lib/auth/auth-form-validators"
import type {
  LoginFormValues,
  RegisterFormValues,
} from "@/lib/auth/auth-form-validators"
import { buildAuthRegisterInput } from "@/lib/auth/register-payload"
import { useAuth, useLogin, useRegister } from "@/lib/storefront/auth"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"

interface UseAuthControllerProps {
  mode: "login" | "register"
  afterAuthHref?: string
}

export interface AuthController {
  authMessage: string | null
  authNotice: string | null
  authQuery: ReturnType<typeof useAuth>
  cartQuery: ReturnType<typeof usePostAuthCartTransfer>["cartQuery"]
  description: string
  forgotPasswordHref: "/auth/forgot-password"
  handleLoginSubmit: (values: LoginFormValues) => Promise<string | null>
  handleRegisterSubmit: (values: RegisterFormValues) => Promise<string | null>
  isBusy: boolean
  loginDefaultValues: ReturnType<typeof buildLoginDefaults>
  loginHref: ReturnType<typeof buildAuthRouteHref>
  registerCountryItems: ReturnType<typeof useRegisterCountryItems>
  registerDefaultValues: ReturnType<typeof buildRegisterDefaults>
  registerHref: ReturnType<typeof buildAuthRouteHref>
  title: string
  transferCartIfAvailable: ReturnType<
    typeof usePostAuthCartTransfer
  >["transferCartIfAvailable"]
  transferCartMutation: ReturnType<
    typeof usePostAuthCartTransfer
  >["transferCartMutation"]
}

export const useAuthController = ({
  mode,
  afterAuthHref,
}: UseAuthControllerProps): AuthController => {
  const tAuth = useTranslations("auth")
  const router = useRouter()
  const marketContext = useMarketContext()
  const region = useRegionContext()
  const authQuery = useAuth()
  const loginMutation = useLogin()
  const registerMutation = useRegister()
  const registerCountryItems = useRegisterCountryItems()
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [authNotice, setAuthNotice] = useState<string | null>(null)
  const {
    cartQuery,
    runPostAuthCartTransfer,
    transferCartIfAvailable,
    transferCartMutation,
  } = usePostAuthCartTransfer({
    ...(region?.country_code === undefined
      ? {}
      : { countryCode: region.country_code }),
    failureMessage: tAuth("cart_transfer_failed"),
    ...(region?.region_id === undefined ? {} : { regionId: region.region_id }),
  })

  const safeRedirectHref = resolveSafeRedirectHref(afterAuthHref)
  const loginDefaultValues = buildLoginDefaults()
  const registerDefaultValues = buildRegisterDefaults({
    countryCode: marketContext.countryCode,
  })

  const clearFeedback = () => {
    setAuthMessage(null)
    setAuthNotice(null)
  }

  const handleLoginSubmit = async (
    values: LoginFormValues,
  ): Promise<string | null> => {
    clearFeedback()

    try {
      await loginMutation.mutateAsync(values)
      const transferNotice = await runPostAuthCartTransfer()

      if (safeRedirectHref !== null) {
        router.replace(safeRedirectHref)
        return null
      }

      setAuthMessage(tAuth("login.success"))
      setAuthNotice(transferNotice)
      return null
    } catch (error) {
      return resolveLoginSubmitError(error, {
        failed: tAuth("login.failed"),
        invalidCredentials: tAuth("login.invalid_credentials"),
      })
    }
  }

  const handleRegisterSubmit = async (
    values: RegisterFormValues,
  ): Promise<string | null> => {
    clearFeedback()

    try {
      await registerMutation.mutateAsync(
        buildAuthRegisterInput(values, {
          currencyCode: resolveRegionCurrency(region),
        }),
      )
      const transferNotice = await runPostAuthCartTransfer()

      if (safeRedirectHref !== null) {
        router.replace(safeRedirectHref)
        return null
      }

      setAuthMessage(tAuth("register.success"))
      setAuthNotice(
        buildRegisterSuccessNotice({
          isWholesale: isWholesaleRegistration(values),
          transferNotice,
          wholesaleNotice: tAuth("register.wholesale_success"),
        }),
      )
      return null
    } catch (error) {
      return resolveRegisterSubmitError(error, {
        emailExists: tAuth("register.email_exists"),
        failed: tAuth("register.failed"),
      })
    }
  }

  const isBusy =
    loginMutation.isPending ||
    registerMutation.isPending ||
    transferCartMutation.isPending

  const title =
    mode === "register" ? tAuth("register.title") : tAuth("login.title")
  const description =
    mode === "register"
      ? tAuth("register.description")
      : tAuth("login.description")
  const loginHref = buildAuthRouteHref(
    "/auth/login",
    safeRedirectHref ?? undefined,
  )
  const registerHref = buildAuthRouteHref(
    "/auth/register",
    safeRedirectHref ?? undefined,
  )
  if (
    !authQuery.isLoading &&
    authQuery.isAuthenticated &&
    safeRedirectHref !== null
  ) {
    redirect(safeRedirectHref)
  }

  return {
    authMessage,
    authNotice,
    authQuery,
    cartQuery,
    description,
    forgotPasswordHref: "/auth/forgot-password",
    handleLoginSubmit,
    handleRegisterSubmit,
    isBusy,
    loginDefaultValues,
    loginHref,
    registerCountryItems,
    registerDefaultValues,
    registerHref,
    title,
    transferCartIfAvailable,
    transferCartMutation,
  }
}
