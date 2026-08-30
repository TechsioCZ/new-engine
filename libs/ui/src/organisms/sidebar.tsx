/**
 * Sidebar - @techsio/ui-kit organism.
 *
 * @component Sidebar
 * @componentVersion v1.0.0
 * @skill sidebar-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 */
"use client"

import type {
  ButtonHTMLAttributes,
  ComponentPropsWithoutRef,
  HTMLAttributes,
  ReactNode,
  Ref,
} from "react"
import { useId } from "react"
import { ActionIcon, type ActionIconProps } from "../atoms/action-icon"
import type { IconType } from "../atoms/icon"
import { Tooltip } from "../atoms/tooltip"
import { Drawer } from "../molecules/drawer"
import {
  type SidebarApi,
  type SidebarCollapsible,
  type SidebarCollapsiblePolicy,
  type SidebarExpandedChangeDetails,
  type SidebarMobileOpenChangeDetails,
  SidebarPanelProvider,
  SidebarProvider,
  type SidebarSide,
  type SidebarStateProps,
  useSidebarContext,
  useSidebarPanelContext,
  useSidebarState,
} from "../internal/organisms/sidebar.context"
import { useSidebarPanelFocusTransfer } from "../internal/organisms/sidebar.focus"
import { sidebarVariants } from "../internal/organisms/sidebar.styles"

export type SidebarRootProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "dir" | "id"
> &
  SidebarStateProps & {
    ref?: Ref<HTMLDivElement>
  }

export function Sidebar({
  children,
  className,
  collapsible,
  defaultExpanded,
  defaultMobileOpen,
  dir,
  expanded,
  id,
  mobileOpen,
  onExpandedChange,
  onMobileOpenChange,
  ref,
  ...props
}: SidebarRootProps) {
  const state = useSidebarState({
    collapsible,
    defaultExpanded,
    defaultMobileOpen,
    dir,
    expanded,
    id,
    mobileOpen,
    onExpandedChange,
    onMobileOpenChange,
  })
  const { breakpoint, root } = sidebarVariants()

  return (
    <SidebarProvider value={state}>
      <div
        {...props}
        className={root({ className })}
        data-scope="sidebar"
        data-part="root"
        dir={state.dir}
        id={state.rootId}
        ref={ref}
      >
        <span
          aria-hidden="true"
          className={breakpoint()}
          data-part="breakpoint"
          data-scope="sidebar"
          ref={state.breakpointRef}
        />
        {children}
      </div>
    </SidebarProvider>
  )
}

Sidebar.Root = Sidebar

type SidebarAccessibleName =
  | {
      "aria-label": string
      "aria-labelledby"?: string
    }
  | {
      "aria-label"?: never
      "aria-labelledby": string
    }

export type SidebarPanelProps = Omit<
  ComponentPropsWithoutRef<"aside">,
  "aria-label" | "aria-labelledby" | "id"
> &
  SidebarAccessibleName & {
    ref?: Ref<HTMLElement>
    side?: SidebarSide
  }

