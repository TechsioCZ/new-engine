"use client";

import { useRegionContext } from "@techsio/storefront-data/shared";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { FormInput } from "@techsio/ui-kit/molecules/form-input";
import NextLink from "next/link";
import { useState } from "react";
import {
  useAuth,
  useLogin,
  useLogout,
  useRegister,
} from "@/lib/storefront/auth";
import { useCart, useTransferCart } from "@/lib/storefront/cart";
import { cartStorage } from "@/lib/storefront/cart-storage";

type AuthControlsMode = "login" | "register" | "both";

type StorefrontAuthControlsProps = {
  mode?: AuthControlsMode;
};

const DEFAULT_PASSWORD = "CodexTest123!";
const DEFAULT_REGISTER_EMAIL = "codex+manual@example.com";
const DEFAULT_REGISTER_FIRST_NAME = "Codex";
const DEFAULT_REGISTER_LAST_NAME = "Tester";

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unknown error occurred.";
};

const buildGeneratedIdentity = () => {
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

export function StorefrontAuthControls({
  mode = "both",
}: StorefrontAuthControlsProps) {
  const region = useRegionContext();
  const authQuery = useAuth();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();
  const transferCartMutation = useTransferCart();
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const cartQuery = useCart({
    autoCreate: false,
    region_id: region?.region_id,
    country_code: region?.country_code,
    enabled: Boolean(region?.region_id),
  });

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState(DEFAULT_PASSWORD);
  const [registerEmail, setRegisterEmail] = useState(DEFAULT_REGISTER_EMAIL);
  const [registerPassword, setRegisterPassword] = useState(DEFAULT_PASSWORD);
  const [registerFirstName, setRegisterFirstName] = useState(
    DEFAULT_REGISTER_FIRST_NAME,
  );
  const [registerLastName, setRegisterLastName] = useState(
    DEFAULT_REGISTER_LAST_NAME,
  );

  const transferCartIfAvailable = async () => {
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
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setAuthMessage(null);

    try {
      await loginMutation.mutateAsync({
        email: loginEmail,
        password: loginPassword,
      });
      await transferCartIfAvailable();
      setAuthMessage("Prihlásenie prebehlo úspešne.");
    } catch (error) {
      setAuthError(resolveErrorMessage(error));
    }
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setAuthMessage(null);

    try {
      await registerMutation.mutateAsync({
        email: registerEmail,
        password: registerPassword,
        first_name: registerFirstName,
        last_name: registerLastName,
      });
      await transferCartIfAvailable();
      setAuthMessage("Registrácia prebehla úspešne.");
    } catch (error) {
      setAuthError(resolveErrorMessage(error));
    }
  };

  const handleLogout = async () => {
    setAuthError(null);
    setAuthMessage(null);

    try {
      await logoutMutation.mutateAsync();
      cartStorage.clearCartId();
      setAuthMessage("Odhlásenie prebehlo úspešne.");
    } catch (error) {
      setAuthError(resolveErrorMessage(error));
    }
  };

  const regenerateRegisterIdentity = () => {
    const identity = buildGeneratedIdentity();
    setRegisterEmail(identity.email);
    setRegisterFirstName(identity.firstName);
    setRegisterLastName(identity.lastName);
  };

  const isBusy =
    loginMutation.isPending ||
    registerMutation.isPending ||
    logoutMutation.isPending ||
    transferCartMutation.isPending;

  return (
    <section className="space-y-4 rounded-xl border border-black/10 bg-white p-4">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold">Auth actions</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant={authQuery.isAuthenticated ? "success" : "info"}>
            {`auth: ${authQuery.isAuthenticated ? "authenticated" : "guest"}`}
          </Badge>
          <Badge variant={cartQuery.cart?.id ? "success" : "warning"}>
            {`cart id: ${cartQuery.cart?.id ? "ready" : "missing"}`}
          </Badge>
          <Badge variant={transferCartMutation.isPending ? "warning" : "info"}>
            {`transfer: ${transferCartMutation.isPending ? "running" : "idle"}`}
          </Badge>
        </div>
        <ExtraText className="text-xs text-fg-secondary">
          {`customer: ${authQuery.customer?.email ?? "-"}`}
        </ExtraText>
      </header>

      {authMessage && (
        <Badge className="rounded-full px-3 py-1 text-xs font-semibold" variant="success">
          {authMessage}
        </Badge>
      )}
      {authError && <ErrorText showIcon>{authError}</ErrorText>}

      {(mode === "both" || mode === "login") && (
        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleLogin}>
          <FormInput
            id="auth-login-email"
            label="Login email"
            name="email"
            type="email"
            value={loginEmail}
            onChange={(event) => setLoginEmail(event.target.value)}
            required
          />
          <FormInput
            id="auth-login-password"
            label="Login password"
            name="password"
            type="password"
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
            required
          />

          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Button disabled={isBusy || !loginEmail || !loginPassword} isLoading={isBusy} type="submit">
              Prihlásiť
            </Button>
            <LinkButton as={NextLink} href="/auth/register" theme="outlined" variant="secondary">
              Na registráciu
            </LinkButton>
          </div>
        </form>
      )}

      {(mode === "both" || mode === "register") && (
        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleRegister}>
          <FormInput
            id="auth-register-email"
            label="Register email"
            name="email"
            type="email"
            value={registerEmail}
            onChange={(event) => setRegisterEmail(event.target.value)}
            required
          />
          <FormInput
            id="auth-register-password"
            label="Register password"
            name="password"
            type="password"
            value={registerPassword}
            onChange={(event) => setRegisterPassword(event.target.value)}
            required
          />
          <FormInput
            id="auth-register-first-name"
            label="First name"
            name="first_name"
            type="text"
            value={registerFirstName}
            onChange={(event) => setRegisterFirstName(event.target.value)}
          />
          <FormInput
            id="auth-register-last-name"
            label="Last name"
            name="last_name"
            type="text"
            value={registerLastName}
            onChange={(event) => setRegisterLastName(event.target.value)}
          />

          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Button
              disabled={isBusy || !registerEmail || !registerPassword}
              isLoading={isBusy}
              type="submit"
            >
              Registrovať
            </Button>
            <Button
              disabled={isBusy}
              onClick={regenerateRegisterIdentity}
              theme="outlined"
              type="button"
              variant="secondary"
            >
              Vygenerovať test identitu
            </Button>
            <LinkButton as={NextLink} href="/auth/login" theme="outlined" variant="secondary">
              Na prihlásenie
            </LinkButton>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2 border-t border-black/10 pt-3">
        <Button
          disabled={isBusy || !authQuery.isAuthenticated}
          isLoading={logoutMutation.isPending}
          onClick={handleLogout}
          type="button"
          variant="danger"
        >
          Odhlásiť
        </Button>
        <Button
          disabled={isBusy || !cartQuery.cart?.id || !authQuery.isAuthenticated}
          isLoading={transferCartMutation.isPending}
          onClick={() => {
            void transferCartIfAvailable();
          }}
          theme="outlined"
          type="button"
          variant="secondary"
        >
          Spustiť transfer cart ručne
        </Button>
      </div>
    </section>
  );
}
