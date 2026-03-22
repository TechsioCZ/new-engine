import type { HTMLAttributes } from "react"
import type { VariantProps } from "tailwind-variants"
import { tv } from "../utils"

const badgeVariants = tv({
  base: [
    "inline-flex items-center justify-center",
    "p-badge",
    "rounded-badge border-badge-border",
    "font-badge text-badge-size",
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
  },
  defaultVariants: {
    variant: "info",
  },
})

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>

type BaseBadgeProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  "color" | "children"
> & {
  children: string
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
        "background-color": bgColor,
        color: fgColor,
        "border-color": borderColor,
      }
    : style

  return (
    <span
      className={badgeVariants({ variant, className })}
      style={dynamicStyles}
      {...restProps}
    >
      {children}
    </span>
  )
}
