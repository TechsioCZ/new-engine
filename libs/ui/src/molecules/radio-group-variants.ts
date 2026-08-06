import { tv } from "../utils"

const radioGroupVariants = tv({
  defaultVariants: {
    size: "md",
    variant: "outline",
  },
  slots: {
    hiddenInput: "sr-only",
    item: [
      "grid grid-cols-(--radio-group-item-grid) items-start",
      "cursor-pointer select-none",
      "data-disabled:cursor-not-allowed",
      "data-readonly:cursor-default",
    ],
    itemContent: ["col-start-2 row-start-1 min-w-0 flex flex-col"],
    itemControl: [
      "row-start-1 self-center",
      "inline-grid shrink-0 place-items-center rounded-radio-group-control",
      "border-(length:--border-width-radio-group)",
      "border-radio-group-item-border-base",
      "bg-radio-group-item-bg",
      "transition-colors duration-200 motion-reduce:transition-none",
      "data-hover:bg-radio-group-item-bg-hover",
      "data-hover:border-radio-group-item-border-hover",
      "data-disabled:bg-radio-group-item-bg-disabled",
      "data-disabled:border-radio-group-item-border-disabled",
      "data-focus-visible:outline-(style:--default-ring-style)",
      "data-focus-visible:outline-(length:--default-ring-width)",
      "data-focus-visible:outline-radio-group-ring",
      "data-focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-invalid:border-radio-group-item-border-error",
      "data-invalid:outline-offset-(length:--default-ring-offset)",
    ],
    itemDescription: [
      "col-start-2 row-start-2 min-w-0 text-radio-group-item-description leading-normal",
      "data-disabled:text-radio-group-item-description-disabled",
    ],
    itemGroup: [
      "relative flex",
      "data-[orientation=horizontal]:flex-row",
      "data-[orientation=horizontal]:flex-wrap",
      "data-[orientation=vertical]:flex-col",
    ],
    itemIndicator: [
      "pointer-events-none block leading-none",
      "token-icon-radio-group-checked",
      "opacity-0 transition-opacity duration-200 motion-reduce:transition-none",
      "data-[state=checked]:opacity-100",
      "data-disabled:data-[state=checked]:text-radio-group-item-indicator-disabled",
    ],
    itemText: [
      "min-w-0 text-radio-group-item-fg leading-normal",
      "data-disabled:text-radio-group-item-fg-disabled",
    ],
    root: ["flex w-full flex-col"],
  },
  variants: {
    size: {
      lg: {
        item: "gap-x-radio-group-item-lg",
        itemContent: "gap-radio-group-item-content-lg",
        itemControl: "size-radio-group-control-lg",
        itemDescription: "text-radio-group-item-description-lg",
        itemGroup:
          "data-[orientation=horizontal]:gap-radio-group-stack-horizontal-lg data-[orientation=vertical]:gap-radio-group-stack-vertical-lg",
        itemIndicator: "size-radio-group-indicator-lg",
        itemText: "text-radio-group-item-lg",
        root: "gap-radio-group-stack-lg",
      },
      md: {
        item: "gap-x-radio-group-item-md",
        itemContent: "gap-radio-group-item-content-md",
        itemControl: "size-radio-group-control-md",
        itemDescription: "text-radio-group-item-description-md",
        itemGroup:
          "data-[orientation=horizontal]:gap-radio-group-stack-horizontal-md data-[orientation=vertical]:gap-radio-group-stack-vertical-md",
        itemIndicator: "size-radio-group-indicator-md",
        itemText: "text-radio-group-item-md",
        root: "gap-radio-group-stack-md",
      },
      sm: {
        item: "gap-x-radio-group-item-sm",
        itemContent: "gap-radio-group-item-content-sm",
        itemControl: "size-radio-group-control-sm",
        itemDescription: "text-radio-group-item-description-sm",
        itemGroup:
          "data-[orientation=horizontal]:gap-radio-group-stack-horizontal-sm data-[orientation=vertical]:gap-radio-group-stack-vertical-sm",
        itemIndicator: "size-radio-group-indicator-sm",
        itemText: "text-radio-group-item-sm",
        root: "gap-radio-group-stack-sm",
      },
    },
    variant: {
      outline: {
        itemControl: [
          "data-[state=checked]:bg-radio-group-item-bg-outline-checked",
          "data-[state=checked]:border-radio-group-item-border-outline-checked",
          "data-hover:data-[state=checked]:bg-radio-group-item-bg-outline-checked-hover",
          "data-hover:data-[state=checked]:border-radio-group-item-border-outline-checked-hover",
        ],
        itemIndicator: "text-radio-group-item-indicator-outline",
      },
      solid: {
        itemControl: [
          "data-[state=checked]:bg-radio-group-item-bg-solid-checked",
          "data-[state=checked]:border-radio-group-item-border-solid-checked",
          "data-hover:data-[state=checked]:bg-radio-group-item-bg-solid-checked-hover",
          "data-hover:data-[state=checked]:border-radio-group-item-border-solid-checked-hover",
        ],
        itemIndicator: "text-radio-group-item-indicator-solid",
      },
      subtle: {
        itemControl: [
          "data-[state=checked]:bg-radio-group-item-bg-subtle-checked",
          "data-[state=checked]:border-radio-group-item-border-subtle-checked",
          "data-hover:data-[state=checked]:bg-radio-group-item-bg-subtle-checked-hover",
          "data-hover:data-[state=checked]:border-radio-group-item-border-subtle-checked-hover",
        ],
        itemIndicator: "text-radio-group-item-indicator-subtle",
      },
    },
  },
})

export { radioGroupVariants }
