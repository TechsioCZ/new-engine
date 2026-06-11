import type { HTMLAttributes, ReactNode } from "react"

type SupportingTextProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode
}

export function SupportingText({
  className,
  children,
  ...props
}: SupportingTextProps) {
  return (
    <p
      className={["text-fg-secondary text-sm leading-relaxed", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </p>
  )
}