Sidebar.Panel = function SidebarPanel({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  onBlurCapture,
  onFocusCapture,
  ref,
  side = "start",
  tabIndex = -1,
  ...props
}: SidebarPanelProps) {
  const context = useSidebarContext()
  const collapsible = context.getCollapsible(side)
  const expanded =
    collapsible === "none" || context.isExpanded(side)
  const state = expanded ? "expanded" : "collapsed"
  const panelId = context.getPanelId(side)
  const styles = sidebarVariants({ collapsible, expanded })
  const drawerTriggerValue = context.drawer[side].triggerValue
  const focusTransfer = useSidebarPanelFocusTransfer({
    focus: context.focus,
    isDesktop: context.isDesktop,
    panelId,
    rootId: context.rootId,
    side,
    triggerValue: drawerTriggerValue,
  })

  if (context.isDesktop) {
    const inaccessible = collapsible === "offcanvas" && !expanded

    return (
      <SidebarPanelProvider value={{ collapsible, expanded, side }}>
        <aside
          {...props}
          aria-hidden={inaccessible || undefined}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          className={styles.desktopPanel({ className })}
          data-collapsible={collapsible}
          data-part="panel"
          data-scope="sidebar"
          data-side={side}
          data-state={state}
          id={panelId}
          onBlurCapture={(event) => {
            focusTransfer.onBlurCapture(event)
            onBlurCapture?.(event)
          }}
          onFocusCapture={(event) => {
            focusTransfer.onFocusCapture(event)
            onFocusCapture?.(event)
          }}
          inert={inaccessible || undefined}
          ref={ref}
          tabIndex={tabIndex}
        >
          {children}
        </aside>
      </SidebarPanelProvider>
    )
  }

  return (
    <Drawer.RootProvider size="full" value={context.drawer[side]}>
      <Drawer.Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            className={styles.mobilePanel()}
            onBlurCapture={focusTransfer.onBlurCapture}
            onFocusCapture={focusTransfer.onFocusCapture}
          >
            <SidebarPanelProvider
              value={{ collapsible, expanded: true, side }}
            >
              <aside
                {...props}
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledBy}
                className={styles.mobileAside({ className })}
                data-collapsible={collapsible}
                data-part="panel"
                data-scope="sidebar"
                data-side={side}
                data-state="expanded"
                id={panelId}
                onBlurCapture={onBlurCapture}
                onFocusCapture={onFocusCapture}
                ref={ref}
                tabIndex={tabIndex}
              >
                {children}
              </aside>
            </SidebarPanelProvider>
          </Drawer.Content>
        </Drawer.Positioner>
        <Drawer.SwipeArea />
      </Drawer.Portal>
    </Drawer.RootProvider>
  )
}

export type SidebarTriggerProps = Omit<
  ActionIconProps,
  "aria-label" | "icon" | "id" | "value"
> & {
  "aria-label": string
  icon?: IconType
  side?: SidebarSide
  tooltip?: ReactNode
  value?: string
}

Sidebar.Trigger = function SidebarTrigger({
  "aria-label": ariaLabel,
  className,
  icon = "token-icon-sidebar-trigger",
  onBlurCapture,
  onClick,
  onFocusCapture,
  side = "start",
  tooltip,
  value,
  ...props
}: SidebarTriggerProps) {
  const context = useSidebarContext()
  const generatedValue = useId()
  const drawerApi = context.drawer[side]
  const triggerValue = value ?? generatedValue
  const mobileTriggerProps = context.isDesktop
    ? undefined
    : drawerApi.getTriggerProps({ value: triggerValue })
  const { trigger } = sidebarVariants()
  const expanded = context.isExpanded(side)
  const desktopStateProps = context.isDesktop
    ? {
        "aria-controls": context.getPanelId(side),
        "aria-expanded": expanded,
        "data-state": expanded ? "open" : "closed",
      }
    : undefined

  if (context.isDesktop && context.isFixed(side)) {
    return null
  }

  const button = (
    <ActionIcon
      {...mobileTriggerProps}
      {...props}
      {...desktopStateProps}
      aria-label={ariaLabel}
      className={trigger({ className })}
      data-sidebar-trigger=""
      data-sidebar-trigger-value={triggerValue}
      data-side={side}
      icon={icon}
      onBlurCapture={(event) => {
        context.focus.blur({
          mode: context.isDesktop ? "desktop" : "mobile",
          node: event.currentTarget,
          relatedTarget: event.relatedTarget,
          side,
        })
        onBlurCapture?.(event)
      }}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) {
          return
        }

        if (context.isDesktop) {
          context.toggle(side)
        } else {
          mobileTriggerProps?.onClick?.(event)
        }
      }}
      onFocusCapture={(event) => {
        context.focus.capture({
          mode: context.isDesktop ? "desktop" : "mobile",
          node: event.currentTarget,
          side,
          triggerValue,
        })
        onFocusCapture?.(event)
      }}
    />
  )

  if (tooltip === null) {
    return button
  }

  return (
    <Tooltip
      content={tooltip ?? ariaLabel}
      dir={context.dir}
      placement={getTooltipPlacement(side, context.dir)}
    >
      {button}
    </Tooltip>
  )
}

export type SidebarCloseTriggerProps = Omit<
  ActionIconProps,
  "aria-label" | "icon"
> & {
  "aria-label": string
  icon?: IconType
}

