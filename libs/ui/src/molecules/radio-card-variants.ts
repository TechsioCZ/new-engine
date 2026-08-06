import type { VariantProps } from "tailwind-variants"

import type { StatusTextProps } from "../atoms/status-text"
import { tv } from "../utils"

const STATE_TRANSITION_CLASS =
  "transition-colors duration-200 motion-reduce:transition-none"
const TEXT_CENTER_CLASS = "text-center"
const TEXT_RIGHT_CLASS = "text-right"

export const radioCardVariants = tv({
  defaultVariants: {
    align: "start",
    itemOrientation: "horizontal",
    justify: "between",
    size: "md",
    variant: "outline",
  },
  slots: {
    hiddenInput: "sr-only",
    item: [
      "relative flex min-w-0 flex-col overflow-hidden",
      "rounded-radio-card-item",
      "border-(length:--border-width-radio-card)",
      "border-radio-card-item-border",
      "bg-radio-card-item-bg",
      "text-radio-card-item-fg",
      "shadow-radio-card-item",
      STATE_TRANSITION_CLASS,
      "data-hover:bg-radio-card-item-bg-hover",
      "data-hover:border-radio-card-item-border-hover",
      "data-disabled:cursor-not-allowed",
      "data-disabled:bg-radio-card-item-bg-disabled",
      "data-disabled:border-radio-card-item-border-disabled",
      "data-disabled:text-radio-card-item-fg-disabled",
      "data-disabled:data-[state=checked]:bg-radio-card-item-bg-disabled",
      "data-disabled:data-[state=checked]:border-radio-card-item-border-disabled",
      "data-disabled:data-[state=checked]:text-radio-card-item-fg-disabled",
      "data-focus-visible:outline-(style:--default-ring-style)",
      "data-focus-visible:outline-(length:--default-ring-width)",
      "data-focus-visible:outline-radio-card-ring",
      "data-focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-invalid:border-radio-card-item-border-error",
    ],
    itemAddon: [
      "border-t-(length:--border-width-radio-card-addon)",
      "border-radio-card-addon-border",
      "font-radio-card-addon",
      "text-radio-card-addon-fg",
      STATE_TRANSITION_CLASS,
      "data-disabled:border-radio-card-addon-border-disabled",
      "data-disabled:bg-radio-card-addon-bg-disabled",
      "data-disabled:text-radio-card-addon-fg-disabled",
      "data-disabled:data-[state=checked]:border-radio-card-addon-border-disabled",
      "data-disabled:data-[state=checked]:bg-radio-card-addon-bg-disabled",
      "data-disabled:data-[state=checked]:text-radio-card-addon-fg-disabled",
    ],
    itemContent: ["flex min-w-0 flex-col"],
    itemControl: ["flex min-w-0 flex-1"],
    itemDescription: [
      "min-w-0",
      "text-radio-card-item-description-fg",
      "leading-normal",
      "data-disabled:text-radio-card-item-description-fg-disabled",
      "data-disabled:data-[state=checked]:text-radio-card-item-description-fg-disabled",
    ],
    itemIndicator: [
      "inline-grid shrink-0 place-items-center",
      "rounded-radio-card-indicator",
      "border-(length:--border-width-radio-card-indicator)",
      "border-radio-card-item-indicator-border",
      "bg-radio-card-item-indicator-bg",
      STATE_TRANSITION_CLASS,
      "data-disabled:border-radio-card-item-indicator-border-disabled",
      "data-disabled:bg-radio-card-item-indicator-bg-disabled",
      "data-disabled:data-[state=checked]:border-radio-card-item-indicator-border-disabled",
      "data-disabled:data-[state=checked]:bg-radio-card-item-indicator-bg-disabled",
    ],
    itemIndicatorContent: [
      "inline-grid place-items-center",
      "text-radio-card-item-indicator-content-fg",
      "opacity-0 transition-opacity duration-200 motion-reduce:transition-none",
      "data-[state=checked]:opacity-100",
      "data-disabled:data-[state=checked]:text-radio-card-item-indicator-content-fg-disabled",
    ],
    itemIndicatorMark: ["block leading-none", "token-icon-radio-card-checked"],
    itemText: [
      "min-w-0",
      "font-radio-card-item",
      "text-radio-card-item-fg",
      "leading-snug",
      "data-disabled:text-radio-card-item-fg-disabled",
      "data-disabled:data-[state=checked]:text-radio-card-item-fg-disabled",
    ],
    root: ["flex w-full flex-col"],
  },
  variants: {
    align: {
      center: {
        itemAddon: TEXT_CENTER_CLASS,
        itemContent: "items-center",
        itemControl: "items-center",
        itemDescription: TEXT_CENTER_CLASS,
        itemText: TEXT_CENTER_CLASS,
      },
      end: {
        itemAddon: TEXT_RIGHT_CLASS,
        itemContent: "items-end",
        itemControl: "items-end",
        itemDescription: TEXT_RIGHT_CLASS,
        itemText: TEXT_RIGHT_CLASS,
      },
      start: {
        itemAddon: "text-left",
        itemContent: "items-start",
        itemControl: "items-start",
        itemDescription: "text-left",
        itemText: "text-left",
      },
    },
    itemOrientation: {
      horizontal: {
        itemContent: "flex-1",
        itemControl: "flex-row",
        itemText: "flex-1",
      },
      vertical: {
        itemControl: "flex-col",
      },
    },
    justify: {
      between: {
        itemControl: "justify-between",
      },
      center: {
        itemControl: "justify-center",
      },
      end: {
        itemControl: "justify-end",
      },
      start: {
        itemControl: "justify-start",
      },
    },
    size: {
      lg: {
        itemAddon: ["p-radio-card-addon-lg", "text-radio-card-addon-lg"],
        itemContent: "gap-radio-card-item-content-lg",
        itemControl: [
          "gap-radio-card-item-control-lg",
          "p-radio-card-item-control-lg",
        ],
        itemDescription: "text-radio-card-item-description-lg",
        itemIndicator: "size-radio-card-indicator-lg",
        itemIndicatorMark: "size-radio-card-indicator-mark-lg",
        itemText: "text-radio-card-item-lg",
        root: "gap-radio-card-stack-lg",
      },
      md: {
        itemAddon: ["p-radio-card-addon-md", "text-radio-card-addon-md"],
        itemContent: "gap-radio-card-item-content-md",
        itemControl: [
          "gap-radio-card-item-control-md",
          "p-radio-card-item-control-md",
        ],
        itemDescription: "text-radio-card-item-description-md",
        itemIndicator: "size-radio-card-indicator-md",
        itemIndicatorMark: "size-radio-card-indicator-mark-md",
        itemText: "text-radio-card-item-md",
        root: "gap-radio-card-stack-md",
      },
      sm: {
        itemAddon: ["p-radio-card-addon-sm", "text-radio-card-addon-sm"],
        itemContent: "gap-radio-card-item-content-sm",
        itemControl: [
          "gap-radio-card-item-control-sm",
          "p-radio-card-item-control-sm",
        ],
        itemDescription: "text-radio-card-item-description-sm",
        itemIndicator: "size-radio-card-indicator-sm",
        itemIndicatorMark: "size-radio-card-indicator-mark-sm",
        itemText: "text-radio-card-item-sm",
        root: "gap-radio-card-stack-sm",
      },
    },
    variant: {
      outline: {
        item: [
          "data-[state=checked]:bg-radio-card-item-bg",
          "data-[state=checked]:border-radio-card-item-border-outline-checked",
          "data-hover:data-[state=checked]:bg-radio-card-item-bg-outline-checked-hover",
          "data-hover:data-[state=checked]:border-radio-card-item-border-outline-checked-hover",
        ],
        itemIndicator: [
          "data-[state=checked]:border-radio-card-item-indicator-border-outline-checked",
        ],
        itemIndicatorContent: [
          "data-[state=checked]:text-radio-card-item-indicator-content-fg-outline-checked",
        ],
      },
      solid: {
        item: [
          "data-[state=checked]:bg-radio-card-item-bg-solid-checked",
          "data-[state=checked]:border-radio-card-item-border-solid-checked",
          "data-hover:data-[state=checked]:bg-radio-card-item-bg-solid-checked-hover",
          "data-hover:data-[state=checked]:border-radio-card-item-border-solid-checked-hover",
        ],
        itemAddon: [
          "data-[state=checked]:border-radio-card-addon-border-solid-checked",
          "data-[state=checked]:text-radio-card-addon-fg-solid-checked",
        ],
        itemDescription: [
          "data-[state=checked]:text-radio-card-item-description-fg-solid-checked",
        ],
        itemIndicator: [
          "data-[state=checked]:border-radio-card-item-indicator-border-solid-checked",
          "data-[state=checked]:bg-radio-card-item-indicator-bg-solid-checked",
        ],
        itemIndicatorContent: [
          "data-[state=checked]:text-radio-card-item-indicator-content-fg-solid-checked",
        ],
        itemText: [
          "data-[state=checked]:text-radio-card-item-fg-solid-checked",
        ],
      },
      subtle: {
        item: [
          "data-[state=checked]:bg-radio-card-item-bg-subtle-checked",
          "data-[state=checked]:border-radio-card-item-border-subtle-checked",
          "data-hover:data-[state=checked]:bg-radio-card-item-bg-subtle-checked-hover",
          "data-hover:data-[state=checked]:border-radio-card-item-border-subtle-checked-hover",
        ],
        itemAddon: [
          "data-[state=checked]:border-radio-card-addon-border-subtle-checked",
          "data-[state=checked]:text-radio-card-addon-fg-subtle-checked",
        ],
        itemDescription: [
          "data-[state=checked]:text-radio-card-item-description-fg-subtle-checked",
        ],
        itemIndicator: [
          "data-[state=checked]:border-radio-card-item-indicator-border-subtle-checked",
        ],
        itemIndicatorContent: [
          "data-[state=checked]:text-radio-card-item-indicator-content-fg-subtle-checked",
        ],
        itemText: [
          "data-[state=checked]:text-radio-card-item-fg-subtle-checked",
        ],
      },
    },
  },
})

export type RadioCardVariant = NonNullable<
  VariantProps<typeof radioCardVariants>["variant"]
>
export type RadioCardSize = NonNullable<
  VariantProps<typeof radioCardVariants>["size"]
>
export type RadioCardItemOrientation = NonNullable<
  VariantProps<typeof radioCardVariants>["itemOrientation"]
>
export type RadioCardAlign = NonNullable<
  VariantProps<typeof radioCardVariants>["align"]
>
export type RadioCardJustify = NonNullable<
  VariantProps<typeof radioCardVariants>["justify"]
>
export type RadioCardValidateStatus = NonNullable<StatusTextProps["status"]>
