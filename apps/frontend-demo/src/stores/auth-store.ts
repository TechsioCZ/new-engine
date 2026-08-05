import type { HttpTypes } from "@medusajs/types"
import { Store } from "@tanstack/react-store"

import { getAuthErrorMessage } from "@/lib/auth/error-handler"
import type { ValidationError } from "@/lib/auth/validation"
import { sdk } from "@/lib/medusa-client"

export interface AuthState {
  // Auth state
  user: HttpTypes.StoreCustomer | null
  isLoading: boolean
  error: string | null
  isInitialized: boolean

  // Form state
  validationErrors: ValidationError[]
}

// Create the auth store
export const authStore = new Store<AuthState>({
  error: null,
  isInitialized: false,
  isLoading: false,
  user: null,
  validationErrors: [],
})

// Helper functions
export const authHelpers = {
  // Fetch current user
  fetchUser: async () => {
    try {
      authStore.setState((state) => ({
        ...state,
        error: null,
        isLoading: true,
      }))

      // SDK manages the token automatically
      // Just try to fetch the customer
      try {
        const { customer } = await sdk.store.customer.retrieve()
        authStore.setState((state) => ({
          ...state,
          isInitialized: true,
          isLoading: false,
          user: customer,
        }))
        return customer
      } catch {
        // An unavailable customer means there is no authenticated storefront user.
        authStore.setState((state) => ({
          ...state,
          isInitialized: true,
          isLoading: false,
          user: null,
        }))
        return null
      }
    } catch (error: any) {
      authStore.setState((state) => ({
        ...state,
        user: null,
        isLoading: false,
        error: error.message,
        isInitialized: true,
      }))
      return null
    }
  },

  // Login
  login: async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => {
    try {
      authStore.setState((state) => ({
        ...state,
        error: null,
        validationErrors: [],
      }))

      // Step 1: Login using SDK auth
      const result = await sdk.auth.login("customer", "emailpass", {
        email,
        password,
      })

      // Check if authentication requires more actions (e.g., third-party redirect)
      if (typeof result !== "string") {
        throw new TypeError("Authentication requires additional steps")
      }

      // Step 2: Fetch customer profile
      try {
        const { customer } = await sdk.store.customer.retrieve()
        authStore.setState((state) => ({
          ...state,
          isLoading: false,
          user: customer,
        }))
      } catch (error: any) {
        // If customer doesn't exist, create one
        if (error.status === 404) {
          const { customer } = await sdk.store.customer.create({
            email,
            ...(firstName !== undefined && { first_name: firstName }),
            ...(lastName !== undefined && { last_name: lastName }),
          })
          authStore.setState((state) => ({
            ...state,
            isLoading: false,
            user: customer,
          }))
        } else {
          throw error
        }
      }

      // Step 3: Clear anonymous cart ID
      // Cart will be merged automatically by Medusa
    } catch (error: any) {
      const message = getAuthErrorMessage(error)
      authStore.setState((state) => ({
        ...state,
        error: message,
      }))
      throw new Error(message, { cause: err })
    }
  },

  // Register
  register: async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => {
    try {
      authStore.setState((state) => ({
        ...state,
        error: null,
        validationErrors: [],
      }))

      // Step 1: Register auth identity
      await sdk.auth.register("customer", "emailpass", {
        email,
        password,
      })

      // Step 2: Login to get JWT token (register doesn't return token)
      const result = await sdk.auth.login("customer", "emailpass", {
        email,
        password,
      })

      // Check if authentication requires more actions
      if (typeof result !== "string") {
        throw new TypeError("Authentication requires additional steps")
      }

      // Step 3: Create customer profile
      const { customer } = await sdk.store.customer.create({
        email,
        ...(firstName !== undefined && { first_name: firstName }),
        ...(lastName !== undefined && { last_name: lastName }),
      })

      // Step 4: Refresh token to ensure proper permissions
      try {
        await sdk.auth.refresh()
      } catch {
        // Customer creation succeeded; the following retrieve is the authoritative refresh.
      }

      // Step 5: Fetch the customer again to ensure we have the latest data
      try {
        const { customer: refreshedCustomer } =
          await sdk.store.customer.retrieve()
        authStore.setState((state) => ({
          ...state,
          isInitialized: true,
          isLoading: false,
          user: refreshedCustomer,
        }))
        return refreshedCustomer
      } catch {
        authStore.setState((state) => ({
          ...state,
          isInitialized: true,
          isLoading: false,
          user: customer,
        }))
        return customer
      }
    } catch (error: any) {
      const message = error?.message || "Registration failed"
      authStore.setState((state) => ({
        ...state,
        error: message,
      }))
      throw new Error(message, { cause: err })
    }
  },

  // Logout
  logout: async () => {
    try {
      await sdk.auth.logout()
      authStore.setState(() => ({
        error: null,
        isInitialized: true,
        isLoading: false,
        user: null,
        validationErrors: [],
      }))
    } catch {
      // Preserve local auth state when the remote logout request fails.
    }
  },

  // Update profile
  updateProfile: async (data: Partial<HttpTypes.StoreCustomer>) => {
    try {
      authStore.setState((state) => ({ ...state, error: null }))

      // SDK manages authentication, just make the request

      // SDK's update method expects a different type, filter out null values
      const updateData = Object.entries(data).reduce<Record<string, any>>(
        (acc, [key, value]) => {
          if (value !== null && value !== undefined) {
            acc[key as keyof typeof acc] = value
          }
          return acc
        },
        {}
      )

      const { customer } = await sdk.store.customer.update(updateData)
      authStore.setState((state) => ({
        ...state,
        user: customer,
      }))
    } catch (error: any) {
      const message = error?.message || "Profile update failed"
      authStore.setState((state) => ({ ...state, error: message }))
      throw new Error(message, { cause: err })
    }
  },

  // Form helpers
  setFieldError: (field: string, message: string) => {
    authStore.setState((state) => {
      const filtered = state.validationErrors.filter((e) => e.field !== field)
      return {
        ...state,
        validationErrors: [...filtered, { field, message }],
      }
    })
  },

  setValidationErrors: (errors: ValidationError[]) => {
    authStore.setState((state) => ({
      ...state,
      validationErrors: errors,
    }))
  },

  clearErrors: () => {
    authStore.setState((state) => ({
      ...state,
      error: null,
      validationErrors: [],
    }))
  },

  clearFieldError: (field: string) => {
    authStore.setState((state) => ({
      ...state,
      validationErrors: state.validationErrors.filter((e) => e.field !== field),
    }))
  },
}
