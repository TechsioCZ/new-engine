"use client";

import { AuthDebugPanel } from "@/components/auth/auth-debug-panel";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { useAuthController } from "@/components/auth/use-auth-controller";
import { LoginForm } from "./auth/login-form";

type AuthControlsMode = "login" | "register" | "both";

type AuthControlsProps = {
  mode?: AuthControlsMode;
  afterAuthHref?: string;
};

export function AuthControls({
  mode = "both",
  afterAuthHref,
}: AuthControlsProps) {
  const controller = useAuthController({
    mode,
    afterAuthHref,
  });

  return (
    <AuthShell
      customerEmail={controller.authQuery.customer?.email}
      description={controller.description}
      error={controller.authError}
      hasCart={Boolean(controller.cartQuery.cart?.id)}
      isAuthenticated={controller.authQuery.isAuthenticated}
      isDiagnosticsMode={controller.isDiagnosticsMode}
      notice={controller.authNotice}
      isTransferPending={controller.transferCartMutation.isPending}
      message={controller.authMessage}
      title={controller.isDiagnosticsMode ? "Auth actions" : controller.title}
    >
      {(mode === "both" || mode === "login") && (
        <LoginForm
          defaultValues={controller.loginDefaultValues}
          isBusy={controller.isBusy}
          onSubmit={controller.handleLoginSubmit}
          registerHref={controller.registerHref}
          forgotPasswordHref={controller.forgotPasswordHref}
        />
      )}

      {(mode === "both" || mode === "register") && (
        <RegisterForm
          defaultValues={controller.registerDefaultValues}
          isBusy={controller.isBusy}
          isDiagnosticsMode={controller.isDiagnosticsMode}
          loginHref={controller.loginHref}
          onGenerateIdentity={controller.generatedIdentityFactory}
          onSubmit={controller.handleRegisterSubmit}
        />
      )}

      <AuthDebugPanel
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
          void controller.handleTransferCart();
        }}
      />
    </AuthShell>
  );
}
