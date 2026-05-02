import { Badge } from "@techsio/ui-kit/atoms/badge";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import type { ReactNode } from "react";
import { SupportingText } from "@/components/text/supporting-text";

type AuthShellProps = {
  isDiagnosticsMode: boolean;
  title: string;
  description: string;
  isAuthenticated: boolean;
  customerEmail?: string | null;
  hasCart: boolean;
  isTransferPending: boolean;
  message?: string | null;
  notice?: string | null;
  error?: string | null;
  children: ReactNode;
};

export const AuthShell = ({
  isDiagnosticsMode,
  title,
  description,
  isAuthenticated,
  customerEmail,
  hasCart,
  isTransferPending,
  message,
  notice,
  error,
  children,
}: AuthShellProps) => {
  return (
    <section className="space-y-400 max-w-max-w mx-auto p-400">
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
            <SupportingText className="text-xs text-fg-secondary">
              {`customer: ${customerEmail ?? "-"}`}
            </SupportingText>
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

      {notice && (
        <StatusText showIcon status="warning">
          {notice}
        </StatusText>
      )}

      {error && (
        <StatusText showIcon status="error">
          {error}
        </StatusText>
      )}

      {children}
    </section>
  );
};
