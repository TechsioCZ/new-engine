import type { HttpTypes } from "@medusajs/types";
import { createMedusaAuthService } from "@techsio/storefront-data/auth/medusa-service";
import {
  authTokenStorage,
  isSessionProxyAuthMode,
  storefrontSdk,
} from "../sdk";
import {
  requestAuthProxy,
  requestLogoutProxy,
  requestSessionProxy,
} from "./proxy";
import type { AuthLoginInput, AuthRegisterInput, AuthUpdateInput } from "./types";

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
  async getCustomer(signal?: AbortSignal): Promise<HttpTypes.StoreCustomer | null> {
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
