import { tv } from "@techsio/ui-kit/utils"
import type * as React from "react"
import type { VariantProps } from "tailwind-variants"

import "../../tokens/app-components/atoms/_skeleton-loader.css"

const skeletonVariants = tv({
  base: [
    "relative",
    "overflow-hidden",
    "bg-skeleton-bg",
    "before:absolute",
    "before:inset-0",
    "before:-translate-x-full",
    "before:animate-skeleton-shimmer",
    "before:bg-gradient-to-r",
    "before:from-transparent",
    "before:via-skeleton-shimmer",
    "before:to-transparent",
  ],
  compoundVariants: [
    {
      variant: "text",
      size: "sm",
      className: "h-skeleton-text-sm",
    },
    {
      variant: "text",
      size: "md",
      className: "h-skeleton-text-md",
    },
    {
      variant: "text",
      size: "lg",
      className: "h-skeleton-text-lg",
    },
    {
      variant: "text",
      size: "xl",
      className: "h-skeleton-text-xl",
    },
    {
      variant: "text",
      size: "full",
      className: "h-full",
    },
  ],
  defaultVariants: {
    size: "fit",
    variant: "text",
  },
  variants: {
    block: {
      true: "w-full",
    },
    size: {
      fit: "h-fit",
      full: "h-full",
      lg: "h-skeleton-lg",
      md: "h-skeleton-md",
      sm: "h-skeleton-sm",
      xl: "h-skeleton-xl",
    },
    variant: {
      box: "rounded-skeleton-box",
      circle: "aspect-square rounded-skeleton-circle",
      text: "rounded-skeleton-text",
    },
  },
})

export interface SkeletonLoaderProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  count?: number
  containerClassName?: string
}

export function SkeletonLoader({
  variant,
  size,
  block,
  count = 1,
  containerClassName,
  className,
  style,
  ...props
}: SkeletonLoaderProps) {
  if (count > 1) {
    return (
      <div className={containerClassName}>
        {Array.from({ length: count }).map((_, index) => (
          <div
            className={skeletonVariants({ block, className, size, variant })}
            key={`skeleton-${index}`}
            style={style}
            {...props}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={skeletonVariants({ block, className, size, variant })}
      style={style}
      {...props}
    />
  )
}
