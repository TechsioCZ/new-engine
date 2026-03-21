"use client"

import type { HttpTypes } from "@medusajs/types"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "@techsio/ui-kit/molecules/toast"
import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import { AUTH_MESSAGES } from "@/lib/auth/constants"
import { getAuthErrorMessage } from "@/lib/auth/error-handler"
import type { ValidationError } from "@/lib/auth/validation"
import { queryKeys } from "@/lib/query-keys"
import { storefront } from "@/lib/storefront"

const toUpdateCustomerInput = (data: Partial<HttpTypes.StoreCustomer>) => ({
  first_name: data.first_name,
  last_name: data.last_name,
  phone: data.phone ?? undefined,
})

export function useAuth() {
  const router = useRouter()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  )
  const [mutationError, setMutationError] = useState<string | null>(null)

  const auth = storefront.hooks.auth.useAuth()

  const invalidateLegacyMedusaQueries = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.all }),
    [queryClient]
  )

  const loginMutation = storefront.hooks.auth.useLogin({
    onSuccess: async () => {
      setMutationError(null)
      await invalidateLegacyMedusaQueries()

      if (!window.location.pathname.includes("/test-auth")) {
        router.push("/")
      }

      toast.create({
        ...AUTH_MESSAGES.LOGIN_SUCCESS,
        type: "success",
      })
    },
    onError: (error) => {
      setMutationError(getAuthErrorMessage(error))
      toast.create({
        ...AUTH_MESSAGES.LOGIN_ERROR,
        description: getAuthErrorMessage(error),
        type: "error",
      })
    },
  })

  const registerMutation = storefront.hooks.auth.useRegister({
    onSuccess: async () => {
      setMutationError(null)
      await invalidateLegacyMedusaQueries()

      if (!window.location.pathname.includes("/test-auth")) {
        router.push("/")
      }

      toast.create({
        ...AUTH_MESSAGES.REGISTER_SUCCESS,
        type: "success",
      })
    },
    onError: (error) => {
      setMutationError(getAuthErrorMessage(error))
      toast.create({
        ...AUTH_MESSAGES.REGISTER_ERROR,
        description: getAuthErrorMessage(error),
        type: "error",
      })
    },
  })

  const logoutMutation = storefront.hooks.auth.useLogout({
    onSuccess: async () => {
      setMutationError(null)
      setValidationErrors([])
      await invalidateLegacyMedusaQueries()
      router.push("/")

      toast.create({
        ...AUTH_MESSAGES.LOGOUT_SUCCESS,
        type: "success",
      })
    },
  })

  const updateProfileMutation = storefront.hooks.auth.useUpdateCustomer({
    onSuccess: () => {
      setMutationError(null)
      toast.create({
        ...AUTH_MESSAGES.UPDATE_SUCCESS,
        type: "success",
      })
    },
    onError: (error) => {
      setMutationError(getAuthErrorMessage(error))
      toast.create({
        ...AUTH_MESSAGES.UPDATE_ERROR,
        description: getAuthErrorMessage(error),
        type: "error",
      })
    },
  })

  const getFieldError = useCallback(
    (field: string): string | undefined =>
      validationErrors.find((error) => error.field === field)?.message,
    [validationErrors]
  )

  const setFieldError = useCallback((field: string, message: string) => {
    setValidationErrors((current) => [
      ...current.filter((error) => error.field !== field),
      { field, message },
    ])
  }, [])

  const clearErrors = useCallback(() => {
    setMutationError(null)
    setValidationErrors([])
  }, [])

  const clearFieldError = useCallback((field: string) => {
    setValidationErrors((current) =>
      current.filter((error) => error.field !== field)
    )
  }, [])

  return {
    user: auth.customer,
    isLoading:
      auth.isLoading ||
      loginMutation.isPending ||
      registerMutation.isPending ||
      updateProfileMutation.isPending,
    isInitialized: auth.query.isFetched || auth.query.isError,
    error: mutationError ?? auth.error,
    login: (
      email: string,
      password: string,
      firstName?: string,
      lastName?: string
    ) =>
      loginMutation.mutateAsync({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      }),
    register: (
      email: string,
      password: string,
      firstName?: string,
      lastName?: string
    ) =>
      registerMutation.mutateAsync({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      }),
    logout: () => logoutMutation.mutateAsync(),
    updateProfile: (data: Partial<HttpTypes.StoreCustomer>) =>
      updateProfileMutation.mutateAsync(toUpdateCustomerInput(data)),
    refetch: () =>
      queryClient.invalidateQueries({
        queryKey: storefront.queryKeys.auth.customer(),
      }),
    loginMutation,
    registerMutation,
    logoutMutation,
    updateProfileMutation,
    isFormLoading: loginMutation.isPending || registerMutation.isPending,
    validationErrors,
    setFieldError,
    setValidationErrors,
    clearErrors,
    clearFieldError,
    getFieldError,
  }
}
