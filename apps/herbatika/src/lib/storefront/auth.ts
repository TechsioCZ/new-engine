"use client"

import type {
  AuthLoginInput as AuthLoginInputValue,
  AuthRegisterInput as AuthRegisterInputValue,
  AuthUpdateInput as AuthUpdateInputValue,
} from "./auth/types"
import { storefront } from "./storefront"

export const { useAuth, useLogin, useRegister, useLogout } =
  storefront.hooks.auth

export type AuthLoginInput = AuthLoginInputValue
export type AuthRegisterInput = AuthRegisterInputValue
export type AuthUpdateInput = AuthUpdateInputValue
