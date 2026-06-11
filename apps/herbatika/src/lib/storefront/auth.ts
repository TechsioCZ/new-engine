"use client"

import { storefront } from "./storefront"

export { authService } from "./auth/service"

export const { useAuth, useLogin, useRegister, useLogout } =
  storefront.hooks.auth

export type {
  AuthLoginInput,
  AuthRegisterInput,
  AuthUpdateInput,
} from "./auth/types"
