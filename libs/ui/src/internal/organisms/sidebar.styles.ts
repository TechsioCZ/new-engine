import { tv } from "../../utils"

export const sidebarVariants = tv({
  slots: {
    root: [
      "relative flex min-h-sidebar-viewport w-full min-w-0",
      "bg-sidebar-root-bg text-sidebar-root-fg",
    ],
    breakpoint:
      "pointer-events-none invisible absolute hidden size-0 sidebar-desktop:block",
    desktopPanel: [
      "group/sidebar-panel sticky top-sidebar-offset hidden h-sidebar-viewport shrink-0 flex-col overflow-hidden",
      "sidebar-desktop:flex bg-sidebar-panel-bg text-sidebar-panel-fg",
      "border-sidebar-panel-border transition-all duration-sidebar motion-reduce:transition-none",
      "focus-visible:sidebar-focus-ring",
      "data-[side=start]:border-e-(length:--border-width-sidebar)",
      "data-[side=end]:border-s-(length:--border-width-sidebar)",
    ],
    mobilePanel: [
      "w-full max-w-sidebar-mobile bg-sidebar-panel-bg p-0 text-sidebar-panel-fg",
      "data-[swipe-direction=left]:rounded-none data-[swipe-direction=right]:rounded-none",
    ],
    mobileAside:
      "flex h-full min-h-0 w-full flex-col overflow-hidden focus-visible:sidebar-focus-ring",
    trigger: [
      "bg-sidebar-trigger-bg text-sidebar-trigger-fg",
      "hover:bg-sidebar-trigger-bg-hover active:bg-sidebar-trigger-bg-active",
    ],
    inset: [
      "relative min-h-sidebar-viewport min-w-0 flex-1",
      "bg-sidebar-inset-bg text-sidebar-inset-fg",
    ],
    header: [
      "flex shrink-0 flex-col gap-sidebar-section p-sidebar-section",
      "border-b-(length:--border-width-sidebar) border-sidebar-panel-border",
      "group-data-[state=collapsed]/sidebar-panel:p-sidebar-section-compact",
      "group-data-[size=rail]/sidebar-pane:p-sidebar-section-compact",
    ],
    content: [
      "flex min-h-0 flex-1 flex-col gap-sidebar-content overflow-y-auto overflow-x-hidden",
      "p-sidebar-content",
      "group-data-[state=collapsed]/sidebar-panel:p-sidebar-content-compact",
      "group-data-[size=rail]/sidebar-pane:p-sidebar-content-compact",
    ],
    footer: [
      "flex shrink-0 flex-col gap-sidebar-section p-sidebar-section",
      "border-t-(length:--border-width-sidebar) border-sidebar-panel-border",
      "group-data-[state=collapsed]/sidebar-panel:p-sidebar-section-compact",
      "group-data-[size=rail]/sidebar-pane:p-sidebar-section-compact",
    ],
    group: "flex min-w-0 flex-col gap-sidebar-group",
    groupLabel: [
      "sidebar-group-label-typography truncate px-sidebar-group-label",
      "font-sidebar-group-label text-sidebar-group-label-fg",
    ],
    groupContent: "flex min-w-0 flex-col gap-sidebar-group-content",
    menu: "flex min-w-0 list-none flex-col gap-sidebar-menu",
    item: "relative min-w-0",
    separator: [
      "h-sidebar-separator w-full shrink-0 border-0",
      "bg-sidebar-separator-bg",
    ],
    expanded: "min-w-0",
    label: "min-w-0 truncate whitespace-nowrap",
    paneGroup: "flex min-h-0 min-w-0 flex-1 overflow-hidden",
    pane: "group/sidebar-pane flex min-h-0 min-w-0 flex-col",
    rail: [
      "sidebar-rail-layer absolute top-0 bottom-0 hidden w-sidebar-rail cursor-col-resize items-center justify-center",
      "sidebar-desktop:flex text-sidebar-rail-fg hover:bg-sidebar-rail-bg-hover",
      "focus-visible:sidebar-focus-ring",
      "data-[side=start]:end-0 data-[side=end]:start-0",
      "after:h-sidebar-rail-indicator after:w-sidebar-rail-indicator after:rounded-sidebar-rail after:bg-sidebar-rail-indicator-bg",
    ],
  },
  variants: {
    collapsible: {
      icon: {},
      offcanvas: {},
      none: {},
    },
    expanded: {
      true: {},
      false: {},
    },
    paneSize: {
      rail: {
        pane: "w-sidebar-icon shrink-0",
      },
      content: {
        pane: [
          "flex-1 border-s-(length:--border-width-sidebar)",
          "border-sidebar-pane-border",
        ],
      },
      auto: {
        pane: "flex-1",
      },
    },
    collapsed: {
      true: {
        label: "sr-only",
      },
      false: {},
    },
  },
  compoundVariants: [
    {
      collapsible: "icon",
      expanded: true,
      class: {
        desktopPanel: "w-sidebar-expanded",
      },
    },
    {
      collapsible: "icon",
      expanded: false,
      class: {
        desktopPanel: "w-sidebar-icon",
      },
    },
    {
      collapsible: "offcanvas",
      expanded: true,
      class: {
        desktopPanel: "w-sidebar-expanded",
      },
    },
    {
      collapsible: "offcanvas",
      expanded: false,
      class: {
        desktopPanel: "w-0 border-transparent",
      },
    },
    {
      collapsible: "none",
      class: {
        desktopPanel: "w-sidebar-expanded",
      },
    },
  ],
  defaultVariants: {
    collapsible: "icon",
    expanded: true,
    paneSize: "auto",
    collapsed: false,
  },
})
