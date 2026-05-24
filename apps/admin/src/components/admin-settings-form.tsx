import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Button, type ButtonProps } from "@techsio/ui-kit/atoms/button"
import type { FormHTMLAttributes, ReactNode } from "react"
import { AdminPanel } from "./admin-panel"

type AdminSettingsPanelWidth = "form" | "settings"

const panelWidthClassName: Record<AdminSettingsPanelWidth, string> = {
  form: "max-w-2xl",
  settings: "max-w-4xl",
}

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ")
}

export function AdminSettingsPanel({
  children,
  className,
  width = "settings",
}: {
  children: ReactNode
  className?: string
  width?: AdminSettingsPanelWidth
}) {
  return (
    <AdminPanel as="div" className={cx(panelWidthClassName[width], className)}>
      {children}
    </AdminPanel>
  )
}

export function AdminSettingsForm({
  children,
  className,
  ...props
}: FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form className={cx("grid p-400", className)} {...props}>
      {children}
    </form>
  )
}

export function AdminSettingsSection({
  children,
  className,
  description,
  title,
}: {
  children: ReactNode
  className?: string
  description?: ReactNode
  title?: ReactNode
}) {
  return (
    <section
      className={cx(
        "grid gap-350 border-border-secondary border-b py-400 first:pt-0",
        className
      )}
    >
      {(title || description) && (
        <AdminSettingsSectionHeading description={description} title={title} />
      )}
      {children}
    </section>
  )
}

export function AdminSettingsGrid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cx(
        "grid grid-cols-2 gap-300 max-admin-layout:grid-cols-1",
        className
      )}
    >
      {children}
    </div>
  )
}

export function AdminSettingsToggle({
  children,
  description,
  title,
}: {
  children: ReactNode
  description?: ReactNode
  title: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-350 max-admin-layout:flex-col max-admin-layout:items-start">
      <AdminSettingsSectionHeading description={description} title={title} />
      {children}
    </div>
  )
}

export function AdminFormActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end pt-400 max-admin-layout:[&>*]:w-full">
      {children}
    </div>
  )
}

export function AdminFieldLabelRow({
  action,
  label,
  meta,
}: {
  action?: ReactNode
  label: ReactNode
  meta?: ReactNode
}) {
  return (
    <span className="flex items-center justify-between gap-200">
      <span className="inline-flex items-center gap-200">
        {label}
        {meta}
      </span>
      {action}
    </span>
  )
}

export function AdminFieldMeta({
  children,
  tone = "default",
}: {
  children: string
  tone?: "danger" | "default"
}) {
  return (
    <Badge size="sm" variant={tone === "danger" ? "danger" : "outline"}>
      {children}
    </Badge>
  )
}

export function AdminInlineAction({
  className,
  size = "current",
  theme = "borderless",
  type = "button",
  variant = "danger",
  ...props
}: ButtonProps) {
  return (
    <Button
      className={cx("font-bold text-xs", className)}
      size={size}
      theme={theme}
      type={type}
      variant={variant}
      {...props}
    />
  )
}

function AdminSettingsSectionHeading({
  description,
  title,
}: {
  description?: ReactNode
  title?: ReactNode
}) {
  return (
    <div className="grid gap-100">
      {title && (
        <h3 className="m-0 font-bold text-fg-primary text-sm leading-normal">
          {title}
        </h3>
      )}
      {description && (
        <span className="text-fg-secondary text-xs leading-normal">
          {description}
        </span>
      )}
    </div>
  )
}
