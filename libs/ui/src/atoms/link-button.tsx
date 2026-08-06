/*
 * LinkButton — @techsio/ui-kit atom.
 *
 * @component LinkButton
 * @componentVersion v1.0.1
 * @skill link-button-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the link-button-usage skill's component_version and a changelog entry. Bump all three together.
 */
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
import { Icon } from "./icon"
import type { IconProps, IconType } from "./icon"
import { Link } from "./link"

const linkButton = tv({
  base: "data-disabled:cursor-not-allowed",
  defaultVariants: {
    size: "current",
  },
  extend: buttonVariants,
})

type LinkButtonHref<T extends ElementType> =
  ComponentPropsWithoutRef<T> extends { href?: infer H } ? H : string

export type LinkButtonProps<T extends ElementType = "a"> = VariantProps<
  typeof linkButton
> & {
  href?: LinkButtonHref<T> | undefined
  icon?: IconType | undefined
  iconPosition?: "left" | "right" | undefined
  iconSize?: IconProps["size"] | undefined
  children?: ReactNode | undefined
  disabled?: boolean | undefined
  uppercase?: boolean | undefined
  as?: T | undefined
  ref?: Ref<HTMLAnchorElement> | undefined
} & Omit<
    ComponentPropsWithoutRef<T>,
    "as" | "ref" | "children" | keyof VariantProps<typeof linkButton>
  >

const handleDisabledClick = (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
}

export const LinkButton = <T extends ElementType = "a">({
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
}: LinkButtonProps<T>) => {
  const Component: ElementType = as ?? "a"
  const hasIcon = icon !== undefined
  const isDisabled = disabled === true

  return (
    <Link
      {...props}
      aria-disabled={disabled}
      as={Component}
      className={linkButton({
        block,
        className,
        size,
        theme,
        uppercase,
        variant,
      })}
      data-disabled={isDisabled ? true : undefined}
      href={href}
      onClick={isDisabled ? handleDisabledClick : onClick}
      ref={ref}
      tabIndex={isDisabled ? -1 : tabIndex}
    >
      {hasIcon && iconPosition === "left" && (
        <Icon icon={icon} size={iconSize ?? size} />
      )}
      {children}
      {hasIcon && iconPosition === "right" && (
        <Icon icon={icon} size={iconSize ?? size} />
      )}
    </Link>
  )
}
