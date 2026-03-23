import {
  createMedusaSdk,
  type MedusaClientConfig,
} from "@techsio/storefront-data/shared/medusa-client";

export const AUTH_TOKEN_STORAGE_KEY = "herbatika_auth_token";
export type StorefrontAuthMode = "jwt_localstorage" | "session_proxy";

const DEFAULT_AUTH_MODE: StorefrontAuthMode = "session_proxy";

const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000";
const MEDUSA_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "";

const resolveAuthMode = (): StorefrontAuthMode => {
  const rawMode = process.env.NEXT_PUBLIC_STOREFRONT_AUTH_MODE
    ?.trim()
    .toLowerCase();

  if (!rawMode) {
    return DEFAULT_AUTH_MODE;
  }

  if (rawMode === "jwt_localstorage" || rawMode === "session_proxy") {
    return rawMode;
  }

  if (process.env.NODE_ENV !== "test") {
    console.warn(
      `Unsupported NEXT_PUBLIC_STOREFRONT_AUTH_MODE="${rawMode}". Falling back to "${DEFAULT_AUTH_MODE}".`,
    );
  }

  return DEFAULT_AUTH_MODE;
};

export const STOREFRONT_AUTH_MODE = resolveAuthMode();
export const isSessionProxyAuthMode = STOREFRONT_AUTH_MODE === "session_proxy";

if (!MEDUSA_PUBLISHABLE_KEY && process.env.NODE_ENV !== "test") {
  console.warn(
    "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is not set. Storefront requests may be rejected by Medusa.",
  );
}

let inMemoryAuthToken: string | null = null;

export const authTokenStorage = {
  set(token: string) {
    if (isSessionProxyAuthMode) {
      inMemoryAuthToken = token;
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      }
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    }
  },
  get() {
    if (isSessionProxyAuthMode) {
      return inMemoryAuthToken;
    }

    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  },
  clear() {
    if (isSessionProxyAuthMode) {
      inMemoryAuthToken = null;
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  },
};

const browserStorage = {
  setItem(_key: string, value: string) {
    authTokenStorage.set(value);
  },
  getItem(_key: string) {
    return authTokenStorage.get();
  },
  removeItem(_key: string) {
    authTokenStorage.clear();
  },
};

const medusaClientConfig: MedusaClientConfig = {
  baseUrl: MEDUSA_BACKEND_URL,
  publishableKey: MEDUSA_PUBLISHABLE_KEY,
  debug: process.env.NODE_ENV === "development",
  auth: {
    type: "jwt",
    jwtTokenStorageKey: AUTH_TOKEN_STORAGE_KEY,
    jwtTokenStorageMethod: "custom",
    storage: browserStorage,
  },
};

export const storefrontSdk = createMedusaSdk(medusaClientConfig);

export const storefrontConfig = {
  backendUrl: MEDUSA_BACKEND_URL,
  publishableKey: MEDUSA_PUBLISHABLE_KEY,
};
