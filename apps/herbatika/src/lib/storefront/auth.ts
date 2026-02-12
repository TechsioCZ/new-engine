import type { HttpTypes } from "@medusajs/types";
import {
  createAuthHooks,
  createMedusaAuthService,
  type MedusaAuthCredentials,
  type MedusaRegisterData,
  type MedusaUpdateCustomerData,
} from "@techsio/storefront-data";
import { cartQueryKeys } from "./cart";
import { storefrontCacheConfig } from "./cache";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";
import { storefrontSdk } from "./sdk";

type AuthLoginInput = MedusaAuthCredentials;
type AuthRegisterInput = MedusaRegisterData;
type AuthUpdateInput = MedusaUpdateCustomerData;

export const authService = createMedusaAuthService(storefrontSdk);

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
