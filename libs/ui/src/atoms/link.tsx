/*
 * Link — @techsio/ui-kit atom.
 *
 * @component Link
 * @componentVersion v1.0.1
 * @skill link-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the link-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react"
import type { VariantProps } from "tailwind-variants"

import { tv } from "../utils"

const linkVariants = tv({
  base: [],
  defaultVariants: {},
  variants: {},
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

export const Link = <T extends ElementType = "a">({
  as,
  children,
  external = false,
  className,
  ...props
}: LinkProps<T>) => {
  const Component = as ?? "a"
  const anchorProps: Partial<ComponentPropsWithoutRef<"a">> = props
  const { target } = anchorProps
  const { rel } = anchorProps

  const externalProps = external
    ? {
        rel: rel ?? "noopener noreferrer",
        target: target ?? "_blank",
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
