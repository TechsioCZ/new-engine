import { tv } from "@techsio/ui-kit/utils"
import type { ReactNode } from "react"
import type { VariantProps } from "tailwind-variants"

const bannerVariants = tv({
  base: "inline-flex w-full border",
  defaultVariants: {
    size: "md",
    variant: "default",
  },
  variants: {
    size: {
      lg: "p-banner-lg text-banner-lg",
      md: "p-banner-md text-banner-md",
      sm: "p-banner-sm text-banner-sm",
    },
    variant: {
      danger:
        "border-banner-danger-border bg-banner-danger-bg text-banner-danger-fg",
      default:
        "border-banner-default-border bg-banner-default-bg text-banner-default-fg",
      info: "border-banner-info-border bg-banner-info-bg text-banner-info-fg",
      success:
        "border-banner-success-border bg-banner-success-bg text-banner-success-fg",
      warning:
        "border-banner-warning-border bg-banner-warning-bg text-banner-warning-fg",
    },
  },
})

interface BannerProps extends VariantProps<typeof bannerVariants> {
  children: ReactNode
  className?: string
}

export function Banner({ children, variant, size, className }: BannerProps) {
  return (
    <div className={bannerVariants({ className, size, variant })}>
      {children}
    </div>
  )
}
