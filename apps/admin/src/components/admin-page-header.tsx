import type { ReactNode } from "react"
import { cx } from "../utils/cx"

export function AdminPage({
  children,
  className,
  width = "default",
}: {
  children: ReactNode
  className?: string
  width?: "default" | "full" | "wide"
}) {
  const widthClassName = {
    default: "w-[min(var(--container-admin-page),100%)]",
    full: "w-full",
    wide: "w-[min(var(--container-admin-page-wide),100%)]",
  }[width]

  return (
    <section className={cx("flex flex-col gap-9", widthClassName, className)}>
      {children}
    </section>
  )
}

export function AdminPageHeader({
  children,
  eyebrow,
  title,
}: {
  children?: ReactNode
  eyebrow: ReactNode
  title: ReactNode
}) {
  return (
    <header className="admin-layout:flex grid items-start admin-layout:items-end justify-between gap-9 border-border-primary border-b pb-9">
      <div>
        <span className="font-bold text-fg-secondary text-xs uppercase tracking-normal">
          {eyebrow}
        </span>
        <h1 className="mt-5 mb-0 font-bold admin-layout:text-admin-page-title text-admin-page-title-sm text-fg-primary leading-none tracking-normal">
          {title}
        </h1>
      </div>
      {children}
    </header>
  )
}

export function AdminPageCount({
  label,
  value,
}: {
  label: ReactNode
  value: ReactNode
}) {
  return (
    <div className="grid min-w-46 justify-items-start admin-layout:justify-items-end gap-1">
      <span className="font-bold text-admin-page-count leading-none">
        {value}
      </span>
      <small className="font-semibold text-fg-secondary text-xs">{label}</small>
    </div>
  )
}

export function AdminPageHeaderActions({ children }: { children: ReactNode }) {
  return (
    <div className="grid justify-items-start admin-layout:justify-items-end gap-4">
      {children}
    </div>
  )
}

export function AdminStatusRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-start admin-layout:justify-end gap-3">
      {children}
    </div>
  )
}
