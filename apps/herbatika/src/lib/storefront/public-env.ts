export const DEFAULT_MEDUSA_BACKEND_URL = "http://localhost:9000";

type PublicEnvName =
  | "NEXT_PUBLIC_MEDUSA_BACKEND_URL"
  | "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY"
  | "NEXT_PUBLIC_PAYLOAD_BASE_URL"
  | "NEXT_PUBLIC_PAYLOAD_MEDIA_BASE_URL";

const PUBLIC_ENV = {
  NEXT_PUBLIC_MEDUSA_BACKEND_URL: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL,
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  NEXT_PUBLIC_PAYLOAD_BASE_URL: process.env.NEXT_PUBLIC_PAYLOAD_BASE_URL,
  NEXT_PUBLIC_PAYLOAD_MEDIA_BASE_URL:
    process.env.NEXT_PUBLIC_PAYLOAD_MEDIA_BASE_URL,
} satisfies Record<PublicEnvName, string | undefined>;

const readPublicEnv = (name: PublicEnvName) => {
  const value = PUBLIC_ENV[name]?.trim();

  return value ? value : undefined;
};

export const resolvePublicBaseUrl = (
  name: PublicEnvName,
  fallback?: string,
) => {
  const value = readPublicEnv(name) ?? fallback;

  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(`Unsupported protocol "${url.protocol}".`);
    }

    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/+$/, "");

    return url.toString().replace(/\/$/, "");
  } catch (error) {
    const reason = error instanceof Error ? ` ${error.message}` : "";

    throw new Error(
      `${name} must be an absolute http(s) URL. Received "${value}".${reason}`,
    );
  }
};

export const MEDUSA_BACKEND_URL = resolvePublicBaseUrl(
  "NEXT_PUBLIC_MEDUSA_BACKEND_URL",
  DEFAULT_MEDUSA_BACKEND_URL,
) ?? DEFAULT_MEDUSA_BACKEND_URL;

export const MEDUSA_PUBLISHABLE_KEY =
  readPublicEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY") ?? "";

export const PAYLOAD_MEDIA_BASE_URL =
  resolvePublicBaseUrl("NEXT_PUBLIC_PAYLOAD_MEDIA_BASE_URL") ??
  resolvePublicBaseUrl("NEXT_PUBLIC_PAYLOAD_BASE_URL");

export const getMedusaPublishableHeaders = (): Record<string, string> => {
  if (!MEDUSA_PUBLISHABLE_KEY) {
    return {};
  }

  return {
    "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
  };
};
