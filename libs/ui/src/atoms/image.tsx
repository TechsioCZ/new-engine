import type { ComponentPropsWithoutRef, ElementType } from "react"
import type { VariantProps } from "tailwind-variants"
import { tv } from "../utils"

const imageVariants = tv({
  variants: {
    size: {
      sm: "size-image-sm",
      md: "size-image-md",
      lg: "size-image-lg",
      full: "w-full",
      custom: "",
    },
  },
  defaultVariants: {
    size: "full",
  },
})

export type BaseImageProps = {
  src: string
  alt: string
  className?: string
}

type HasImageProps<T extends ElementType> =
  "src" extends keyof ComponentPropsWithoutRef<T>
    ? "alt" extends keyof ComponentPropsWithoutRef<T>
      ? T
      : never
    : never

type NativeImageProps = BaseImageProps &
  VariantProps<typeof imageVariants> &
  Omit<
    ComponentPropsWithoutRef<"img">,
    keyof BaseImageProps | keyof VariantProps<typeof imageVariants>
  >

type CustomImageProps<T extends ElementType> = BaseImageProps &
  VariantProps<typeof imageVariants> &
  Omit<
    ComponentPropsWithoutRef<HasImageProps<T>>,
    keyof BaseImageProps | keyof VariantProps<typeof imageVariants>
  > & {
    as: HasImageProps<T>
  }

export type ImageProps<T extends ElementType = "img"> = T extends "img"
  ? NativeImageProps & { as?: "img" }
  : CustomImageProps<T>

export function Image<T extends ElementType = "img">({
  as,
  src,
  alt,
  size,
  className,
  ...props
}: ImageProps<T>) {
  const Component = (as || "img") as ElementType

  return (
    <Component
      alt={alt}
      className={imageVariants({ size, className })}
      src={src}
      {...props}
    />
  )
}
