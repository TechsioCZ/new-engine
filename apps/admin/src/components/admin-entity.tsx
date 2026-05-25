import type { ReactNode } from "react"
import { cx } from "../utils/cx"

type AdminEntitySize = "sm" | "md"
type AdminEntityTextOffset = "none" | "sm" | "md"
type AdminEntityTextTone = "secondary" | "tertiary"

const entitySizeClassName: Record<AdminEntitySize, string> = {
  md: "grid-cols-[var(--spacing-admin-entity-md)_minmax(0,1fr)] gap-300",
  sm: "grid-cols-[var(--spacing-admin-entity-sm)_minmax(0,1fr)] gap-250",
}

const textOffsetClassName: Record<AdminEntityTextOffset, string | null> = {
  md: "mt-100",
  none: null,
  sm: "mt-50",
}

const textToneClassName: Record<AdminEntityTextTone, string> = {
  secondary: "text-fg-secondary",
  tertiary: "text-fg-tertiary",
}

export function AdminEntityLayout({
  children,
  className,
  size = "md",
}: {
  children: ReactNode
  className?: string
  size?: AdminEntitySize
}) {
  return (
    <div
      className={cx(
        "grid min-w-0 items-center",
        entitySizeClassName[size],
        className
      )}
    >
      {children}
    </div>
  )
}

export function AdminEntityBody({ children }: { children: ReactNode }) {
  return <div className="min-w-0">{children}</div>
}

export function AdminEntityText({
  children,
  className,
  offset = "md",
  tone = "secondary",
}: {
  children: ReactNode
  className?: string
  offset?: AdminEntityTextOffset
  tone?: AdminEntityTextTone
}) {
  return (
    <span
      className={cx(
        "block text-xs leading-normal",
        textToneClassName[tone],
        textOffsetClassName[offset],
        className
      )}
    >
      {children}
    </span>
  )
}
