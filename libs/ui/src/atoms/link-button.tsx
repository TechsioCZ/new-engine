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
import { Icon, type IconType } from "./icon"
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
  const handleClick = onClick as ((event: MouseEvent<Element>) => void) | undefined

  return (
    <Link
      {...props}
      href={href}
      aria-disabled={disabled}
      data-disabled={disabled || undefined}
      as={as as ElementType}
      tabIndex={disabled ? -1 : tabIndex}
      className={linkButton({
        variant,
        theme,
        size,
        block,
        uppercase,
        className,
      })}
      onClick={(e: MouseEvent) => {
        if (disabled) {
          e.preventDefault()
          e.stopPropagation()
          return
        }

        handleClick?.(e)
      }}
      ref={ref}
    >
      {icon && iconPosition === "left" && <Icon icon={icon} size={size} />}
      {children}
      {icon && iconPosition === "right" && <Icon icon={icon} size={size} />}
    </Link>
  )
}
