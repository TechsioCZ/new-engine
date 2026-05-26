import type { IframeHTMLAttributes, ReactNode } from "react"
import { cx } from "../utils/cx"

export function AdminJsonPreview({ children }: { children: ReactNode }) {
  return (
    <pre className="m-0 max-h-admin-json-preview overflow-auto whitespace-pre-wrap bg-base px-8 py-7 font-mono text-fg-primary text-xs leading-relaxed">
      {children}
    </pre>
  )
}

export function AdminTemplatePreview({
  children,
  label,
}: {
  children: ReactNode
  label: ReactNode
}) {
  return (
    <div className="grid gap-2 rounded-md border border-border-primary bg-highlight px-6 py-5">
      <span className="font-bold text-fg-secondary text-xs">{label}</span>
      <strong className="font-bold text-fg-primary text-xs leading-snug">
        {children}
      </strong>
    </div>
  )
}

export function AdminInlineList({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-3">{children}</div>
}

export function AdminPreviewSection({
  children,
  title,
}: {
  children: ReactNode
  title: ReactNode
}) {
  return (
    <div className="grid gap-5 border-border-primary border-t px-8 py-7">
      <h3 className="m-0 font-bold text-fg-primary text-md leading-tight">
        {title}
      </h3>
      {children}
    </div>
  )
}

export function AdminPreviewCode({ children }: { children: ReactNode }) {
  return (
    <pre className="m-0 max-h-admin-email-preview overflow-auto whitespace-pre-wrap rounded-md border border-border-primary bg-base p-6 font-mono text-fg-primary text-xs leading-relaxed">
      {children}
    </pre>
  )
}

export function AdminPreviewFrame({
  className,
  loading = "lazy",
  referrerPolicy = "no-referrer",
  sandbox = "",
  ...props
}: IframeHTMLAttributes<HTMLIFrameElement>) {
  return (
    <iframe
      className={cx(
        "h-admin-email-frame w-full rounded-md border border-border-primary bg-base-light",
        className
      )}
      loading={loading}
      referrerPolicy={referrerPolicy}
      sandbox={sandbox}
      {...props}
    />
  )
}
