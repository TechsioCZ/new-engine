/**
 * ActionIcon — @techsio/ui-kit atom.
 *
 * @component ActionIcon
 * @componentVersion v1.1.3
 * @skill action-icon-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the action-icon-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { ButtonHTMLAttributes, Ref } from "react"
import type { VariantProps } from "tailwind-variants"
import { tv } from "../utils"
import { Icon, type IconType } from "./icon"

/*
 * ActionIcon — the single icon-only "sub-button" used inside larger controls
 * (clear ✕, increment/decrement, close ✕, prev/next, search). Glyph size,
 * hit area, radius and the hover/active pill reference the shared
 * `--*-icon-control-*` scale. Component-local glyph aliases let a theme refine
 * the size progression without changing decorative chevrons or other controls.
 *
 * Decorative chevrons are NOT this component — they live inside a trigger
 * <button> and read the `--text-icon-control-*` glyph tokens directly.
 */
const actionIconVariants = tv({
  base: [
    "inline-flex shrink-0 cursor-pointer items-center justify-center",
    "rounded-icon-control bg-action-icon-bg text-icon-control-fg",
    "transition-colors duration-200 motion-reduce:transition-none",
    "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
    "focus-visible:outline-offset-(length:--default-ring-offset) focus-visible:outline-icon-control-ring",
    "disabled:cursor-not-allowed disabled:text-icon-control-fg-disabled",
  ],
  variants: {
    size: {
      sm: "size-icon-control-sm text-action-icon-sm",
      md: "size-icon-control-md text-action-icon-md",
      lg: "size-action-icon-lg text-action-icon-lg",
    },
    tone: {
      neutral: [
        "not-disabled:hover:bg-icon-control-bg-hover",
        "not-disabled:active:bg-icon-control-bg-active",
      ],
      danger: [
        "text-action-icon-fg-danger",
        "not-disabled:hover:bg-icon-control-bg-danger-hover not-disabled:hover:text-icon-control-fg-danger-hover",
        "not-disabled:active:bg-action-icon-bg-danger-active not-disabled:active:text-action-icon-fg-danger-active",
      ],
    },
  },
  defaultVariants: {
    size: "md",
    tone: "neutral",
  },
})

type ActionIconVariants = VariantProps<typeof actionIconVariants>

/** An icon-only button has no text, so the type requires a name. */
type ActionIconName =
  | { "aria-label": string; "aria-labelledby"?: string }
  | { "aria-label"?: string; "aria-labelledby": string }

export type ActionIconProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "aria-label" | "aria-labelledby"
> &
  ActionIconVariants &
  ActionIconName & {
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
