import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import type { ReactNode } from "react"

type AdminStateSurface = "panel" | "table"
type AdminStateTone = "default" | "error"

type AdminStateProps = {
  children: ReactNode
  isBusy?: boolean
  surface?: AdminStateSurface
  tone?: AdminStateTone
}

const surfaceClassName: Record<AdminStateSurface, string> = {
  panel: "rounded-md border border-border-primary bg-surface p-450",
  table: "px-400 py-450",
}

export function AdminState({
  children,
  isBusy = false,
  surface = "table",
  tone = "default",
}: AdminStateProps) {
  return (
    <StatusText
      align="start"
      aria-busy={isBusy || undefined}
      className={surfaceClassName[surface]}
      role={tone === "error" ? "alert" : "status"}
      size="sm"
      status={tone}
    >
      {children}
    </StatusText>
  )
}
