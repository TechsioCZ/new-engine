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
import { AUTH_TOKEN_STORAGE_KEY, storefrontSdk } from "./sdk";

type AuthLoginInput = MedusaAuthCredentials;
type AuthRegisterInput = MedusaRegisterData;
type AuthUpdateInput = MedusaUpdateCustomerData;

type AuthProxyResponse = {
  token: string;
};

const authServiceBase = createMedusaAuthService(storefrontSdk);

const getStoredToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
};

const storeToken = async (token: string) => {
  try {
    await storefrontSdk.client.setToken(token);
  } catch {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    }
  }
};

const clearToken = () => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
};

const parseProxyError = async (response: Response) => {
  try {
    const payload = (await response.json()) as { message?: string };
    if (payload?.message) {
      return payload.message;
    }
  } catch {
    // noop
  }

  return `Auth request failed with status ${response.status}`;
};

const requestAuthProxy = async <TBody extends Record<string, unknown>>(
  path: "login" | "register",
  body: TBody,
): Promise<AuthProxyResponse> => {
  const response = await fetch(`/api/storefront-auth/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await parseProxyError(response));
  }

  const payload = (await response.json()) as Partial<AuthProxyResponse>;
  if (typeof payload.token !== "string" || payload.token.length === 0) {
    throw new Error("Auth proxy did not return a token.");
  }

  return {
    token: payload.token,
  };
};

export const authService = {
  async getCustomer(signal?: AbortSignal) {
    if (!getStoredToken()) {
      return null;
    }

    return authServiceBase.getCustomer(signal);
  },
  async login(credentials: AuthLoginInput) {
    const { token } = await requestAuthProxy("login", {
      email: credentials.email,
      password: credentials.password,
    });

    await storeToken(token);
    return token;
  },
  async register(input: AuthRegisterInput) {
    const { token } = await requestAuthProxy("register", {
      email: input.email,
      password: input.password,
      first_name: input.first_name,
      last_name: input.last_name,
    });

    await storeToken(token);
    return token;
  },
  async logout() {
    clearToken();
    await authServiceBase.logout();
  },
  async updateCustomer(input: AuthUpdateInput) {
    if (!authServiceBase.updateCustomer) {
      throw new Error("updateCustomer service is not configured");
    }

    return authServiceBase.updateCustomer(input);
  },
};

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
