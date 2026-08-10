"use client"

import { storefront } from "./storefront"

export const useAuth: typeof storefront.hooks.auth.useAuth =
  storefront.hooks.auth.useAuth
export const useConfirmAccountDeactivation: typeof storefront.hooks.auth.useConfirmAccountDeactivation =
  storefront.hooks.auth.useConfirmAccountDeactivation
export const useLogin: typeof storefront.hooks.auth.useLogin =
  storefront.hooks.auth.useLogin
export const useRegister: typeof storefront.hooks.auth.useRegister =
  storefront.hooks.auth.useRegister
export const useRequestAccountDeactivation: typeof storefront.hooks.auth.useRequestAccountDeactivation =
  storefront.hooks.auth.useRequestAccountDeactivation
export const useLogout: typeof storefront.hooks.auth.useLogout =
  storefront.hooks.auth.useLogout

export type { AuthRegisterInput } from "./auth/types"
