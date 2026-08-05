/**
 * Label — @techsio/ui-kit atom.
 *
 * @component Label
 * @componentVersion v1.0.0
 * @skill label-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the label-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { LabelHTMLAttributes, ReactNode } from "react"
import type { VariantProps } from "tailwind-variants"

import { tv } from "../utils"

const labelVariants = tv({
  base: ["block", "text-label-fg", "font-label"],
  defaultVariants: {
    disabled: false,
    size: "current",
  },
  variants: {
    disabled: {
      true: "text-label-fg-disabled",
    },
    size: {
      current: "",
      lg: "text-label-lg",
      md: "text-label-md",
      sm: "text-label-sm",
    },
  },
})

export interface LabelProps
  extends
    LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {
  required?: boolean | undefined
  children: ReactNode
  className?: string | undefined
}

export function Label({
  size,
  disabled,
  required,
  children,
  className,
  ...props
}: LabelProps) {
  return (
    <label
      className={labelVariants({
        className,
        disabled,
        size,
      })}
      {...props}
      htmlFor={props.htmlFor}
    >
      {children}
      {required && <span className="ms-1 text-label-fg-required">*</span>}
    </label>
  )
}
