"use client";

import { StorefrontAuthDebugPanel } from "@/components/auth/storefront-auth-debug-panel";
import { StorefrontAuthShell } from "@/components/auth/storefront-auth-shell";
import { StorefrontLoginForm } from "@/components/auth/storefront-login-form";
import { StorefrontRegisterForm } from "@/components/auth/storefront-register-form";
import { useStorefrontAuthController } from "@/components/auth/use-storefront-auth-controller";

type AuthControlsMode = "login" | "register" | "both";

type StorefrontAuthControlsProps = {
  mode?: AuthControlsMode;
  afterAuthHref?: string;
};

export function StorefrontAuthControls({
  mode = "both",
  afterAuthHref,
}: StorefrontAuthControlsProps) {
  const controller = useStorefrontAuthController({
    mode,
    afterAuthHref,
  });

  return (
    <StorefrontAuthShell
      customerEmail={controller.authQuery.customer?.email}
      description={controller.description}
      error={controller.authError}
      hasCart={Boolean(controller.cartQuery.cart?.id)}
      isAuthenticated={controller.authQuery.isAuthenticated}
      isDiagnosticsMode={controller.isDiagnosticsMode}
      isTransferPending={controller.transferCartMutation.isPending}
      message={controller.authMessage}
      title={controller.isDiagnosticsMode ? "Auth actions" : controller.title}
    >
      {(mode === "both" || mode === "login") && (
        <StorefrontLoginForm
          defaultValues={controller.loginDefaultValues}
          isBusy={controller.isBusy}
          onSubmit={controller.handleLoginSubmit}
          registerHref={controller.registerHref}
        />
      )}

      {(mode === "both" || mode === "register") && (
        <StorefrontRegisterForm
          defaultValues={controller.registerDefaultValues}
          isBusy={controller.isBusy}
          isDiagnosticsMode={controller.isDiagnosticsMode}
          loginHref={controller.loginHref}
          onGenerateIdentity={controller.generatedIdentityFactory}
          onSubmit={controller.handleRegisterSubmit}
        />
      )}

      <StorefrontAuthDebugPanel
        hasCart={Boolean(controller.cartQuery.cart?.id)}
        isAuthenticated={controller.authQuery.isAuthenticated}
        isBusy={controller.isBusy}
        isLogoutPending={controller.logoutMutation.isPending}
        isTransferPending={controller.transferCartMutation.isPending}
        isVisible={controller.isDiagnosticsMode}
        onLogout={() => {
          void controller.handleLogout();
        }}
        onTransferCart={() => {
          void controller.transferCartIfAvailable();
        }}
      />
    </StorefrontAuthShell>
  );
}
