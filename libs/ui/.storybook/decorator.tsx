import type { ReactNode } from "react"
import { tv } from "../src/utils"

const storySurface = tv({ base: "mx-auto w-full min-w-0 max-w-md" })

/** Use with fullscreen layout so intrinsic story content cannot widen the viewport. */
export function StorySurface({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className="w-full min-w-0 p-200">
      <div className={storySurface({ className })}>{children}</div>
    </div>
  )
}

type VariantGroupProps = {
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
    <div className="w-full space-y-200">
      <h3 className="font-semibold text-fg-primary text-md">{title}</h3>
      <div
        className={`flex ${
          fullWidth ? "flex-col" : "flex-wrap"
        } items-start gap-400`}
      >
        {children}
      </div>
    </div>
  )
}

export function VariantContainer({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center space-y-800">{children}</div>
  )
}
