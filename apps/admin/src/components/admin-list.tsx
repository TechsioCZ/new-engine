import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { cx } from "../utils/cx"
import { AdminMediaFrame } from "./admin-media"

const rowClassName =
  "grid min-h-34 grid-cols-[minmax(0,1fr)_auto] items-center gap-8 rounded-md border border-border-primary bg-surface px-7 py-6 max-admin-layout:grid-cols-1 max-admin-layout:items-start"

const rowLinkClassName =
  "cursor-pointer transition-all duration-200 hover:bg-float hover:shadow-sm focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width) focus-visible:outline-ring focus-visible:outline-offset-(length:--default-ring-offset) motion-reduce:transition-none"

export function AdminList({
  "aria-busy": ariaBusy,
  children,
}: {
  "aria-busy"?: boolean
  children: ReactNode
}) {
  return (
    <div aria-busy={ariaBusy} className="flex flex-col gap-4">
      {children}
    </div>
  )
}

export function AdminListRow({
  children,
  className,
  to,
}: {
  children: ReactNode
  className?: string
  to?: string
}) {
  const classNames = cx(rowClassName, to ? rowLinkClassName : null, className)

  if (to) {
    return (
      <Link className={classNames} to={to}>
        {children}
      </Link>
    )
  }

  return <article className={classNames}>{children}</article>
}

export function AdminListRowBody({ children }: { children: ReactNode }) {
  return <div className="min-w-0">{children}</div>
}

export function AdminListRowTitle({ children }: { children: ReactNode }) {
  return (
    <strong className="block font-bold text-fg-primary text-sm leading-tight">
      {children}
    </strong>
  )
}

export function AdminListRowText({
  children,
  offset = true,
}: {
  children: ReactNode
  offset?: boolean
}) {
  return (
    <span
      className={cx(
        "block text-fg-secondary text-xs leading-normal",
        offset ? "mt-2" : null
      )}
    >
      {children}
    </span>
  )
}

export function AdminListRowMeta({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cx(
        "flex items-center gap-5 text-right max-admin-layout:flex-col max-admin-layout:items-start max-admin-layout:gap-3 max-admin-layout:text-left",
        className
      )}
    >
      {children}
    </div>
  )
}

export function AdminListMedia({
  fallback,
  src,
}: {
  fallback: ReactNode
  src?: string | null
}) {
  return (
    <AdminMediaFrame
      className="size-23"
      fallback={fallback}
      fallbackClassName="text-xs"
      src={src}
    />
  )
}
