import type { HttpTypes } from "@medusajs/types"
import { Store } from "@tanstack/react-store"
import type { ValidationError } from "@/lib/auth/validation"

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
  user: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  validationErrors: [],
})

export const authHelpers = {
  setAuthState: ({
    user,
    isLoading,
    isInitialized,
  }: {
    user?: HttpTypes.StoreCustomer | null
    isLoading?: boolean
    isInitialized?: boolean
  }) => {
    authStore.setState((state) => ({
      ...state,
      ...(user !== undefined ? { user } : {}),
      ...(isLoading !== undefined ? { isLoading } : {}),
      ...(isInitialized !== undefined ? { isInitialized } : {}),
    }))
  },

  setError: (error: string | null) => {
    authStore.setState((state) => ({
      ...state,
      error,
    }))
  },

  clearAuth: () => {
    authStore.setState((state) => ({
      ...state,
      user: null,
      isLoading: false,
      error: null,
      isInitialized: true,
    }))
  },

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