Sidebar.CloseTrigger = function SidebarCloseTrigger({
  "aria-label": ariaLabel,
  className,
  icon = "token-icon-sidebar-close",
  onClick,
  size = "md",
  tone = "neutral",
  ...props
}: SidebarCloseTriggerProps) {
  const context = useSidebarContext()
  const panel = useSidebarPanelContext()

  if (context.isDesktop) {
    return null
  }

  const { onClick: onMachineClick, ...machineProps } =
    context.drawer[panel.side].getCloseTriggerProps()
  const { trigger } = sidebarVariants()

  return (
    <ActionIcon
      {...machineProps}
      {...props}
      aria-label={ariaLabel}
      className={trigger({ className })}
      icon={icon}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          onMachineClick?.(event)
        }
      }}
      size={size}
      tone={tone}
    />
  )
}

export type SidebarInsetProps = ComponentPropsWithoutRef<"main"> & {
  ref?: Ref<HTMLElement>
}

Sidebar.Inset = function SidebarInset({
  className,
  ref,
  ...props
}: SidebarInsetProps) {
  const { inset } = sidebarVariants()
  return (
    <main
      {...props}
      className={inset({ className })}
      data-part="inset"
      data-scope="sidebar"
      ref={ref}
    />
  )
}

export type SidebarSectionProps = HTMLAttributes<HTMLDivElement> & {
  ref?: Ref<HTMLDivElement>
}

Sidebar.Header = function SidebarHeader({
  className,
  ref,
  ...props
}: SidebarSectionProps) {
  const { header } = sidebarVariants()
  return (
    <div
      {...props}
      className={header({ className })}
      data-part="header"
      data-scope="sidebar"
      ref={ref}
    />
  )
}

Sidebar.Content = function SidebarContent({
  className,
  ref,
  ...props
}: SidebarSectionProps) {
  const { content } = sidebarVariants()
  return (
    <div
      {...props}
      className={content({ className })}
      data-part="content"
      data-scope="sidebar"
      ref={ref}
    />
  )
}

Sidebar.Footer = function SidebarFooter({
  className,
  ref,
  ...props
}: SidebarSectionProps) {
  const { footer } = sidebarVariants()
  return (
    <div
      {...props}
      className={footer({ className })}
      data-part="footer"
      data-scope="sidebar"
      ref={ref}
    />
  )
}

Sidebar.Group = function SidebarGroup({
  className,
  ref,
  ...props
}: SidebarSectionProps) {
  const { group } = sidebarVariants()
  return (
    <div
      {...props}
      className={group({ className })}
      data-part="group"
      data-scope="sidebar"
      ref={ref}
    />
  )
}

export type SidebarGroupLabelProps = ComponentPropsWithoutRef<"h2"> & {
  ref?: Ref<HTMLHeadingElement>
}

Sidebar.GroupLabel = function SidebarGroupLabel({
  className,
  ref,
  ...props
}: SidebarGroupLabelProps) {
  const { groupLabel } = sidebarVariants()
  return (
    <h2
      {...props}
      className={groupLabel({ className })}
      data-part="group-label"
      data-scope="sidebar"
      ref={ref}
    />
  )
}

Sidebar.GroupContent = function SidebarGroupContent({
  className,
  ref,
  ...props
}: SidebarSectionProps) {
  const { groupContent } = sidebarVariants()
  return (
    <div
      {...props}
      className={groupContent({ className })}
      data-part="group-content"
      data-scope="sidebar"
      ref={ref}
    />
  )
}

export type SidebarMenuProps = ComponentPropsWithoutRef<"ul"> & {
  ref?: Ref<HTMLUListElement>
}

Sidebar.Menu = function SidebarMenu({
  className,
  ref,
  ...props
}: SidebarMenuProps) {
  const { menu } = sidebarVariants()
  return (
    <ul
      {...props}
      className={menu({ className })}
      data-part="menu"
      data-scope="sidebar"
      ref={ref}
    />
  )
}

export type SidebarItemProps = ComponentPropsWithoutRef<"li"> & {
  ref?: Ref<HTMLLIElement>
}

Sidebar.Item = function SidebarItem({
  className,
  ref,
  ...props
}: SidebarItemProps) {
  const { item } = sidebarVariants()
  return (
    <li
      {...props}
      className={item({ className })}
      data-part="item"
      data-scope="sidebar"
      ref={ref}
    />
  )
}

export type SidebarSeparatorProps = ComponentPropsWithoutRef<"hr"> & {
  ref?: Ref<HTMLHRElement>
}

