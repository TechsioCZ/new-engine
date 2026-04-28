import type {
  ComponentPropsWithoutRef,
  ElementType,
  MouseEvent,
  ReactNode,
  Ref,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { tv } from "../utils"
import { buttonVariants } from "./button"
import { Icon, type IconProps, type IconType } from "./icon"
import { Link } from "./link"

const linkButton = tv({
  extend: buttonVariants,
  base: "data-disabled:cursor-not-allowed",
  defaultVariants: {
    size: "current",
  },
})

type LinkButtonHref<T extends ElementType> =
  ComponentPropsWithoutRef<T> extends { href?: infer H } ? H : string

export type LinkButtonProps<T extends ElementType = "a"> = VariantProps<
  typeof linkButton
> & {
  href?: LinkButtonHref<T>
  icon?: IconType
  iconPosition?: "left" | "right"
  iconSize?: IconProps["size"]
  children?: ReactNode
  disabled?: boolean
  uppercase?: boolean
  as?: T
  ref?: Ref<HTMLAnchorElement>
} & Omit<
    ComponentPropsWithoutRef<T>,
    "as" | "ref" | "children" | keyof VariantProps<typeof linkButton>
  >

export function LinkButton<T extends ElementType = "a">({
  href,
  icon,
  as,
  iconPosition = "left",
  iconSize,
  children,
  variant,
  theme,
  size,
  block,
  uppercase,
  className,
  disabled,
  ref,
  onClick,
  tabIndex,
  ...props
}: LinkButtonProps<T>) {
  const handleClick = onClick as
    | ((event: MouseEvent<Element>) => void)
    | undefined

  return (
    <Link
      {...props}
      aria-disabled={disabled}
      as={as as ElementType}
      className={linkButton({
        variant,
        theme,
        size,
        block,
        uppercase,
        className,
      })}
      data-disabled={disabled || undefined}
      href={href}
      onClick={(e: MouseEvent) => {
        if (disabled) {
          e.preventDefault()
          e.stopPropagation()
          return
        }

        handleClick?.(e)
      }}
      ref={ref}
      tabIndex={disabled ? -1 : tabIndex}
    >
      {icon && iconPosition === "left" && (
        <Icon icon={icon} size={iconSize ?? size} />
      )}
      {children}
      {icon && iconPosition === "right" && (
        <Icon icon={icon} size={iconSize ?? size} />
      )}
    </Link>
  )
}
