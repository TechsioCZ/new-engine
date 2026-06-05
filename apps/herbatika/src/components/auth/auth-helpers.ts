import type {
  LoginFormValues,
  RegisterFormValues,
} from "@/lib/auth/auth-form-validators";
import { routes } from "@/lib/routes";
import { asStorefrontRoute, type StorefrontRoute } from "@/lib/route-paths";

export const resolveSafeRedirectHref = (value?: string): StorefrontRoute | null => {
  if (!value) {
    return null;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return asStorefrontRoute(value);
};

export const buildAuthRouteHref = (
  path: typeof routes.auth.login | typeof routes.auth.register,
  next?: string,
): StorefrontRoute => {
  if (!next) {
    return path;
  }

  return asStorefrontRoute(`${path}?next=${encodeURIComponent(next)}`);
};

export const resolveAfterAuthHref = (
  value?: string | string[],
  fallback = routes.account.index,
): StorefrontRoute => {
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
