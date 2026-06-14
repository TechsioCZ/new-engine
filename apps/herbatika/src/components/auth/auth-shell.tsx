import { Badge } from "@techsio/ui-kit/atoms/badge"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import type { ReactNode } from "react"

type AuthShellProps = {
  title: string
  description: string
  message?: string | null
  notice?: string | null
  error?: string | null
  children: ReactNode
}

export const AuthShell = ({
  title,
  description,
  message,
  notice,
  error,
  children,
}: AuthShellProps) => (
  <section className="mx-auto max-w-max-w space-y-400 p-400">
    <header className="space-y-200">
      <h2 className="font-semibold text-lg">{title}</h2>
      <p className="text-fg-secondary text-sm">{description}</p>
    </header>

    {message && (
      <Badge
        className="rounded-full px-300 py-100 font-semibold text-xs"
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
)
