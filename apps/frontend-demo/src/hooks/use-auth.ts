"use client"

import type { HttpTypes } from "@medusajs/types"
import { useQueryClient } from "@tanstack/react-query"
import { useStore } from "@tanstack/react-store"
import { useToast } from "@techsio/ui-kit/molecules/toast"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import type { MedusaRegisterData } from "@techsio/storefront-data/auth/medusa-service"
import { AUTH_MESSAGES } from "@/lib/auth/constants"
import { hasStoredAuthToken } from "@/lib/auth-token"
import { STORAGE_KEYS } from "@/lib/constants"
import { authHelpers, authStore } from "@/stores/auth-store"
import {
  type StorefrontLoginInput,
  useStorefrontAuth,
  useStorefrontLogin,
  useStorefrontLogout,
  useStorefrontRegister,
  useStorefrontUpdateCustomer,
} from "./storefront-auth"

export function useAuth() {
  const authState = useStore(authStore)
  const router = useRouter()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [hasAuthToken, setHasAuthToken] = useState(() =>
    hasStoredAuthToken()
  )

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEYS.AUTH_TOKEN) {
        setHasAuthToken(Boolean(event.newValue))
      }
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const authQuery = useStorefrontAuth({
    enabled: hasAuthToken,
    queryOptions: {
      staleTime: 5 * 60 * 1000,
      retry: false,
    },
  })

  useEffect(() => {
    authHelpers.setAuthState({
      user: authQuery.customer,
      isInitialized: hasAuthToken ? authQuery.query.isFetched : true,
      isLoading: hasAuthToken ? authQuery.isLoading : false,
    })
  }, [
    authQuery.customer,
    authQuery.isLoading,
    authQuery.query.isFetched,
    hasAuthToken,
  ])

  const loginMutation = useStorefrontLogin({
    onSuccess: async () => {
      authHelpers.setError(null)
      setHasAuthToken(true)
      await authQuery.query.refetch()

      if (typeof window !== "undefined") {
        if (!window.location.pathname.includes("/test-auth")) {
          router.push("/")
        }
      }

      toast.create({
        ...AUTH_MESSAGES.LOGIN_SUCCESS,
        type: "success",
      })
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Login failed"
      authHelpers.setError(message)
      toast.create({
        ...AUTH_MESSAGES.LOGIN_ERROR,
        description: message,
        type: "error",
      })
    },
  })

  const registerMutation = useStorefrontRegister({
    onSuccess: async () => {
      authHelpers.setError(null)
      setHasAuthToken(true)
      await authQuery.query.refetch()

      if (typeof window !== "undefined") {
        if (!window.location.pathname.includes("/test-auth")) {
          router.push("/")
        }
      }

      toast.create({
        ...AUTH_MESSAGES.REGISTER_SUCCESS,
        type: "success",
      })
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Registration failed"
      authHelpers.setError(message)
      toast.create({
        ...AUTH_MESSAGES.REGISTER_ERROR,
        description: message,
        type: "error",
      })
    },
  })

  const logoutMutation = useStorefrontLogout({
    onSuccess: () => {
      setHasAuthToken(false)
      authHelpers.clearAuth()
      queryClient.invalidateQueries()
      router.push("/")

      toast.create({
        ...AUTH_MESSAGES.LOGOUT_SUCCESS,
        type: "success",
      })
    },
  })

  const updateProfileMutation = useStorefrontUpdateCustomer({
    onSuccess: () => {
      authHelpers.setError(null)

      toast.create({
        ...AUTH_MESSAGES.UPDATE_SUCCESS,
        type: "success",
      })
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Profile update failed"
      authHelpers.setError(message)
      toast.create({
        ...AUTH_MESSAGES.UPDATE_ERROR,
        description: message,
        type: "error",
      })
    },
  })

  // Get field error
  const getFieldError = useCallback(
    (field: string): string | undefined =>
      authState.validationErrors.find((e) => e.field === field)?.message,
    [authState.validationErrors]
  )

  return {
    // Auth state
    user: authState.user,
    isLoading:
      authState.isLoading ||
      (hasAuthToken && authQuery.isLoading) ||
      loginMutation.isPending ||
      registerMutation.isPending ||
      updateProfileMutation.isPending,
    isInitialized: authState.isInitialized,
    error: authState.error ?? (hasAuthToken ? authQuery.error : null),

    // Auth actions with mutations
    login: (
      email: string,
      password: string,
      firstName?: string,
      lastName?: string
    ) => {
      authHelpers.clearErrors()
      const payload: StorefrontLoginInput = {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      }
      loginMutation.mutate(payload)
    },
    register: (
      email: string,
      password: string,
      firstName?: string,
      lastName?: string
    ) => {
      authHelpers.clearErrors()
      const payload: MedusaRegisterData = {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      }
      registerMutation.mutate(payload)
    },
    logout: () => logoutMutation.mutate(),
    updateProfile: (data: Partial<HttpTypes.StoreCustomer>) => {
      const payload = {
        first_name: data.first_name ?? undefined,
        last_name: data.last_name ?? undefined,
        phone: data.phone ?? undefined,
      }
      updateProfileMutation.mutate(payload)
    },
    refetch: () => {
      const tokenPresent = hasStoredAuthToken()
      setHasAuthToken(tokenPresent)

      if (!tokenPresent) {
        authHelpers.clearAuth()
        return Promise.resolve(undefined)
      }

      return authQuery.query.refetch()
    },

    // Mutation states
    loginMutation,
    registerMutation,
    logoutMutation,
    updateProfileMutation,

    // Form state
    isFormLoading: loginMutation.isPending || registerMutation.isPending,
    validationErrors: authState.validationErrors,

    // Form actions
    setFieldError: authHelpers.setFieldError,
    setValidationErrors: authHelpers.setValidationErrors,
    clearErrors: authHelpers.clearErrors,
    clearFieldError: authHelpers.clearFieldError,
    getFieldError,
  }
}
