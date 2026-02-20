"use client";

import type { HttpTypes } from "@medusajs/types";
import { createAuthHooks } from "@techsio/storefront-data";
import { cartQueryKeys } from "./cart";
import { storefrontCacheConfig } from "./cache";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";
import { authService } from "./auth/service";
import type { AuthLoginInput, AuthRegisterInput, AuthUpdateInput } from "./auth/types";

export { authService };

export const authHooks = createAuthHooks<
  HttpTypes.StoreCustomer,
  AuthLoginInput,
  AuthRegisterInput,
  AuthUpdateInput
>({
  service: authService,
  queryKeyNamespace: STOREFRONT_QUERY_KEY_NAMESPACE,
  cacheConfig: storefrontCacheConfig,
  invalidateOnAuthChange: {
    includeDefaults: true,
    invalidate: [cartQueryKeys.all()],
    removeOnLogout: [cartQueryKeys.all()],
  },
});

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

export type { AuthLoginInput, AuthRegisterInput, AuthUpdateInput };
