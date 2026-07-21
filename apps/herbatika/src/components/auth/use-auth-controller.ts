"use client"

import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import {
  buildAuthRouteHref,
  buildLoginDefaults,
  buildRegisterDefaults,
  buildRegisterSuccessNotice,
  resolveSafeRedirectHref,
} from "@/components/auth/auth-helpers"
import { useRegisterCountryItems } from "@/components/auth/use-register-country-items"
import {
  isWholesaleRegistration,
  type LoginFormValues,
  type RegisterFormValues,
  resolveLoginSubmitError,
  resolveRegisterSubmitError,
} from "@/lib/auth/auth-form-validators"
import { buildAuthRegisterInput } from "@/lib/auth/register-payload"
import { useAuth, useLogin, useRegister } from "@/lib/storefront/auth"
import {
  cartReadQueryOptions,
  useCart,
  useTransferCart,
} from "@/lib/storefront/cart"
import { cartStorage } from "@/lib/storefront/cart-storage"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"

type AuthControlsMode = "login" | "register"

type UseAuthControllerProps = {
  mode: AuthControlsMode
  afterAuthHref?: string
}

export const useAuthController = ({
  mode,
  afterAuthHref,
}: UseAuthControllerProps) => {
  const tAuth = useTranslations("auth")
  const router = useRouter()
  const marketContext = useMarketContext()
  const region = useRegionContext()
  const authQuery = useAuth()
  const loginMutation = useLogin()
  const registerMutation = useRegister()
  const transferCartMutation = useTransferCart()
  const registerCountryItems = useRegisterCountryItems()
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [authNotice, setAuthNotice] = useState<string | null>(null)

  const cartQuery = useCart(
    {
      autoCreate: false,
      region_id: region?.region_id,
      country_code: region?.country_code,
      enabled: Boolean(region?.region_id),
    },
    {
      queryOptions: cartReadQueryOptions,
    }
  )

  const safeRedirectHref = resolveSafeRedirectHref(afterAuthHref)
  const loginDefaultValues = buildLoginDefaults()
  const registerDefaultValues = buildRegisterDefaults({
    countryCode: marketContext.countryCode,
  })

  const clearFeedback = () => {
    setAuthMessage(null)
    setAuthNotice(null)
  }

  const transferCartIfAvailable = async () => {
    const activeCartId = cartQuery.cart?.id
    if (!activeCartId) {
      return
    }

    const transferredCart = await transferCartMutation.mutateAsync({
      cartId: activeCartId,
    })
    if (transferredCart?.id) {
      cartStorage.setCartId(transferredCart.id)
    }
  }

  const runPostAuthCartTransfer = async () => {
    if (!cartQuery.cart?.id) {
      return null
    }

    try {
      await transferCartIfAvailable()
      return null
    } catch {
      return tAuth("cart_transfer_failed")
    }
  }

  useEffect(() => {
    if (!safeRedirectHref) {
      return
    }

    if (authQuery.isLoading || !authQuery.isAuthenticated) {
      return
    }

    router.replace(safeRedirectHref)
  }, [authQuery.isAuthenticated, authQuery.isLoading, router, safeRedirectHref])

  const handleLoginSubmit = async (
    values: LoginFormValues
  ): Promise<string | null> => {
    clearFeedback()

    try {
      await loginMutation.mutateAsync(values)
      const transferNotice = await runPostAuthCartTransfer()

      if (safeRedirectHref) {
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
    values: RegisterFormValues
  ): Promise<string | null> => {
    clearFeedback()

    try {
      await registerMutation.mutateAsync(
        buildAuthRegisterInput(values, {
          currencyCode: resolveRegionCurrency(region),
        })
      )
      const transferNotice = await runPostAuthCartTransfer()

      if (safeRedirectHref) {
        router.replace(safeRedirectHref)
        return null
      }

      setAuthMessage(tAuth("register.success"))
      setAuthNotice(
        buildRegisterSuccessNotice({
          isWholesale: isWholesaleRegistration(values),
          transferNotice,
          wholesaleNotice: tAuth("register.wholesale_success"),
        })
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
    safeRedirectHref ?? undefined
  )
  const registerHref = buildAuthRouteHref(
    "/auth/register",
    safeRedirectHref ?? undefined
  )
  const forgotPasswordHref = "/auth/forgot-password"

  return {
    authMessage,
    authNotice,
    authQuery,
    cartQuery,
    description,
    handleLoginSubmit,
    handleRegisterSubmit,
    isBusy,
    loginDefaultValues,
    loginHref,
    registerCountryItems,
    registerDefaultValues,
    registerHref,
    forgotPasswordHref,
    title,
    transferCartIfAvailable,
    transferCartMutation,
  }
}
