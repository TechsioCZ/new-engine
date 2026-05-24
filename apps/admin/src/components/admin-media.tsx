import type { CSSProperties, ReactNode } from "react"
import { cx } from "../utils/cx"

export function AdminMediaFrame({
  className,
  fallback,
  fallbackClassName,
  src,
}: {
  className?: string
  fallback: ReactNode
  fallbackClassName?: string
  src?: string | null
}) {
  return (
    <span
      className={cx(
        "grid overflow-hidden rounded-md border border-border-primary bg-base bg-center bg-cover",
        className
      )}
      style={src ? getBackgroundImageStyle(src) : undefined}
    >
      {!src && (
        <span
          className={cx(
            "grid size-full place-items-center font-bold text-fg-secondary",
            fallbackClassName
          )}
        >
          {fallback}
        </span>
      )}
    </span>
  )
}

function getBackgroundImageStyle(src: string): CSSProperties {
  return {
    backgroundImage: `url("${src.replaceAll('"', "%22")}")`,
  }
}
