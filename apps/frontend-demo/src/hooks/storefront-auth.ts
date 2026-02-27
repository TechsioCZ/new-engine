"use client"

import type { HttpTypes } from "@medusajs/types"
import { createAuthHooks } from "@techsio/storefront-data/auth/hooks"
import {
  createMedusaAuthService,
  type MedusaAuthCredentials,
  type MedusaRegisterData,
  type MedusaUpdateCustomerData,
} from "@techsio/storefront-data/auth/medusa-service"
import { getErrorStatus } from "@techsio/storefront-data/shared/medusa-errors"
import type { AuthQueryKeys } from "@techsio/storefront-data/auth/types"
import { sdk } from "@/lib/medusa-client"
import { queryKeys } from "@/lib/query-keys"

type StorefrontCreateCustomerInput = {
  email: string
  first_name?: string
  last_name?: string
}

export type StorefrontLoginInput = MedusaAuthCredentials & {
  first_name?: string
  last_name?: string
}

const authQueryKeys: AuthQueryKeys = {
  all: () => [...queryKeys.all, "auth"] as const,
  customer: () => queryKeys.auth.customer(),
  session: () => queryKeys.auth.session(),
}

const baseAuthService = createMedusaAuthService(sdk)

const authHooks = createAuthHooks<
  HttpTypes.StoreCustomer,
  StorefrontLoginInput,
  MedusaRegisterData,
  MedusaUpdateCustomerData,
  StorefrontCreateCustomerInput,
  string,
  string
>({
  service: {
    ...baseAuthService,
    async login(input) {
      return baseAuthService.login({
        email: input.email,
        password: input.password,
      })
    },
    async getCustomer(signal?: AbortSignal) {
      try {
        return await baseAuthService.getCustomer(signal)
      } catch (error) {
        if (getErrorStatus(error) === 404) {
          return null
        }
        throw error
      }
    },
  },
  queryKeys: authQueryKeys,
  invalidateOnAuthChange: {
    includeDefaults: false,
    invalidate: [queryKeys.customer.addresses(), queryKeys.orders.all()],
    removeOnLogout: [queryKeys.customer.addresses(), queryKeys.orders.all()],
  },
})

export const {
  useAuth: useStorefrontAuth,
  useLogin: useStorefrontLogin,
  useRegister: useStorefrontRegister,
  useCreateCustomer: useStorefrontCreateCustomer,
  useLogout: useStorefrontLogout,
  useUpdateCustomer: useStorefrontUpdateCustomer,
  useRefreshAuth: useStorefrontRefreshAuth,
} = authHooks
