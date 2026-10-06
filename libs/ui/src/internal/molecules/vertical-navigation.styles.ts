import { tv } from "../../utils"

export const verticalNavigationStyles = tv({
  slots: {
    root: "min-w-0 text-vertical-navigation-fg",
    list: "flex min-w-0 list-none flex-col gap-vertical-navigation-list",
    item: "min-w-0",
    row: "vertical-navigation-row flex min-w-0 items-start gap-vertical-navigation-row rounded-vertical-navigation-item bg-vertical-navigation-item-bg data-current-path:font-vertical-navigation-path",
    link: "vertical-navigation-control focus-visible:vertical-navigation-focus flex min-w-0 flex-1 items-center justify-start gap-vertical-navigation-row whitespace-normal rounded-vertical-navigation-item bg-vertical-navigation-item-bg text-start text-inherit hover:bg-vertical-navigation-item-bg-hover data-current:bg-vertical-navigation-item-bg-current data-current-path:font-vertical-navigation-path data-current:font-vertical-navigation-current data-current:text-vertical-navigation-item-fg-current data-disabled:text-vertical-navigation-item-fg-disabled data-disabled:hover:bg-vertical-navigation-item-bg",
    trigger:
      "vertical-navigation-control focus-visible:vertical-navigation-focus flex w-full min-w-0 items-center justify-between whitespace-normal rounded-vertical-navigation-item bg-vertical-navigation-item-bg text-start text-inherit hover:bg-vertical-navigation-item-bg-hover disabled:text-vertical-navigation-item-fg-disabled disabled:hover:bg-vertical-navigation-item-bg",
    indicator: "inline-flex shrink-0 data-[state=open]:rotate-180",
    content:
      "data-guide:vertical-navigation-guide min-w-0 rounded-vertical-navigation-group py-vertical-navigation-group data-indented:ms-vertical-navigation-indent",
    group:
      "flex min-w-0 flex-col gap-vertical-navigation-group rounded-vertical-navigation-group p-vertical-navigation-group",
    groupLabel:
      "mb-vertical-navigation-label font-vertical-navigation-label text-vertical-navigation-label-fg text-vertical-navigation-label-sm",
    separator:
      "my-vertical-navigation-group h-vertical-navigation-separator border-0 bg-vertical-navigation-separator-bg",
  },
  variants: {
    variant: { primary: {}, secondary: {} },
    size: {
      sm: {
        root: "text-vertical-navigation-sm",
        link: "min-h-vertical-navigation-item-sm px-vertical-navigation-item-x-sm py-vertical-navigation-item-y-sm",
        trigger:
          "min-h-vertical-navigation-item-sm px-vertical-navigation-item-x-sm py-vertical-navigation-item-y-sm",
        indicator: "text-vertical-navigation-icon-sm",
        groupLabel: "px-vertical-navigation-item-x-sm",
      },
      md: {
        root: "text-vertical-navigation-md",
        link: "min-h-vertical-navigation-item-md px-vertical-navigation-item-x-md py-vertical-navigation-item-y-md",
        trigger:
          "min-h-vertical-navigation-item-md px-vertical-navigation-item-x-md py-vertical-navigation-item-y-md",
        indicator: "text-vertical-navigation-icon-md",
        groupLabel: "px-vertical-navigation-item-x-md",
      },
    },
    tone: {
      plain: {
        content:
          "bg-vertical-navigation-group-bg-plain text-vertical-navigation-group-fg-plain",
        group:
          "bg-vertical-navigation-group-bg-plain text-vertical-navigation-group-fg-plain",
      },
      subtle: {
        content:
          "bg-vertical-navigation-group-bg-subtle text-vertical-navigation-group-fg-subtle",
        group:
          "bg-vertical-navigation-group-bg-subtle text-vertical-navigation-group-fg-subtle",
      },
      accent: {
        content:
          "bg-vertical-navigation-group-bg-accent text-vertical-navigation-group-fg-accent",
        group:
          "bg-vertical-navigation-group-bg-accent text-vertical-navigation-group-fg-accent",
      },
    },
  },
  compoundVariants: [
    {
      tone: "accent",
      variant: "secondary",
      class: {
        content:
          "bg-vertical-navigation-group-bg-secondary text-vertical-navigation-group-fg-secondary",
        group:
          "bg-vertical-navigation-group-bg-secondary text-vertical-navigation-group-fg-secondary",
      },
    },
  ],
  defaultVariants: { size: "md", tone: "plain", variant: "primary" },
})
