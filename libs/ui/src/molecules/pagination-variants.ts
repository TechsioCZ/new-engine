import { tv } from "../utils"

export const paginationVariants = tv({
  compoundSlots: [
    {
      className: [
        "inline-flex items-center justify-center",
        "transition-colors duration-200 motion-reduce:transition-none",
        "text-pagination-fg",
      ],
      slots: ["link", "ellipsis"],
    },
  ],
  defaultVariants: {
    size: "md",
    variant: "filled",
  },
  slots: {
    base: "",
    compactText: "",
    ellipsis: "",
    item: [
      "grid cursor-pointer",
      'has-[[data-part="ellipsis"]]:bg-pagination-bg-neutral',
      'has-[[data-part="compact-text"]]:bg-pagination-bg-neutral',
    ],
    link: [
      "focus-visible:outline-(length:--default-ring-width) focus-visible:outline-(style:--default-ring-style)",
      "focus-visible:outline-pagination-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
      "rounded-pagination border-(length:--border-pagination-width) border-pagination-border-base",
      "aspect-square",
      "data-disabled:text-pagination-fg-disabled data-disabled:hover:bg-pagination-bg-disabled",
      "data-disabled:bg-pagination-bg-disabled",
      "data-disabled:cursor-not-allowed data-disabled:border-pagination-border-disabled",
    ],
    list: ["inline-flex items-center gap-pagination-list"],
  },
  variants: {
    size: {
      lg: {
        compactText: "text-pagination-lg",
        link: "h-pagination-lg text-pagination-lg",
      },
      md: {
        compactText: "text-pagination-md",
        link: "h-pagination-md text-pagination-md",
      },
      sm: {
        compactText: "text-pagination-sm",
        link: "h-pagination-sm text-pagination-sm",
      },
    },
    variant: {
      filled: {
        item: "bg-pagination-bg-base",
        link: [
          "data-selected:border-pagination-border-active data-selected:bg-pagination-bg-active data-selected:text-pagination-fg-filled-active",
          "hover:border-pagination-border-hover hover:bg-pagination-bg-hover",
          "hover:text-pagination-fg-filled-active",
        ],
      },
      minimal: {
        link: [
          "border-transparent",
          "data-selected:text-pagination-fg-minimal-active",
          "hover:text-pagination-fg-minimal-active",
        ],
      },
      outlined: {
        item: "bg-pagination-bg-base",
        link: [
          "data-selected:border-pagination-border-active data-selected:text-pagination-fg-outlined-active",
          "hover:border-pagination-border-hover hover:text-pagination-fg-outlined-active",
        ],
      },
    },
  },
})
