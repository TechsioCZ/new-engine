import type { ButtonHTMLAttributes, Ref } from "react"
import type { VariantProps } from "tailwind-variants"
import { tv } from "../utils"
import { Icon, type IconType } from "./icon"

/*
 * ActionIcon — the single icon-only "sub-button" used inside larger controls
 * (clear ✕, increment/decrement, close ✕, prev/next, search). Glyph size,
 * hit area, radius and the hover/active pill all come from the shared
 * `--*-icon-control-*` tokens in tokens/components/_icon-button.css, so every
 * icon button across the system stays consistent across sm/md/lg and light/dark.
 *
 * Decorative chevrons are NOT this component — they live inside a trigger
 * <button> and read the `--text-icon-control-*` glyph tokens directly.
 */
const actionIconVariants = tv({
  base: [
    "inline-flex shrink-0 cursor-pointer items-center justify-center",
    "rounded-icon-control text-icon-control-fg",
    "transition-colors duration-200 motion-reduce:transition-none",
    "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
    "focus-visible:outline-offset-(length:--default-ring-offset) focus-visible:outline-icon-control-ring",
    "disabled:cursor-not-allowed disabled:text-icon-control-fg-disabled",
  ],
  variants: {
    size: {
      sm: "size-icon-control-sm p-icon-control-sm text-icon-control-sm",
      md: "size-icon-control-md p-icon-control-md text-icon-control-md",
      lg: "size-icon-control-lg p-icon-control-lg text-icon-control-lg",
    },
    tone: {
      neutral: [
        "hover:bg-icon-control-bg-hover hover:text-icon-control-fg-hover",
        "active:bg-icon-control-bg-active",
      ],
      danger: [
        "text-icon-control-fg-danger",
        "hover:bg-icon-control-bg-danger-hover hover:text-icon-control-fg-danger-hover",
        "active:bg-icon-control-bg-danger-hover",
      ],
    },
  },
  defaultVariants: {
    size: "md",
    tone: "neutral",
  },
})

type ActionIconVariants = VariantProps<typeof actionIconVariants>

export type ActionIconProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> &
  ActionIconVariants & {
    icon: IconType
    ref?: Ref<HTMLButtonElement>
  }

export function ActionIcon({
  icon,
  size,
  tone,
  type = "button",
  className,
  ref,
  ...props
}: ActionIconProps) {
  return (
    <button
      className={actionIconVariants({ size, tone, className })}
      ref={ref}
      type={type}
      {...props}
    >
      <Icon icon={icon} size="current" />
    </button>
  )
}

ActionIcon.displayName = "ActionIcon"
