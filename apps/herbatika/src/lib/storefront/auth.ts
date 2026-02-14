"use client";

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
import {
  authTokenStorage,
  isSessionProxyAuthMode,
  storefrontSdk,
} from "./sdk";

type AuthLoginInput = MedusaAuthCredentials;
type AuthRegisterInput = MedusaRegisterData;
type AuthUpdateInput = MedusaUpdateCustomerData;

type AuthProxyResponse = {
  token: string;
};

const authServiceBase = createMedusaAuthService(storefrontSdk);
let sessionBootstrapPromise: Promise<string | null> | null = null;

const getStoredToken = () => {
  return authTokenStorage.get();
};

const storeToken = async (token: string) => {
  authTokenStorage.set(token);

  try {
    await storefrontSdk.client.setToken(token);
  } catch {
    // noop: storage is already updated above
  }
};

const clearToken = () => {
  authTokenStorage.clear();
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

const requestSessionProxy = async (): Promise<AuthProxyResponse | null> => {
  const response = await fetch("/api/storefront-auth/session", {
    method: "GET",
    cache: "no-store",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await parseProxyError(response));
  }

  const payload = (await response.json()) as Partial<AuthProxyResponse>;
  if (typeof payload.token !== "string" || payload.token.length === 0) {
    return null;
  }

  return {
    token: payload.token,
  };
};

const requestLogoutProxy = async () => {
  const response = await fetch("/api/storefront-auth/logout", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await parseProxyError(response));
  }
};

const ensureSessionProxyToken = async (): Promise<string | null> => {
  const existingToken = getStoredToken();
  if (existingToken) {
    return existingToken;
  }

  if (sessionBootstrapPromise) {
    return sessionBootstrapPromise;
  }

  sessionBootstrapPromise = (async () => {
    const response = await requestSessionProxy();
    if (!response?.token) {
      clearToken();
      return null;
    }

    await storeToken(response.token);
    return response.token;
  })();

  try {
    return await sessionBootstrapPromise;
  } finally {
    sessionBootstrapPromise = null;
  }
};

export const authService = {
  async getCustomer(signal?: AbortSignal) {
    if (!getStoredToken()) {
      if (isSessionProxyAuthMode) {
        const restoredToken = await ensureSessionProxyToken();
        if (!restoredToken) {
          return null;
        }
      } else {
        return null;
      }
    }

    try {
      return await authServiceBase.getCustomer(signal);
    } catch (error) {
      if (isSessionProxyAuthMode) {
        clearToken();
      }

      throw error;
    }
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
    if (isSessionProxyAuthMode) {
      try {
        await requestLogoutProxy();
      } catch {
        // best effort: continue with local logout cleanup
      }
    }

    await authServiceBase.logout();
    clearToken();
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
