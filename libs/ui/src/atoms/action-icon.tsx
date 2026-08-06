/*
 * ActionIcon — @techsio/ui-kit atom.
 *
 * @component ActionIcon
 * @componentVersion v1.0.1
 * @skill action-icon-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the action-icon-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { ButtonHTMLAttributes, Ref } from "react"
import type { VariantProps } from "tailwind-variants"

import { tv } from "../utils"
import { Icon } from "./icon"
import type { IconType } from "./icon"

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
  defaultVariants: {
    size: "md",
    tone: "neutral",
  },
  variants: {
    size: {
      lg: "size-icon-control-lg text-icon-control-lg",
      md: "size-icon-control-md text-icon-control-md",
      sm: "size-icon-control-sm text-icon-control-sm",
    },
    tone: {
      danger: [
        "hover:bg-icon-control-bg-danger-hover hover:text-icon-control-fg-danger-hover",
        "active:bg-icon-control-bg-danger-active",
      ],
      neutral: [
        "hover:bg-icon-control-bg-hover",
        "active:bg-icon-control-bg-active",
      ],
    },
  },
})

type ActionIconVariants = VariantProps<typeof actionIconVariants>

export type ActionIconProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> &
  ActionIconVariants & {
    icon: IconType
    ref?: Ref<HTMLButtonElement> | undefined
  }

export const ActionIcon = ({
  icon,
  size,
  tone,
  type = "button",
  className,
  ref,
  ...props
}: ActionIconProps) => {
  const resolvedClassName = actionIconVariants({ className, size, tone })
  const content = <Icon icon={icon} size="current" />

  if (type === "submit") {
    return (
      <button className={resolvedClassName} ref={ref} type="submit" {...props}>
        {content}
      </button>
    )
  }

  if (type === "reset") {
    return (
      <button className={resolvedClassName} ref={ref} type="reset" {...props}>
        {content}
      </button>
    )
  }

  return (
    <button className={resolvedClassName} ref={ref} type="button" {...props}>
      {content}
    </button>
  )
}

ActionIcon.displayName = "ActionIcon"
