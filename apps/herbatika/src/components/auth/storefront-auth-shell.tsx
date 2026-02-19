import { Badge } from "@techsio/ui-kit/atoms/badge";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import type { ReactNode } from "react";

type StorefrontAuthShellProps = {
  isDiagnosticsMode: boolean;
  title: string;
  description: string;
  isAuthenticated: boolean;
  customerEmail?: string | null;
  hasCart: boolean;
  isTransferPending: boolean;
  message?: string | null;
  error?: string | null;
  children: ReactNode;
};

export const StorefrontAuthShell = ({
  isDiagnosticsMode,
  title,
  description,
  isAuthenticated,
  customerEmail,
  hasCart,
  isTransferPending,
  message,
  error,
  children,
}: StorefrontAuthShellProps) => {
  return (
    <section className="space-y-400 rounded-xl border border-border-secondary bg-surface p-400">
      <header className="space-y-200">
        <h2 className="text-lg font-semibold">{title}</h2>

        {isDiagnosticsMode ? (
          <>
            <div className="flex flex-wrap gap-200">
              <Badge variant={isAuthenticated ? "success" : "info"}>
                {`auth: ${isAuthenticated ? "authenticated" : "guest"}`}
              </Badge>
              <Badge variant={hasCart ? "success" : "warning"}>
                {`cart id: ${hasCart ? "ready" : "missing"}`}
              </Badge>
              <Badge variant={isTransferPending ? "warning" : "info"}>
                {`transfer: ${isTransferPending ? "running" : "idle"}`}
              </Badge>
            </div>
            <ExtraText className="text-xs text-fg-secondary">
              {`customer: ${customerEmail ?? "-"}`}
            </ExtraText>
          </>
        ) : (
          <p className="text-sm text-fg-secondary">{description}</p>
        )}
      </header>

      {message && (
        <Badge
          className="rounded-full px-300 py-100 text-xs font-semibold"
          variant="success"
        >
          {message}
        </Badge>
      )}

      {error && <ErrorText showIcon>{error}</ErrorText>}

      {children}
    </section>
  );
};
