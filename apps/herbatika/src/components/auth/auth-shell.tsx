import { Badge } from "@techsio/ui-kit/atoms/badge";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  description: string;
  message?: string | null;
  notice?: string | null;
  error?: string | null;
  children: ReactNode;
};

export const AuthShell = ({
  title,
  description,
  message,
  notice,
  error,
  children,
}: AuthShellProps) => {
  return (
    <section className="space-y-400 max-w-max-w mx-auto p-400">
      <header className="space-y-200">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-fg-secondary">{description}</p>
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
