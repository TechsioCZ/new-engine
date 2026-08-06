import type { ReactNode } from "react"

interface VariantGroupProps {
  title: string
  children: ReactNode
  fullWidth?: boolean
}

export const VariantGroup = ({
  title,
  children,
  fullWidth,
}: VariantGroupProps) => (
  <div className="w-full space-y-2">
    <h3 className="font-semibold text-fg-primary text-md">{title}</h3>
    <div
      className={`flex ${
        fullWidth === true ? "flex-col" : "flex-wrap"
      } items-start gap-4`}
    >
      {children}
    </div>
  </div>
)

export const VariantContainer = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col items-center space-y-8">{children}</div>
)
