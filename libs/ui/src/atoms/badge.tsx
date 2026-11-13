/**
 * Badge — @techsio/ui-kit atom.
 *
 * @component Badge
 * @componentVersion v2.0.0
 * @skill badge-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the badge-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { ComponentPropsWithRef } from "react"
import type { VariantProps } from "tailwind-variants"
import { useUIDefaults } from "../theme/ui-provider"
import { tv } from "../utils"

const SOLID_SEVERITY = {
  primary:
    "border-badge-border-primary bg-badge-bg-primary text-badge-fg-primary",
  secondary:
    "border-badge-border-secondary bg-badge-bg-secondary text-badge-fg-secondary",
  tertiary:
    "border-badge-border-tertiary bg-badge-bg-tertiary text-badge-fg-tertiary",
  discount:
    "border-badge-border-discount bg-badge-bg-discount text-badge-fg-discount",
  info: "border-badge-border-info bg-badge-bg-info text-badge-fg-info",
  success:
    "border-badge-border-success bg-badge-bg-success text-badge-fg-success",
  warning:
    "border-badge-border-warning bg-badge-bg-warning text-badge-fg-warning",
  danger: "border-badge-border-danger bg-badge-bg-danger text-badge-fg-danger",
} as const

const OUTLINE_BORDER = {
  primary: "border-badge-border-primary",
  secondary: "border-badge-border-secondary",
  tertiary: "border-badge-border-tertiary",
  discount: "border-badge-border-discount",
  info: "border-badge-border-info",
  success: "border-badge-border-success",
  warning: "border-badge-border-warning",
  danger: "border-badge-border-danger",
} as const

const badgeVariants = tv({
  base: [
    "inline-flex items-center justify-center",
    "rounded-badge border-badge-border",
    "border-(length:--border-width-badge)",
  ],
  variants: {
    severity: {
      primary: "",
      secondary: "",
      tertiary: "",
      discount: "",
      info: "",
      success: "",
      warning: "",
      danger: "",
      // Neutral has no fill of its own: it always renders the outline look.
      neutral:
        "border-badge-border-outline bg-badge-bg-outline text-badge-fg-outline",
      custom: "",
    },
    appearance: {
      solid: "",
      outline: "bg-badge-bg-outline text-badge-fg-outline",
    },
    size: {
      sm: ["font-badge-sm text-badge-sm", "p-badge-sm"],
      md: ["font-badge-md text-badge-md", "p-badge-md"],
      lg: ["font-badge-lg text-badge-lg", "p-badge-lg"],
      xl: ["font-badge-xl text-badge-xl", "p-badge-xl"],
    },
  },
  compoundVariants: [
    ...Object.entries(SOLID_SEVERITY).map(([severity, className]) => ({
      severity: severity as keyof typeof SOLID_SEVERITY,
      appearance: "solid" as const,
      className,
    })),
    ...Object.entries(OUTLINE_BORDER).map(([severity, className]) => ({
      severity: severity as keyof typeof OUTLINE_BORDER,
      appearance: "outline" as const,
      className,
    })),
  ],
  defaultVariants: {
    severity: "info",
    appearance: "solid",
    size: "md",
  },
})

export type BadgeSeverity = NonNullable<
  VariantProps<typeof badgeVariants>["severity"]
>
export type BadgeAppearance = NonNullable<
  VariantProps<typeof badgeVariants>["appearance"]
>
type BadgeSize = NonNullable<VariantProps<typeof badgeVariants>["size"]>

type BaseBadgeProps = Omit<
  ComponentPropsWithRef<"span">,
  "color" | "children"
> & {
  children: string
  size?: BadgeSize
  /** Fill style. Falls back to the nearest `UIProvider`, then `solid`. */
  appearance?: BadgeAppearance
}

type DefaultBadgeProps = BaseBadgeProps & {
  severity?: Exclude<BadgeSeverity, "custom">
}

type CustomBadgeProps = BaseBadgeProps & {
  severity: "custom"
  bgColor: string
  fgColor: string
  borderColor: string
}

export type BadgeProps = DefaultBadgeProps | CustomBadgeProps

export function Badge({
  severity,
  size: sizeProp,
  appearance: appearanceProp,
  className,
  children,
  style,
  ...props
}: BadgeProps) {
  const { size, appearance } = useUIDefaults(
    "Badge",
    { size: sizeProp, appearance: appearanceProp },
    badgeVariants
  )
  const isDynamic = severity === "custom"

  const { bgColor, fgColor, borderColor, ...restProps } =
    props as Partial<CustomBadgeProps>

  const dynamicStyles = isDynamic
    ? {
        ...style,
        backgroundColor: bgColor,
        color: fgColor,
        borderColor,
      }
    : style

  return (
    <span
      className={badgeVariants({ severity, appearance, size, className })}
      style={dynamicStyles}
      {...restProps}
    >
      {children}
    </span>
  )
}
