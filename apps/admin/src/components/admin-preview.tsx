import type { ReactNode } from "react"

export function AdminJsonPreview({ children }: { children: ReactNode }) {
  return (
    <pre className="m-0 max-h-[var(--spacing-admin-preview-max-height)] overflow-auto whitespace-pre-wrap bg-base px-400 py-350 font-mono text-fg-primary text-xs leading-relaxed">
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
