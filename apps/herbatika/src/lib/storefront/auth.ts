"use client"

import type { AuthRegisterInput as AuthRegisterInputValue } from "./auth/types"
import { storefront } from "./storefront"

export const { useAuth, useLogin, useRegister, useLogout } =
  storefront.hooks.auth

export type AuthRegisterInput = AuthRegisterInputValue
