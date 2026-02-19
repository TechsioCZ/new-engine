import type { RegisterFormValues } from "@/lib/auth/auth-form-validators";

type BlurAwareFieldMeta = {
  isBlurred: boolean;
  isDirty: boolean;
  errorMap: {
    onChange?: unknown;
    onBlur?: unknown;
  };
};

export const toFieldErrorText = (error: unknown): string | undefined => {
  if (typeof error === "string" || typeof error === "number") {
    return String(error);
  }

  if (Array.isArray(error) && error.length > 0) {
    return toFieldErrorText(error[0]);
  }

  return undefined;
};

export const resolveBlurAwareFieldError = (meta: BlurAwareFieldMeta) => {
  if (!meta.isBlurred) {
    return undefined;
  }

  const changeError = toFieldErrorText(meta.errorMap.onChange);
  const blurError = toFieldErrorText(meta.errorMap.onBlur);

  if (meta.isDirty) {
    return changeError;
  }

  return changeError ?? blurError;
};

export const buildGeneratedIdentity = () => {
  const seed =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replaceAll("-", "").slice(0, 10)
      : Math.random().toString(36).slice(2, 12);

  return {
    email: `codex+${seed}@example.com`,
    firstName: "Codex",
    lastName: `S1-${seed.slice(-4)}`,
  };
};

export const resolveSafeRedirectHref = (value?: string) => {
  if (!value) {
    return null;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
};

export const buildAuthRouteHref = (
  path: "/auth/login" | "/auth/register",
  next?: string,
) => {
  if (!next) {
    return path;
  }

  return `${path}?next=${encodeURIComponent(next)}`;
};

export type LoginFormValues = {
  email: string;
  password: string;
};

const DEFAULT_PASSWORD = "CodexTest123!";
const DEFAULT_REGISTER_EMAIL = "codex+manual@example.com";
const DEFAULT_REGISTER_FIRST_NAME = "Codex";
const DEFAULT_REGISTER_LAST_NAME = "Tester";

export const buildLoginDefaults = (
  isDiagnosticsMode: boolean,
): LoginFormValues => ({
  email: "",
  password: isDiagnosticsMode ? DEFAULT_PASSWORD : "",
});

export const buildRegisterDefaults = (
  isDiagnosticsMode: boolean,
): RegisterFormValues => ({
  first_name: isDiagnosticsMode ? DEFAULT_REGISTER_FIRST_NAME : "",
  last_name: isDiagnosticsMode ? DEFAULT_REGISTER_LAST_NAME : "",
  email: isDiagnosticsMode ? DEFAULT_REGISTER_EMAIL : "",
  password: isDiagnosticsMode ? DEFAULT_PASSWORD : "",
  confirm_password: isDiagnosticsMode ? DEFAULT_PASSWORD : "",
  accept_terms: isDiagnosticsMode,
});

export const buildGeneratedRegisterIdentity = (): RegisterFormValues => {
  const identity = buildGeneratedIdentity();

  return {
    first_name: identity.firstName,
    last_name: identity.lastName,
    email: identity.email,
    password: DEFAULT_PASSWORD,
    confirm_password: DEFAULT_PASSWORD,
    accept_terms: true,
  };
};
