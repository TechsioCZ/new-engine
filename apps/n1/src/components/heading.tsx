import type { HTMLAttributes, ReactNode } from "react"

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3"
  children: ReactNode
  variant?: "h1" | "h2" | "h3"
}

const sizes = {
  h1: "text-2xl",
  h2: "text-xl",
  h3: "text-lg",
} as const

export function Heading({
  as,
  children,
  variant = "h1",
  ...props
}: HeadingProps) {
  const Component = as || "h1"
  const size = sizes[variant]

  return (
    <Component
      className={`${size} relative font-bold after:absolute after:bottom-0 after:left-0 after:h-100 after:w-heading-accent after:bg-primary`}
      {...props}
    >
      {children}
    </Component>
  )
}
