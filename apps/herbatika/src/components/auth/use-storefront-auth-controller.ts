"use client";

import { useRegionContext } from "@techsio/storefront-data/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildAuthRouteHref,
  buildGeneratedRegisterIdentity,
  buildLoginDefaults,
  buildRegisterDefaults,
  type LoginFormValues,
  resolveSafeRedirectHref,
} from "@/components/auth/storefront-auth-helpers";
import { resolveLoginSubmitError } from "@/lib/auth/auth-form-validators";
import type { RegisterFormValues } from "@/lib/auth/auth-form-validators";
import { useAuth, useLogin, useLogout, useRegister } from "@/lib/storefront/auth";
import {
  storefrontCartReadQueryOptions,
  useCart,
  useTransferCart,
} from "@/lib/storefront/cart";
import { cartStorage } from "@/lib/storefront/cart-storage";
import { resolveErrorMessage } from "@/lib/storefront/error-utils";

type AuthControlsMode = "login" | "register" | "both";

type UseStorefrontAuthControllerProps = {
  mode: AuthControlsMode;
  afterAuthHref?: string;
};

export const useStorefrontAuthController = ({
  mode,
  afterAuthHref,
}: UseStorefrontAuthControllerProps) => {
  const router = useRouter();
  const region = useRegionContext();
  const authQuery = useAuth();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();
  const transferCartMutation = useTransferCart();
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const isDiagnosticsMode = mode === "both";

  const cartQuery = useCart({
    autoCreate: false,
    region_id: region?.region_id,
    country_code: region?.country_code,
    enabled: Boolean(region?.region_id),
  }, {
    queryOptions: storefrontCartReadQueryOptions,
  });

  const safeRedirectHref = useMemo(
    () => resolveSafeRedirectHref(afterAuthHref),
    [afterAuthHref],
  );
  const loginDefaultValues = useMemo(
    () => buildLoginDefaults(isDiagnosticsMode),
    [isDiagnosticsMode],
  );
  const registerDefaultValues = useMemo(
    () => buildRegisterDefaults(isDiagnosticsMode),
    [isDiagnosticsMode],
  );

  const clearFeedback = useCallback(() => {
    setAuthError(null);
    setAuthMessage(null);
  }, []);

  const transferCartIfAvailable = useCallback(async () => {
    const activeCartId = cartQuery.cart?.id;
    if (!activeCartId) {
      return;
    }

    const transferredCart = await transferCartMutation.mutateAsync({
      cartId: activeCartId,
    });

    if (transferredCart?.id) {
      cartStorage.setCartId(transferredCart.id);
    }
  }, [cartQuery.cart?.id, transferCartMutation]);

  useEffect(() => {
    if (!safeRedirectHref) {
      return;
    }

    if (authQuery.isLoading || !authQuery.isAuthenticated) {
      return;
    }

    router.replace(safeRedirectHref);
  }, [
    authQuery.isAuthenticated,
    authQuery.isLoading,
    router,
    safeRedirectHref,
  ]);

  const handleLoginSubmit = useCallback(
    async (values: LoginFormValues): Promise<string | null> => {
      clearFeedback();

      try {
        await loginMutation.mutateAsync(values);
        await transferCartIfAvailable();

        if (safeRedirectHref) {
          router.replace(safeRedirectHref);
          return null;
        }

        setAuthMessage("Prihlásenie prebehlo úspešne.");
        return null;
      } catch (error) {
        return resolveLoginSubmitError(error);
      }
    },
    [clearFeedback, loginMutation, router, safeRedirectHref, transferCartIfAvailable],
  );

  const handleRegisterSubmit = useCallback(
    async (values: RegisterFormValues): Promise<string | null> => {
      clearFeedback();

      try {
        await registerMutation.mutateAsync({
          email: values.email,
          password: values.password,
          first_name: values.first_name,
          last_name: values.last_name,
        });
        await transferCartIfAvailable();

        if (safeRedirectHref) {
          router.replace(safeRedirectHref);
          return null;
        }

        setAuthMessage("Registrácia prebehla úspešne.");
        return null;
      } catch (error) {
        return resolveErrorMessage(error);
      }
    },
    [clearFeedback, registerMutation, router, safeRedirectHref, transferCartIfAvailable],
  );

  const handleLogout = useCallback(async () => {
    clearFeedback();

    try {
      await logoutMutation.mutateAsync();
      cartStorage.clearCartId();
      setAuthMessage("Odhlásenie prebehlo úspešne.");
    } catch (error) {
      setAuthError(resolveErrorMessage(error));
    }
  }, [clearFeedback, logoutMutation]);

  const isBusy =
    loginMutation.isPending ||
    registerMutation.isPending ||
    logoutMutation.isPending ||
    transferCartMutation.isPending;

  const title = mode === "register" ? "Vytvorenie účtu" : "Prihlásenie do účtu";
  const description =
    mode === "register"
      ? "Vyplňte údaje a vytvorte si zákaznícky účet."
      : "Zadajte prihlasovacie údaje pre vstup do zákazníckej sekcie.";
  const loginHref = buildAuthRouteHref("/auth/login", safeRedirectHref ?? undefined);
  const registerHref = buildAuthRouteHref(
    "/auth/register",
    safeRedirectHref ?? undefined,
  );

  return {
    authError,
    authMessage,
    authQuery,
    cartQuery,
    description,
    handleLoginSubmit,
    handleLogout,
    handleRegisterSubmit,
    isBusy,
    isDiagnosticsMode,
    loginDefaultValues,
    loginHref,
    logoutMutation,
    registerDefaultValues,
    registerHref,
    title,
    transferCartIfAvailable,
    transferCartMutation,
    generatedIdentityFactory: buildGeneratedRegisterIdentity,
  };
};
