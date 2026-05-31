import type { LabelHTMLAttributes, ReactNode } from "react"
import type { VariantProps } from "tailwind-variants"
import { tv } from "../utils"

const labelVariants = tv({
  base: ["block", "text-label-fg", "font-label"],
  variants: {
    size: {
      sm: "text-label-sm",
      md: "text-label-md",
      lg: "text-label-lg",
      current: "",
    },
    disabled: {
      true: "text-label-fg-disabled",
    },
  },
  defaultVariants: {
    size: "current",
    disabled: false,
  },
})

export interface LabelProps
  extends LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {
  required?: boolean
  children: ReactNode
  className?: string
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
        size,
        disabled,
        className,
      })}
      {...props}
      htmlFor={props.htmlFor}
    >
      {children}
      {required && <span className="ms-1 text-label-fg-required">*</span>}
    </label>
  )
}
