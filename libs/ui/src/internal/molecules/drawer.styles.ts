import type { VariantProps } from "tailwind-variants"
import { tv } from "../../utils"

export const drawerVariants = tv({
  slots: {
    backdrop: [
      "drawer-backdrop-layer fixed inset-0 bg-drawer-backdrop-bg",
      "drawer-backdrop-motion",
    ],
    positioner: [
      "drawer-physical-axis drawer-positioner-layer pointer-events-none fixed inset-0 flex",
      "data-[swipe-direction=up]:items-start",
      "data-[swipe-direction=down]:items-end",
      "data-[swipe-direction=left]:justify-start",
      "data-[swipe-direction=right]:justify-end",
    ],
    content: [
      "drawer-content-layer drawer-content-bleed pointer-events-auto relative flex max-h-full max-w-full flex-col",
      "bg-drawer-content-bg text-drawer-content-fg shadow-drawer-content",
      "border-(length:--border-width-drawer) border-drawer-content-border",
      "focus-visible:drawer-focus-ring",
      "drawer-content-motion",
      "data-[swipe-direction=up]:drawer-content-top data-[swipe-direction=up]:w-full data-[swipe-direction=up]:border-t-0",
      "data-[swipe-direction=down]:drawer-content-bottom data-[swipe-direction=down]:w-full data-[swipe-direction=down]:border-b-0",
      "data-[swipe-direction=left]:drawer-content-left data-[swipe-direction=left]:h-full data-[swipe-direction=left]:border-l-0",
      "data-[swipe-direction=right]:drawer-content-right data-[swipe-direction=right]:h-full data-[swipe-direction=right]:border-r-0",
    ],
    header: [
      "flex shrink-0 flex-col gap-drawer-header p-drawer-header",
      "border-b-(length:--border-width-drawer) border-drawer-content-border",
    ],
    body: "flex min-h-0 flex-1 flex-col overflow-y-auto p-drawer-body",
    footer: [
      "flex shrink-0 items-center justify-end gap-drawer-footer p-drawer-footer",
      "border-t-(length:--border-width-drawer) border-drawer-content-border",
    ],
    title:
      "drawer-title-typography font-drawer-title text-drawer-title-fg",
    description:
      "drawer-description-typography text-drawer-description-fg",
    trigger: "",
    closeTrigger: "",
    grabber: [
      "group absolute flex items-center justify-center p-drawer-grabber",
      "data-[swipe-direction=up]:inset-x-0 data-[swipe-direction=up]:bottom-0",
      "data-[swipe-direction=down]:inset-x-0 data-[swipe-direction=down]:top-0",
      "data-[swipe-direction=start]:inset-y-0 data-[swipe-direction=start]:end-0",
      "data-[swipe-direction=end]:inset-y-0 data-[swipe-direction=end]:start-0",
    ],
    grabberIndicator: [
      "rounded-drawer-grabber bg-drawer-grabber-bg",
      "group-data-[swipe-direction=up]:h-drawer-grabber-thickness group-data-[swipe-direction=up]:w-drawer-grabber-length",
      "group-data-[swipe-direction=down]:h-drawer-grabber-thickness group-data-[swipe-direction=down]:w-drawer-grabber-length",
      "group-data-[swipe-direction=start]:h-drawer-grabber-length group-data-[swipe-direction=start]:w-drawer-grabber-thickness",
      "group-data-[swipe-direction=end]:h-drawer-grabber-length group-data-[swipe-direction=end]:w-drawer-grabber-thickness",
    ],
    swipeArea: [
      "drawer-swipe-area-layer fixed",
      "data-[swipe-direction=up]:inset-x-0 data-[swipe-direction=up]:bottom-0 data-[swipe-direction=up]:h-drawer-swipe-area",
      "data-[swipe-direction=down]:inset-x-0 data-[swipe-direction=down]:top-0 data-[swipe-direction=down]:h-drawer-swipe-area",
      "data-[swipe-direction=left]:inset-y-0 data-[swipe-direction=left]:right-0 data-[swipe-direction=left]:w-drawer-swipe-area",
      "data-[swipe-direction=right]:inset-y-0 data-[swipe-direction=right]:left-0 data-[swipe-direction=right]:w-drawer-swipe-area",
    ],
    indent: "drawer-indent",
    indentBackground: "drawer-indent-background",
  },
  variants: {
    size: {
      xs: {
        content: [
          "data-[swipe-direction=up]:h-drawer-xs data-[swipe-direction=down]:h-drawer-xs",
          "data-[swipe-direction=left]:w-drawer-xs data-[swipe-direction=right]:w-drawer-xs",
        ],
      },
      sm: {
        content: [
          "data-[swipe-direction=up]:h-drawer-sm data-[swipe-direction=down]:h-drawer-sm",
          "data-[swipe-direction=left]:w-drawer-sm data-[swipe-direction=right]:w-drawer-sm",
        ],
      },
      md: {
        content: [
          "data-[swipe-direction=up]:h-drawer-md data-[swipe-direction=down]:h-drawer-md",
          "data-[swipe-direction=left]:w-drawer-md data-[swipe-direction=right]:w-drawer-md",
        ],
      },
      lg: {
        content: [
          "data-[swipe-direction=up]:h-drawer-lg data-[swipe-direction=down]:h-drawer-lg",
          "data-[swipe-direction=left]:w-drawer-lg data-[swipe-direction=right]:w-drawer-lg",
        ],
      },
      xl: {
        content: [
          "data-[swipe-direction=up]:h-drawer-xl data-[swipe-direction=down]:h-drawer-xl",
          "data-[swipe-direction=left]:w-drawer-xl data-[swipe-direction=right]:w-drawer-xl",
        ],
      },
      full: {
        content: [
          "data-[swipe-direction=up]:h-full data-[swipe-direction=down]:h-full",
          "data-[swipe-direction=left]:w-full data-[swipe-direction=right]:w-full",
        ],
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
})

export type DrawerSize = Exclude<
  VariantProps<typeof drawerVariants>["size"],
  null | undefined
>
