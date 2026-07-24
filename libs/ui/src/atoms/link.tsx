import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react"
import type { VariantProps } from "tailwind-variants"

import { tv } from "../utils"

const linkVariants = tv({
  base: [],
  variants: {},
  defaultVariants: {},
})

export interface BaseLinkProps extends VariantProps<typeof linkVariants> {
  children: ReactNode
  external?: boolean | undefined
  className?: string | undefined
}

export interface NativeLinkProps
  extends
    BaseLinkProps,
    Omit<ComponentPropsWithoutRef<"a">, keyof BaseLinkProps> {
  as?: never
}

export type LinkProps<T extends ElementType = "a"> = BaseLinkProps &
  Omit<ComponentPropsWithoutRef<T>, keyof BaseLinkProps> & {
    as?: T | undefined
  }

export function Link<T extends ElementType = "a">({
  as,
  children,
  external = false,
  className,
  ...props
}: LinkProps<T>) {
  const Component = (as || "a") as ElementType
  const anchorProps: Partial<ComponentPropsWithoutRef<"a">> = props
  const target = anchorProps.target
  const rel = anchorProps.rel

  const externalProps = external
    ? {
        target: target ?? "_blank",
        rel: rel ?? "noopener noreferrer",
      }
    : {}

  return (
    <Component
      className={linkVariants({ className })}
      {...externalProps}
      {...props}
    >
      {children}
    </Component>
  )
}
