/**
 * Icon — @techsio/ui-kit atom.
 *
 * @component Icon
 * @componentVersion v1.0.0
 * @skill icon-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the icon-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { HTMLAttributes } from "react"
import type { VariantProps } from "tailwind-variants"

import { tv } from "../utils"

export type IconType = `token-icon-${string}` | `icon-[${string}]`

const iconVariants = tv({
  base: ["inline-block flex-shrink-0 self-center align-middle leading-none"],
  defaultVariants: {
    color: "current",
    size: "current",
  },
  variants: {
    color: {
      current: "text-current",
      danger: "text-danger",
      primary: "text-primary",
      secondary: "text-secondary",
      success: "text-success",
      warning: "text-warning",
    },
    size: {
      "2xl": "text-icon-2xl",
      current: "",
      lg: "text-icon-lg",
      md: "text-icon-md",
      sm: "text-icon-sm",
      xl: "text-icon-xl",
      xs: "text-icon-xs",
    },
  },
})

export interface IconProps
  extends
    Omit<HTMLAttributes<HTMLSpanElement>, "color">,
    VariantProps<typeof iconVariants> {
  icon: IconType
  className?: string | undefined
}

export function Icon({ icon, size, color, className, ...props }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={`${iconVariants({ className, color, size })} ${icon}`}
      {...props}
    />
  )
}
