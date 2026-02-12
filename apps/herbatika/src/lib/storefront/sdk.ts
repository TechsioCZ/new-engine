import {
  createMedusaSdk,
  type MedusaClientConfig,
} from "@techsio/storefront-data";

export const AUTH_TOKEN_STORAGE_KEY = "herbatika_auth_token";

const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000";
const MEDUSA_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "";

if (!MEDUSA_PUBLISHABLE_KEY && process.env.NODE_ENV !== "test") {
  console.warn(
    "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is not set. Storefront requests may be rejected by Medusa.",
  );
}

const browserStorage = {
  setItem(key: string, value: string) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, value);
    }
  },
  getItem(key: string) {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem(key);
  },
  removeItem(key: string) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(key);
    }
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
