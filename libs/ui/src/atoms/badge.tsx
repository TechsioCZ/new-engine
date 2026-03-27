import type { HTMLAttributes } from "react"
import type { VariantProps } from "tailwind-variants"
import { tv } from "../utils"

const badgeVariants = tv({
  base: [
    "inline-flex items-center justify-center",
    "rounded-badge border-badge-border",
    "border-(length:--border-width-badge)",
  ],
  variants: {
    variant: {
      primary: [
        "border-badge-border-primary bg-badge-bg-primary text-badge-fg-primary",
      ],
      secondary: [
        "border-badge-border-secondary bg-badge-bg-secondary text-badge-fg-secondary",
      ],
      tertiary: [
        "border-badge-border-tertiary bg-badge-bg-tertiary text-badge-fg-tertiary",
      ],
      discount: [
        "border-badge-border-discount bg-badge-bg-discount text-badge-fg-discount",
      ],
      info: ["border-badge-border-info bg-badge-bg-info text-badge-fg-info"],
      success: [
        "border-badge-border-success bg-badge-bg-success text-badge-fg-success",
      ],
      warning: [
        "border-badge-border-warning bg-badge-bg-warning text-badge-fg-warning",
      ],
      danger: [
        "border-badge-border-danger bg-badge-bg-danger text-badge-fg-danger",
      ],
      outline: [
        "border-badge-border-outline bg-badge-bg-outline text-badge-fg-outline",
      ],
      dynamic: [],
    },
    size: {
      sm: ["text-badge-sm font-badge-sm", "p-badge-sm"],
      md: ["text-badge-md font-badge-md", "p-badge-md"],
      lg: ["text-badge-lg font-badge-lg", "p-badge-lg"],
      xl: ["text-badge-xl font-badge-xl", "p-badge-xl"],
    },
  },
  defaultVariants: {
    variant: "info",
    size: "md",
  },
})

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>
type BadgeSize = NonNullable<VariantProps<typeof badgeVariants>["size"]>

type BaseBadgeProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  "color" | "children"
> & {
  children: string
  size?: BadgeSize
}

type DefaultBadgeProps = BaseBadgeProps & {
  variant?: Exclude<BadgeVariant, "dynamic">
}

type DynamicBadgeProps = BaseBadgeProps & {
  variant: "dynamic"
  bgColor: string
  fgColor: string
  borderColor: string
}

export type BadgeProps = DefaultBadgeProps | DynamicBadgeProps

export function Badge({
  variant,
  size,
  className,
  children,
  style,
  ...props
}: BadgeProps) {
  const isDynamic = variant === "dynamic"

  const { bgColor, fgColor, borderColor, ...restProps } =
    props as Partial<DynamicBadgeProps>

  const dynamicStyles = isDynamic
    ? {
        ...style,
        backgroundColor: bgColor,
        color: fgColor,
        borderColor: borderColor,
      }
    : style

  return (
    <span
      className={badgeVariants({ variant, size, className })}
      style={dynamicStyles}
      {...restProps}
    >
      {children}
    </span>
  )
}
