"use client";

import { useRegionContext } from "@techsio/storefront-data/shared/region-context";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildAuthRouteHref,
  buildGeneratedRegisterIdentity,
  buildLoginDefaults,
  buildRegisterDefaults,
  resolveSafeRedirectHref,
} from "@/components/auth/storefront-auth-helpers";
import {
  resolveLoginSubmitError,
  type LoginFormValues,
  type RegisterFormValues,
} from "@/lib/auth/auth-form-validators";
import { useAuth, useLogin, useRegister } from "@/lib/storefront/auth";
import {
  storefrontCartReadQueryOptions,
  useCart,
  useTransferCart,
} from "@/lib/storefront/cart";
import { cartStorage } from "@/lib/storefront/cart-storage";
import { resolveErrorMessage } from "@/lib/storefront/error-utils";
import { useStorefrontLogoutAction } from "@/lib/storefront/use-storefront-logout-action";

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
  const transferCartMutation = useTransferCart();
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const isDiagnosticsMode = mode === "both";
  const {
    handleLogout: performLogout,
    logoutMutation,
  } = useStorefrontLogoutAction();

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
    setAuthNotice(null);
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

  const runPostAuthCartTransfer = useCallback(async () => {
    if (!cartQuery.cart?.id) {
      return null;
    }

    try {
      await transferCartIfAvailable();
      return null;
    } catch {
      return "Účet je aktívny, ale obsah košíka sa nepodarilo preniesť. Skúste to prosím znova v košíku.";
    }
  }, [cartQuery.cart?.id, transferCartIfAvailable]);

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
        const transferNotice = await runPostAuthCartTransfer();

        if (safeRedirectHref) {
          router.replace(safeRedirectHref);
          return null;
        }

        setAuthMessage("Prihlásenie prebehlo úspešne.");
        setAuthNotice(transferNotice);
        return null;
      } catch (error) {
        return resolveLoginSubmitError(error);
      }
    },
    [clearFeedback, loginMutation, router, runPostAuthCartTransfer, safeRedirectHref],
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
        const transferNotice = await runPostAuthCartTransfer();

        if (safeRedirectHref) {
          router.replace(safeRedirectHref);
          return null;
        }

        setAuthMessage("Registrácia prebehla úspešne.");
        setAuthNotice(transferNotice);
        return null;
      } catch (error) {
        return resolveErrorMessage(error);
      }
    },
    [clearFeedback, registerMutation, router, runPostAuthCartTransfer, safeRedirectHref],
  );

  const handleLogout = useCallback(async () => {
    clearFeedback();

    const result = await performLogout();
    if (result.ok) {
      setAuthMessage("Odhlásenie prebehlo úspešne.");
      return;
    }

    setAuthError(result.error);
  }, [clearFeedback, performLogout]);

  const handleTransferCart = useCallback(async () => {
    clearFeedback();

    try {
      await transferCartIfAvailable();
      setAuthMessage("Prenos košíka prebehol úspešne.");
    } catch (error) {
      setAuthError(resolveErrorMessage(error));
    }
  }, [clearFeedback, transferCartIfAvailable]);

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
    authNotice,
    authQuery,
    cartQuery,
    description,
    handleLoginSubmit,
    handleLogout,
    handleRegisterSubmit,
    handleTransferCart,
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
