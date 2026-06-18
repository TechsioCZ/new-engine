"use client"

import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
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
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"
import { useLogoutAction } from "@/lib/storefront/use-logout-action"

type AuthControlsMode = "login" | "register"

type UseAuthControllerProps = {
  mode: AuthControlsMode
  afterAuthHref?: string
}

export const useAuthController = ({
  mode,
  afterAuthHref,
}: UseAuthControllerProps) => {
  const router = useRouter()
  const region = useRegionContext()
  const authQuery = useAuth()
  const loginMutation = useLogin()
  const registerMutation = useRegister()
  const transferCartMutation = useTransferCart()
  const registerCountryItems = useRegisterCountryItems(region)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [authNotice, setAuthNotice] = useState<string | null>(null)
  const { handleLogout: performLogout, logoutMutation } = useLogoutAction()

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

  const safeRedirectHref = useMemo(
    () => resolveSafeRedirectHref(afterAuthHref),
    [afterAuthHref]
  )
  const loginDefaultValues = useMemo(() => buildLoginDefaults(), [])
  const registerDefaultValues = useMemo(
    () => buildRegisterDefaults({ countryCode: region?.country_code }),
    [region?.country_code]
  )

  const clearFeedback = useCallback(() => {
    setAuthError(null)
    setAuthMessage(null)
    setAuthNotice(null)
  }, [])

  const transferCartIfAvailable = useCallback(async () => {
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
  }, [cartQuery.cart?.id, transferCartMutation])

  const runPostAuthCartTransfer = useCallback(async () => {
    if (!cartQuery.cart?.id) {
      return null
    }

    try {
      await transferCartIfAvailable()
      return null
    } catch {
      return "Účet je aktívny, ale obsah košíka sa nepodarilo preniesť. Skúste to prosím znova v košíku."
    }
  }, [cartQuery.cart?.id, transferCartIfAvailable])

  useEffect(() => {
    if (!safeRedirectHref) {
      return
    }

    if (authQuery.isLoading || !authQuery.isAuthenticated) {
      return
    }

    router.replace(safeRedirectHref)
  }, [authQuery.isAuthenticated, authQuery.isLoading, router, safeRedirectHref])

  const handleLoginSubmit = useCallback(
    async (values: LoginFormValues): Promise<string | null> => {
      clearFeedback()

      try {
        await loginMutation.mutateAsync(values)
        const transferNotice = await runPostAuthCartTransfer()

        if (safeRedirectHref) {
          router.replace(safeRedirectHref)
          return null
        }

        setAuthMessage("Prihlásenie prebehlo úspešne.")
        setAuthNotice(transferNotice)
        return null
      } catch (error) {
        return resolveLoginSubmitError(error)
      }
    },
    [
      clearFeedback,
      loginMutation,
      router,
      runPostAuthCartTransfer,
      safeRedirectHref,
    ]
  )

  const handleRegisterSubmit = useCallback(
    async (values: RegisterFormValues): Promise<string | null> => {
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

        setAuthMessage("Registrácia prebehla úspešne.")
        setAuthNotice(
          buildRegisterSuccessNotice({
            isWholesale: isWholesaleRegistration(values),
            transferNotice,
          })
        )
        return null
      } catch (error) {
        return resolveRegisterSubmitError(error)
      }
    },
    [
      clearFeedback,
      registerMutation,
      region,
      router,
      runPostAuthCartTransfer,
      safeRedirectHref,
    ]
  )

  const handleLogout = useCallback(async () => {
    clearFeedback()

    const result = await performLogout()
    if (result.ok) {
      setAuthMessage("Odhlásenie prebehlo úspešne.")
      return
    }

    setAuthError(result.error)
  }, [clearFeedback, performLogout])

  const handleTransferCart = useCallback(async () => {
    clearFeedback()

    try {
      await transferCartIfAvailable()
      setAuthMessage("Prenos košíka prebehol úspešne.")
    } catch (error) {
      setAuthError(resolveErrorMessage(error))
    }
  }, [clearFeedback, transferCartIfAvailable])

  const isBusy =
    loginMutation.isPending ||
    registerMutation.isPending ||
    logoutMutation.isPending ||
    transferCartMutation.isPending

  const title = mode === "register" ? "Vytvorenie účtu" : "Prihlásenie do účtu"
  const description =
    mode === "register"
      ? "Vyplňte údaje a vytvorte si zákaznícky účet."
      : "Zadajte prihlasovacie údaje pre vstup do zákazníckej sekcie."
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
    authError,
    authMessage,
    authNotice,
    authQuery,
    cartQuery,
    description,
    handleLoginSubmit,
    handleLogout,
    handleRegisterSubmit,
    handleTransferCart,
    isBusy,
    loginDefaultValues,
    loginHref,
    logoutMutation,
    registerCountryItems,
    registerDefaultValues,
    registerHref,
    forgotPasswordHref,
    title,
    transferCartIfAvailable,
    transferCartMutation,
  }
}
