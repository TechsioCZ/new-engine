"use client"

import type { HttpTypes } from "@medusajs/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useStore } from "@tanstack/react-store"
import { useToast } from "@techsio/ui-kit/molecules/toast"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { AUTH_MESSAGES } from "@/lib/auth/constants"
import { queryKeys } from "@/lib/query-keys"
import { authHelpers, authStore } from "@/stores/auth-store"

export function useAuth() {
  const authState = useStore(authStore)
  const router = useRouter()
  const toast = useToast()
  const queryClient = useQueryClient()

  // Use React Query for initial auth check
  const { data: currentUser } = useQuery({
    queryKey: queryKeys.auth.customer(),
    queryFn: authHelpers.fetchUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  })

  // Update store when query data changes
  useEffect(() => {
    if (currentUser !== undefined) {
      authStore.setState((state) => ({
        ...state,
        user: currentUser,
        isInitialized: true,
        isLoading: false,
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
    }) => authHelpers.login(email, password, firstName, lastName),
    onSuccess: () => {
      // Invalidate auth queries to refetch user
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.customer() })

      // Only redirect if not on test page
      if (!window.location.pathname.includes("/test-auth")) {
        router.push("/")
      }

      toast.create({
        ...AUTH_MESSAGES.LOGIN_SUCCESS,
        type: "success",
      })
    },
    onError: (error: Error) => {
      toast.create({
        ...AUTH_MESSAGES.LOGIN_ERROR,
        description: error.message,
        type: "error",
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
    }) => authHelpers.register(email, password, firstName, lastName),
    onSuccess: () => {
      // Invalidate auth queries to refetch user
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.customer() })

      // Only redirect if not on test page
      if (!window.location.pathname.includes("/test-auth")) {
        router.push("/")
      }

      toast.create({
        ...AUTH_MESSAGES.REGISTER_SUCCESS,
        type: "success",
      })
    },
    onError: (error: Error) => {
      toast.create({
        ...AUTH_MESSAGES.REGISTER_ERROR,
        description: error.message,
        type: "error",
      })
    },
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authHelpers.logout,
    onSuccess: () => {
      // Invalidate all queries since user context changed
      queryClient.invalidateQueries()
      router.push("/")

      toast.create({
        ...AUTH_MESSAGES.LOGOUT_SUCCESS,
        type: "success",
      })
    },
  })

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<HttpTypes.StoreCustomer>) =>
      authHelpers.updateProfile(data),
    onSuccess: () => {
      // Invalidate auth queries to refetch updated user
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.customer() })

      toast.create({
        ...AUTH_MESSAGES.UPDATE_SUCCESS,
        type: "success",
      })
    },
    onError: (error: Error) => {
      toast.create({
        ...AUTH_MESSAGES.UPDATE_ERROR,
        description: error.message,
        type: "error",
      })
    },
  })

  // Get field error
  const getFieldError = (field: string): string | undefined =>
    authState.validationErrors.find((e) => e.field === field)?.message

  return {
    // Auth state
    user: authState.user,
    isLoading:
      authState.isLoading ||
      loginMutation.isPending ||
      registerMutation.isPending ||
      updateProfileMutation.isPending,
    isInitialized: authState.isInitialized,
    error: authState.error,

    // Auth actions with mutations
    login: (
      email: string,
      password: string,
      firstName?: string,
      lastName?: string
    ) => loginMutation.mutate({ email, password, firstName, lastName }),
    register: (
      email: string,
      password: string,
      firstName?: string,
      lastName?: string
    ) => registerMutation.mutate({ email, password, firstName, lastName }),
    logout: () => logoutMutation.mutate(),
    updateProfile: (data: Partial<HttpTypes.StoreCustomer>) =>
      updateProfileMutation.mutate(data),
    refetch: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.customer() }),

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
