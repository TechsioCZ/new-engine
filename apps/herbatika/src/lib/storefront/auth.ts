"use client";

import { storefront } from "./storefront";

export { authService } from "./auth/service";

export const authHooks = storefront.hooks.auth;

export const {
  useAuth,
  useSuspenseAuth,
  useLogin,
  useRegister,
  useCreateCustomer,
  useLogout,
  useUpdateCustomer: useUpdateAuthCustomer,
  useRefreshAuth,
} = authHooks;

export type { AuthLoginInput, AuthRegisterInput, AuthUpdateInput } from "./auth/types";
