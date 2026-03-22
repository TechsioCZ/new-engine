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
  variants: {
    variant: {
      text: "rounded-skeleton-text",
      box: "rounded-skeleton-box",
      circle: "aspect-square rounded-skeleton-circle",
    },
    size: {
      sm: "h-skeleton-sm",
      md: "h-skeleton-md",
      lg: "h-skeleton-lg",
      xl: "h-skeleton-xl",
      fit: "h-fit",
      full: "h-full",
    },
    block: {
      true: "w-full",
    },
  },
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
    variant: "text",
    size: "fit",
  },
})

export interface SkeletonLoaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
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
            className={skeletonVariants({ variant, size, block, className })}
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
      className={skeletonVariants({ variant, size, block, className })}
      style={style}
      {...props}
    />
  )
}
