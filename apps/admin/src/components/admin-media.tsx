import type { CSSProperties, ReactNode } from "react"

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
      className={[
        "grid overflow-hidden rounded-md border border-border-primary bg-base bg-center bg-cover",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={src ? getBackgroundImageStyle(src) : undefined}
    >
      {!src && (
        <span
          className={[
            "grid size-full place-items-center font-bold text-fg-secondary",
            fallbackClassName,
          ]
            .filter(Boolean)
            .join(" ")}
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
