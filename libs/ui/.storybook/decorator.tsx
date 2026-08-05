import type { ReactNode } from "react"

interface VariantGroupProps {
  title: string
  children: ReactNode
  fullWidth?: boolean
}

export function VariantGroup({
  title,
  children,
  fullWidth,
}: VariantGroupProps) {
  return (
    <div className="w-full space-y-2">
      <h3 className="font-semibold text-fg-primary text-md">{title}</h3>
      <div
        className={`flex ${
          fullWidth ? "flex-col" : "flex-wrap"
        } items-start gap-4`}
      >
        {children}
      </div>
    </div>
  )
}

export function VariantContainer({ children }: { children: ReactNode }) {
  return <div className="flex flex-col items-center space-y-8">{children}</div>
}
