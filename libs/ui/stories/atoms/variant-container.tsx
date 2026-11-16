import type { ReactNode } from "react"
import { tv } from "../../src/utils"

const atomVariantContainer = tv({
  base: "flex flex-col items-center space-y-800",
})

export function AtomVariantContainer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={atomVariantContainer({ className })}>{children}</div>
}
