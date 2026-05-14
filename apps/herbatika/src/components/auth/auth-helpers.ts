import type {
  LoginFormValues,
  RegisterFormValues,
} from "@/lib/auth/auth-form-validators";
import { routes } from "@/lib/routes";

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
  path: typeof routes.auth.login | typeof routes.auth.register,
  next?: string,
) => {
  if (!next) {
    return path;
  }

  return `${path}?next=${encodeURIComponent(next)}`;
};

export const resolveAfterAuthHref = (
  value?: string | string[],
  fallback = routes.account.index,
) => {
  const nextValue = typeof value === "string" ? value : undefined;
  return resolveSafeRedirectHref(nextValue) ?? fallback;
};

export const buildLoginDefaults = (): LoginFormValues => ({
  email: "",
  password: "",
});

export const buildRegisterDefaults = (): RegisterFormValues => ({
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  confirm_password: "",
  accept_terms: false,
});
