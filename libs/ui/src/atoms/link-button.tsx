/**
 * LinkButton — @techsio/ui-kit atom.
 *
 * @component LinkButton
 * @componentVersion v1.2.1
 * @skill link-button-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the link-button-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type {
  ComponentPropsWithRef,
  ElementType,
  MouseEvent,
  ReactNode,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { tv } from "../utils"
import { buttonVariants } from "./button"
import { Icon, type IconProps, type IconType } from "./icon"

const linkButton = tv({
  extend: buttonVariants,
  base: "no-underline data-disabled:cursor-not-allowed",
  defaultVariants: {
    size: "md",
  },
})

type LinkButtonHref<T extends ElementType> =
  ComponentPropsWithRef<T> extends { href?: infer H } ? H : string

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
} & Omit<
    ComponentPropsWithRef<T>,
    "as" | "children" | keyof VariantProps<typeof linkButton>
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
  composition,
  ref,
  onClick,
  tabIndex,
  ...props
}: LinkButtonProps<T>) {
  const handleClick = onClick as
    | ((event: MouseEvent<Element>) => void)
    | undefined

  const Component = (disabled ? "span" : as || "a") as ElementType

  return (
    <Component
      {...props}
      aria-disabled={disabled === true ? true : props["aria-disabled"]}
      className={linkButton({
        variant,
        theme,
        size,
        block,
        uppercase,
        composition,
        className,
      })}
      data-disabled={disabled ? "" : undefined}
      href={disabled ? undefined : href}
      onClick={(e: MouseEvent) => {
        if (disabled) {
          e.preventDefault()
          e.stopPropagation()
          return
        }

        handleClick?.(e)
      }}
      ref={disabled ? undefined : ref}
      role={disabled ? "link" : props.role}
      tabIndex={disabled ? -1 : tabIndex}
    >
      {icon && iconPosition === "left" && (
        <Icon icon={icon} size={iconSize ?? "current"} />
      )}
      {children}
      {icon && iconPosition === "right" && (
        <Icon icon={icon} size={iconSize ?? "current"} />
      )}
    </Component>
  )
}
