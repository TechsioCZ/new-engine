/**
 * Link — @techsio/ui-kit atom.
 *
 * @component Link
 * @componentVersion v1.2.4
 * @skill link-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the link-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { ComponentPropsWithRef, ElementType, ReactNode } from "react"
import type { VariantProps } from "tailwind-variants"
import { tv } from "../utils"

const linkVariants = tv({
  base: [
    "text-link-fg-readable underline underline-offset-2",
    // Focus redraws the link's own underline as one continuous rule instead of
    // drawing a control-like pill or outer ring, so focus paint stays inside
    // the text box on every line fragment and cannot reach the prose beside
    // the link.
    "hover:decoration-2",
    "focus-visible:link-focus-inline data-focus-visible:link-focus-inline",
  ],
  variants: {
    size: {
      sm: "text-link-sm",
      md: "text-link-md",
      lg: "text-link-lg",
      current: "link-current-size",
    },
  },
  defaultVariants: { size: "md" },
})

export type BaseLinkProps = VariantProps<typeof linkVariants> & {
  children: ReactNode
  external?: boolean
  className?: string
}

export type NativeLinkProps = BaseLinkProps &
  Omit<ComponentPropsWithRef<"a">, keyof BaseLinkProps> & {
    as?: never
  }

export type LinkProps<T extends ElementType = "a"> = BaseLinkProps &
  Omit<ComponentPropsWithRef<T>, keyof BaseLinkProps> & {
    as?: T
  }

export function Link<T extends ElementType = "a">({
  as,
  children,
  external = false,
  className,
  size,
  ...props
}: LinkProps<T>) {
  const Component = (as || "a") as ElementType
  const target = "target" in props ? props.target : undefined
  const rel = "rel" in props ? props.rel : undefined

  const externalProps = external
    ? {
        target: target ?? "_blank",
        rel: rel ?? "noopener noreferrer",
      }
    : {}

  return (
    <Component
      className={linkVariants({ size, className })}
      {...externalProps}
      {...props}
    >
      {children}
    </Component>
  )
}
