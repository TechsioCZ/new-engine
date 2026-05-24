import type { IframeHTMLAttributes, ReactNode } from "react"
import { cx } from "../utils/cx"

export function AdminJsonPreview({ children }: { children: ReactNode }) {
  return (
    <pre className="m-0 max-h-admin-json-preview overflow-auto whitespace-pre-wrap bg-base px-400 py-350 font-mono text-fg-primary text-xs leading-relaxed">
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
    <div className="grid gap-100 rounded-md border border-border-primary bg-highlight px-300 py-250">
      <span className="font-bold text-fg-secondary text-xs">{label}</span>
      <strong className="font-bold text-fg-primary text-xs leading-snug">
        {children}
      </strong>
    </div>
  )
}

export function AdminInlineList({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-150">{children}</div>
}

export function AdminPreviewSection({
  children,
  title,
}: {
  children: ReactNode
  title: ReactNode
}) {
  return (
    <div className="grid gap-250 border-border-primary border-t px-400 py-350">
      <h3 className="m-0 font-bold text-fg-primary text-md leading-tight">
        {title}
      </h3>
      {children}
    </div>
  )
}

export function AdminPreviewCode({ children }: { children: ReactNode }) {
  return (
    <pre className="m-0 max-h-admin-email-preview overflow-auto whitespace-pre-wrap rounded-md border border-border-primary bg-base p-300 font-mono text-fg-primary text-xs leading-relaxed">
      {children}
    </pre>
  )
}

export function AdminPreviewFrame({
  className,
  ...props
}: IframeHTMLAttributes<HTMLIFrameElement>) {
  return (
    <iframe
      className={cx(
        "h-admin-email-frame w-full rounded-md border border-border-primary bg-base-light",
        className
      )}
      {...props}
    />
  )
}
