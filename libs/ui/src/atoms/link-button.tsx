import type {
  ComponentPropsWithoutRef,
  ElementType,
  MouseEvent,
  ReactElement,
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
  defaultVariants: {
    size: "current",
  },
})

export type LinkButtonProps<T extends ElementType = "a"> = VariantProps<
  typeof linkButton
> & {
  href?: string
  icon?: IconType
  iconPosition?: "left" | "right"
  children?: ReactNode
  disabled?: boolean
  uppercase?: boolean
  as?: T | ReactElement<HTMLAnchorElement>
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
  ...props
}: LinkButtonProps<T>) {
  return (
    <Link
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
      href={disabled ? undefined : href}
      onClick={(e: MouseEvent) => {
        if (disabled) {
          e.preventDefault()
        }
      }}
      ref={ref}
      tabIndex={disabled ? -1 : 0}
      {...props}
    >
      {icon && iconPosition === "left" && <Icon icon={icon} size={size} />}
      {children}
      {icon && iconPosition === "right" && <Icon icon={icon} size={size} />}
    </Link>
  )
}
