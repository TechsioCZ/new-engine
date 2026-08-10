/*
 * Button — @techsio/ui-kit atom.
 *
 * @component Button
 * @componentVersion v0.3.3
 * @skill button-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the button-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react"
import type { VariantProps } from "tailwind-variants"

import { buttonVariants } from "./button-variants"
import { Icon } from "./icon"
import type { IconProps, IconType } from "./icon"

export { buttonVariants } from "./button-variants"

export interface ButtonProps
  extends
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    VariantProps<typeof buttonVariants> {
  icon?: IconType | undefined
  iconPosition?: "left" | "right" | undefined
  // Mirrors the Icon size scale so both stay in lockstep.
  iconSize?: IconProps["size"] | undefined
  uppercase?: boolean | undefined
  isLoading?: boolean | undefined
  loadingText?: string | undefined
  children?: ReactNode | undefined
}

export const Button = ({
  variant,
  theme,
  size,
  block,
  isLoading,
  loadingText,
  icon,
  iconPosition = "left",
  iconSize,
  uppercase = false,
  children,
  className,
  disabled: disabledProp,
  ...props
}: ButtonProps & { ref?: Ref<HTMLButtonElement> | undefined }) => {
  const disabled = isLoading === true || disabledProp === true
  const iconNode =
    icon === undefined ? null : <Icon icon={icon} size={iconSize} />
  const leftIcon = iconPosition === "left" ? iconNode : null
  const rightIcon = iconPosition === "right" ? iconNode : null
  // Matches the previous `loadingText || children` fallback: blank text falls back too.
  const loadingLabel =
    loadingText === undefined || loadingText === "" ? children : loadingText

  return (
    <button
      className={buttonVariants({
        block,
        className,
        size,
        theme,
        uppercase,
        variant,
      })}
      disabled={disabled}
      // Explicit default preserves the native `submit` behavior; `props` still overrides it.
      type="submit"
      {...props}
    >
      {isLoading === true ? (
        <>
          <Icon className="mr-2" icon="token-icon-button-spinner" />
          {loadingLabel}
        </>
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  )
}

Button.displayName = "Button"