Sidebar.Separator = function SidebarSeparator({
  className,
  ref,
  ...props
}: SidebarSeparatorProps) {
  const { separator } = sidebarVariants()
  return (
    <hr
      {...props}
      className={separator({ className })}
      data-part="separator"
      data-scope="sidebar"
      ref={ref}
    />
  )
}

export type SidebarExpandedProps = HTMLAttributes<HTMLDivElement> & {
  ref?: Ref<HTMLDivElement>
}

Sidebar.Expanded = function SidebarExpanded({
  className,
  ref,
  ...props
}: SidebarExpandedProps) {
  const panel = useSidebarPanelContext()
  const { expanded } = sidebarVariants()
  return (
    <div
      {...props}
      className={expanded({ className })}
      data-part="expanded"
      data-scope="sidebar"
      hidden={!panel.expanded}
      ref={ref}
    />
  )
}

export type SidebarLabelProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement>
}

Sidebar.Label = function SidebarLabel({
  className,
  ref,
  ...props
}: SidebarLabelProps) {
  const panel = useSidebarPanelContext()
  const collapsed = panel.collapsible === "icon" && !panel.expanded
  const { label } = sidebarVariants({ collapsed })
  return (
    <span
      {...props}
      className={label({ className })}
      data-part="label"
      data-scope="sidebar"
      ref={ref}
    />
  )
}

export type SidebarPaneGroupProps = HTMLAttributes<HTMLDivElement> & {
  ref?: Ref<HTMLDivElement>
}

Sidebar.PaneGroup = function SidebarPaneGroup({
  className,
  ref,
  ...props
}: SidebarPaneGroupProps) {
  const { paneGroup } = sidebarVariants()
  return (
    <div
      {...props}
      className={paneGroup({ className })}
      data-part="pane-group"
      data-scope="sidebar"
      ref={ref}
    />
  )
}

export type SidebarPaneProps = HTMLAttributes<HTMLDivElement> & {
  ref?: Ref<HTMLDivElement>
  size?: "rail" | "content" | "auto"
  visibility?: "always" | "expanded"
}

Sidebar.Pane = function SidebarPane({
  className,
  ref,
  size = "auto",
  visibility = "always",
  ...props
}: SidebarPaneProps) {
  const panel = useSidebarPanelContext()
  const { pane } = sidebarVariants({ paneSize: size })
  return (
    <div
      {...props}
      className={pane({ className })}
      data-part="pane"
      data-scope="sidebar"
      data-size={size}
      data-visibility={visibility}
      hidden={visibility === "expanded" && !panel.expanded}
      ref={ref}
    />
  )
}

export type SidebarRailProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "children"
> & {
  "aria-label": string
  ref?: Ref<HTMLButtonElement>
}

Sidebar.Rail = function SidebarRail({
  "aria-label": ariaLabel,
  className,
  onClick,
  ref,
  title,
  ...props
}: SidebarRailProps) {
  const context = useSidebarContext()
  const panel = useSidebarPanelContext()
  const { rail } = sidebarVariants()

  if (panel.collapsible === "none") {
    return null
  }

  return (
    <button
      {...props}
      aria-controls={context.getPanelId(panel.side)}
      aria-expanded={panel.expanded}
      aria-label={ariaLabel}
      className={rail({ className })}
      data-part="rail"
      data-scope="sidebar"
      data-side={panel.side}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          context.toggle(panel.side)
        }
      }}
      ref={ref}
      title={title ?? ariaLabel}
      type="button"
    />
  )
}

export type SidebarContextProps = {
  children: (api: SidebarApi) => ReactNode
}

Sidebar.Context = function SidebarContext({
  children,
}: SidebarContextProps) {
  const context = useSidebarContext()
  return children(context)
}

function getTooltipPlacement(
  side: SidebarSide,
  dir: "ltr" | "rtl"
) {
  const startIsLeft = dir !== "rtl"
  const isLeft = side === "start" ? startIsLeft : !startIsLeft
  return isLeft ? "right" : "left"
}

export type {
  SidebarApi,
  SidebarCollapsible,
  SidebarCollapsiblePolicy,
  SidebarExpandedChangeDetails,
  SidebarMobileOpenChangeDetails,
  SidebarSide,
}
