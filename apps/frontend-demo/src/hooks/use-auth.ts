"use client"

import type { HttpTypes } from "@medusajs/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSelector } from "@tanstack/react-store"
import { useToast } from "@techsio/ui-kit/molecules/toast"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { AUTH_MESSAGES } from "@/lib/auth/constants"
import { queryKeys } from "@/lib/query-keys"
import { authHelpers, authStore } from "@/stores/auth-store"

export const useAuth = () => {
  const authState = useSelector(authStore)
  const router = useRouter()
  const toast = useToast()
  const queryClient = useQueryClient()

  // Use React Query for initial auth check
  const { data: currentUser } = useQuery({
    queryFn: authHelpers.fetchUser,
    queryKey: queryKeys.auth.customer(),
    retry: false,
    // Cache the authenticated customer for five minutes.
    staleTime: 5 * 60 * 1000,
  })

  // Update store when query data changes
  useEffect(() => {
    if (currentUser !== undefined) {
      authStore.setState((state) => ({
        ...state,
        isInitialized: true,
        isLoading: false,
        user: currentUser,
      }))
    }
  }, [currentUser])

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({
      email,
      password,
      firstName,
      lastName,
    }: {
      email: string
      password: string
      firstName?: string
      lastName?: string
    }) => {
      await authHelpers.login(email, password, firstName, lastName)
    },
    onError: (error: Error) => {
      toast.create({
        ...AUTH_MESSAGES.LOGIN_ERROR,
        description: error.message,
        type: "error",
      })
    },
    onSuccess: async () => {
      // Invalidate auth queries to refetch user
      await queryClient.invalidateQueries({
        queryKey: queryKeys.auth.customer(),
      })

      // Only redirect if not on test page
      if (!window.location.pathname.includes("/test-auth")) {
        router.push("/")
      }

      toast.create({
        ...AUTH_MESSAGES.LOGIN_SUCCESS,
        type: "success",
      })
    },
  })

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async ({
      email,
      password,
      firstName,
      lastName,
    }: {
      email: string
      password: string
      firstName?: string
      lastName?: string
    }) => await authHelpers.register(email, password, firstName, lastName),
    onError: (error: Error) => {
      toast.create({
        ...AUTH_MESSAGES.REGISTER_ERROR,
        description: error.message,
        type: "error",
      })
    },
    onSuccess: async () => {
      // Invalidate auth queries to refetch user
      await queryClient.invalidateQueries({
        queryKey: queryKeys.auth.customer(),
      })

      // Only redirect if not on test page
      if (!window.location.pathname.includes("/test-auth")) {
        router.push("/")
      }

      toast.create({
        ...AUTH_MESSAGES.REGISTER_SUCCESS,
        type: "success",
      })
    },
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authHelpers.logout,
    onSuccess: async () => {
      // Invalidate all queries since user context changed
      await queryClient.invalidateQueries()
      router.push("/")

      toast.create({
        ...AUTH_MESSAGES.LOGOUT_SUCCESS,
        type: "success",
      })
    },
  })

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<HttpTypes.StoreCustomer>) => {
      await authHelpers.updateProfile(data)
    },
    onError: (error: Error) => {
      toast.create({
        ...AUTH_MESSAGES.UPDATE_ERROR,
        description: error.message,
        type: "error",
      })
    },
    onSuccess: async () => {
      // Invalidate auth queries to refetch updated user
      await queryClient.invalidateQueries({
        queryKey: queryKeys.auth.customer(),
      })

      toast.create({
        ...AUTH_MESSAGES.UPDATE_SUCCESS,
        type: "success",
      })
    },
  })

  // Get field error
  const getFieldError = (field: string): string | undefined =>
    authState.validationErrors.find((e) => e.field === field)?.message

  return {
    clearErrors: authHelpers.clearErrors,
    clearFieldError: authHelpers.clearFieldError,
    error: authState.error,
    getFieldError,
    isFormLoading: loginMutation.isPending || registerMutation.isPending,
    isInitialized: authState.isInitialized,
    isLoading:
      authState.isLoading ||
      loginMutation.isPending ||
      registerMutation.isPending ||
      updateProfileMutation.isPending,
    login: (
      email: string,
      password: string,
      firstName?: string,
      lastName?: string,
    ) => {
      loginMutation.mutate({
        email,
        password,
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
      })
    },
    loginMutation,
    logout: () => {
      logoutMutation.mutate()
    },
    logoutMutation,
    refetch: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.auth.customer(),
      })
    },
    register: (
      email: string,
      password: string,
      firstName?: string,
      lastName?: string,
    ) => {
      registerMutation.mutate({
        email,
        password,
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
      })
    },
    registerMutation,
    setFieldError: authHelpers.setFieldError,
    setValidationErrors: authHelpers.setValidationErrors,
    updateProfile: (data: Partial<HttpTypes.StoreCustomer>) => {
      updateProfileMutation.mutate(data)
    },
    updateProfileMutation,
    user: authState.user,
    validationErrors: authState.validationErrors,
  }
}
