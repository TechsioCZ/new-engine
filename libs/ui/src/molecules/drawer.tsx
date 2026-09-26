/**
 * Drawer - @techsio/ui-kit molecule.
 *
 * @component Drawer
 * @componentVersion v1.0.0
 * @skill drawer-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 */
"use client"

import type * as drawer from "@zag-js/drawer"
import { mergeProps, Portal, type PortalProps } from "@zag-js/react"
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react"
import { ActionIcon, type ActionIconProps } from "../atoms/action-icon"
import { Button, type ButtonProps } from "../atoms/button"
import type { IconType } from "../atoms/icon"
import {
  type DrawerApi,
  type DrawerPresenceProps,
  DrawerProvider,
  DrawerStackProvider,
  type DrawerStackProviderProps,
  getDrawerPresenceProps,
  type UseDrawerProps,
  useComposedRefs,
  useDrawerContext,
  useDrawer as useDrawerMachine,
  useDrawerPresence,
  useDrawerStackContext,
} from "../internal/molecules/drawer.context"
import {
  type DrawerSize,
  drawerVariants,
} from "../internal/molecules/drawer.styles"

export type {
  DrawerApi,
  DrawerPresenceProps,
  DrawerStackApi,
  UseDrawerProps,
} from "../internal/molecules/drawer.context"
export type { DrawerSize } from "../internal/molecules/drawer.styles"

export const useDrawer = useDrawerMachine

export type DrawerPlacement = "bottom" | "end" | "start" | "top"

const swipeDirectionByPlacement = {
  bottom: "down",
  end: "end",
  start: "start",
  top: "up",
} satisfies Record<DrawerPlacement, drawer.SwipeDirection>

export type DrawerRootProps = Omit<UseDrawerProps, "swipeDirection"> &
  DrawerPresenceProps & {
    children?: ReactNode
    placement?: DrawerPlacement
    size?: DrawerSize
  }

export function Drawer({
  children,
  immediate,
  lazyMount = true,
  onEnterComplete,
  onExitComplete,
  placement = "end",
  size,
  skipAnimationOnMount = false,
  unmountOnExit = true,
  ...machineProps
}: DrawerRootProps) {
  const api = useDrawer({
    ...machineProps,
    swipeDirection: swipeDirectionByPlacement[placement],
  })

  return (
    <DrawerProvider
      api={api}
      immediate={immediate}
      lazyMount={lazyMount}
      onEnterComplete={onEnterComplete}
      onExitComplete={onExitComplete}
      size={size}
      skipAnimationOnMount={skipAnimationOnMount}
      unmountOnExit={unmountOnExit}
    >
      {children}
    </DrawerProvider>
  )
}

export type DrawerRootProviderProps = DrawerPresenceProps & {
  children?: ReactNode
  size?: DrawerSize
  value: DrawerApi
}

Drawer.Root = Drawer

Drawer.RootProvider = function DrawerRootProvider({
  children,
  immediate,
  lazyMount = true,
  onEnterComplete,
  onExitComplete,
  size,
  skipAnimationOnMount = false,
  unmountOnExit = true,
  value,
}: DrawerRootProviderProps) {
  return (
    <DrawerProvider
      api={value}
      immediate={immediate}
      lazyMount={lazyMount}
      onEnterComplete={onEnterComplete}
      onExitComplete={onExitComplete}
      size={size}
      skipAnimationOnMount={skipAnimationOnMount}
      unmountOnExit={unmountOnExit}
    >
      {children}
    </DrawerProvider>
  )
}

export type DrawerTriggerProps = Omit<ButtonProps, "value"> &
  drawer.TriggerProps & {
    ref?: Ref<HTMLButtonElement>
  }

Drawer.Trigger = function DrawerTrigger({
  className,
  ref,
  value,
  ...props
}: DrawerTriggerProps) {
  const { api, styles } = useDrawerContext()
  const mergedProps = mergeProps(api.getTriggerProps({ value }), props)

  return (
    <Button
      {...mergedProps}
      className={styles.trigger({ className })}
      ref={ref}
    />
  )
}

export type DrawerPortalProps = PortalProps & {
  children?: ReactNode
}

Drawer.Portal = function DrawerPortal(props: DrawerPortalProps) {
  return <Portal {...props} />
}

export type DrawerBackdropProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

Drawer.Backdrop = function DrawerBackdrop({
  className,
  ref,
  ...props
}: DrawerBackdropProps) {
  const { api, presenceOptions, styles } = useDrawerContext()
  const presence = useDrawerPresence({
    ...presenceOptions,
    present: api.open,
  })
  const composedRef = useComposedRefs(presence.ref, ref)

  if (presence.unmounted) {
    return null
  }

  const mergedProps = mergeProps(
    api.getBackdropProps(),
    getDrawerPresenceProps(api.open, presence),
    props
  )

  return (
    <div
      {...mergedProps}
      className={styles.backdrop({ className })}
      ref={composedRef}
    />
  )
}

export type DrawerPositionerProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

Drawer.Positioner = function DrawerPositioner({
  className,
  ref,
  ...props
}: DrawerPositionerProps) {
  const { api, presence, styles } = useDrawerContext()

  if (presence.unmounted) {
    return null
  }

  const mergedProps = mergeProps(
    api.getPositionerProps(),
    getDrawerPresenceProps(api.open, presence),
    props
  )

  return (
    <div
      {...mergedProps}
      className={styles.positioner({ className })}
      ref={ref}
    />
  )
}

export type DrawerContentProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "draggable"
> &
  drawer.ContentProps & {
    ref?: Ref<HTMLDivElement>
  }

Drawer.Content = function DrawerContent({
  className,
  draggable = true,
  ref,
  ...props
}: DrawerContentProps) {
  const { api, presence, styles } = useDrawerContext()
  const composedRef = useComposedRefs(presence.ref, ref)

  if (presence.unmounted) {
    return null
  }

  const mergedProps = mergeProps(
    api.getContentProps({ draggable }),
    getDrawerPresenceProps(api.open, presence),
    props
  )

  return (
    <div
      {...mergedProps}
      className={styles.content({ className })}
      ref={composedRef}
    />
  )
}

export type DrawerSectionProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

export type DrawerHeaderProps = DrawerSectionProps

Drawer.Header = function DrawerHeader({
  className,
  ref,
  ...props
}: DrawerHeaderProps) {
  const { styles } = useDrawerContext()
  return <div className={styles.header({ className })} ref={ref} {...props} />
}

export type DrawerBodyProps = DrawerSectionProps

Drawer.Body = function DrawerBody({
  className,
  ref,
  ...props
}: DrawerBodyProps) {
  const { styles } = useDrawerContext()
  return <div className={styles.body({ className })} ref={ref} {...props} />
}

export type DrawerFooterProps = DrawerSectionProps

Drawer.Footer = function DrawerFooter({
  className,
  ref,
  ...props
}: DrawerFooterProps) {
  const { styles } = useDrawerContext()
  return <div className={styles.footer({ className })} ref={ref} {...props} />
}

export type DrawerTitleProps = ComponentPropsWithoutRef<"h2"> & {
  ref?: Ref<HTMLHeadingElement>
}

Drawer.Title = function DrawerTitle({
  className,
  ref,
  ...props
}: DrawerTitleProps) {
  const { api, styles } = useDrawerContext()

  return (
    <h2
      {...mergeProps(api.getTitleProps(), props)}
      className={styles.title({ className })}
      ref={ref}
    />
  )
}

export type DrawerDescriptionProps = ComponentPropsWithoutRef<"p"> & {
  ref?: Ref<HTMLParagraphElement>
}

Drawer.Description = function DrawerDescription({
  className,
  ref,
  ...props
}: DrawerDescriptionProps) {
  const { api, styles } = useDrawerContext()

  return (
    <p
      {...mergeProps(api.getDescriptionProps(), props)}
      className={styles.description({ className })}
      ref={ref}
    />
  )
}

type DrawerIconCloseTriggerProps = Omit<ActionIconProps, "icon"> & {
  children?: undefined
  icon?: IconType
}

type DrawerTextCloseTriggerProps = ButtonProps & {
  children: NonNullable<ReactNode>
  ref?: Ref<HTMLButtonElement>
}

export type DrawerCloseTriggerProps =
  | DrawerIconCloseTriggerProps
  | DrawerTextCloseTriggerProps

Drawer.CloseTrigger = function DrawerCloseTrigger(
  props: DrawerCloseTriggerProps
) {
  const { api, styles } = useDrawerContext()
  const { onClick: onMachineClick, ...machineProps } =
    api.getCloseTriggerProps()

  if (props.children == null) {
    const {
      children: _children,
      className: iconClassName,
      icon: iconName = "token-icon-drawer-close",
      onClick: onIconClick,
      ref: iconRef,
      size: iconSize = "md",
      tone = "neutral",
      type: iconType = "button",
      ...iconProps
    } = props
    const mergedProps = mergeProps(iconProps, machineProps)

    return (
      <ActionIcon
        {...mergedProps}
        aria-label={mergedProps["aria-label"] ?? "Close drawer"}
        className={styles.closeTrigger({ className: iconClassName })}
        icon={iconName}
        onClick={(event) => {
          onIconClick?.(event)
          if (!event.defaultPrevented) {
            onMachineClick?.(event)
          }
        }}
        ref={iconRef}
        size={iconSize}
        tone={tone}
        type={iconType}
      />
    )
  }

  const {
    children,
    className,
    icon,
    onClick,
    ref,
    size = "current",
    theme = "unstyled",
    type = "button",
    ...buttonProps
  } = props
  const mergedProps = mergeProps(buttonProps, machineProps)

  return (
    <Button
      {...mergedProps}
      className={styles.closeTrigger({ className })}
      icon={icon}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          onMachineClick?.(event)
        }
      }}
      ref={ref}
      size={size}
      theme={theme}
      type={type}
    >
      {children}
    </Button>
  )
}

export type DrawerGrabberProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

Drawer.Grabber = function DrawerGrabber({
  className,
  ref,
  ...props
}: DrawerGrabberProps) {
  const { api, styles } = useDrawerContext()
  const mergedProps = mergeProps(api.getGrabberProps(), props)

  return (
    <div
      {...mergedProps}
      className={styles.grabber({ className })}
      data-swipe-direction={api.swipeDirection}
      ref={ref}
    />
  )
}

export type DrawerGrabberIndicatorProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

Drawer.GrabberIndicator = function DrawerGrabberIndicator({
  className,
  ref,
  ...props
}: DrawerGrabberIndicatorProps) {
  const { api, styles } = useDrawerContext()

  return (
    <div
      {...mergeProps(api.getGrabberIndicatorProps(), props)}
      className={styles.grabberIndicator({ className })}
      ref={ref}
    />
  )
}

export type DrawerSwipeAreaProps = ComponentPropsWithoutRef<"div"> &
  drawer.SwipeAreaProps & {
    ref?: Ref<HTMLDivElement>
  }

Drawer.SwipeArea = function DrawerSwipeArea({
  className,
  disabled,
  ref,
  swipeDirection,
  ...props
}: DrawerSwipeAreaProps) {
  const { api, styles } = useDrawerContext()

  return (
    <div
      {...mergeProps(
        api.getSwipeAreaProps({ disabled, swipeDirection }),
        props
      )}
      className={styles.swipeArea({ className })}
      ref={ref}
    />
  )
}

export type DrawerContextProps = {
  children: (api: DrawerApi) => ReactNode
}

Drawer.Context = function DrawerContext({ children }: DrawerContextProps) {
  return children(useDrawerContext().api)
}

export type DrawerStackProps = DrawerStackProviderProps

Drawer.Stack = DrawerStackProvider

export type DrawerIndentProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

Drawer.Indent = function DrawerIndent({
  className,
  ref,
  ...props
}: DrawerIndentProps) {
  const api = useDrawerStackContext()
  const { indent } = drawerVariants()

  return (
    <div
      {...mergeProps(api.getIndentProps(), props)}
      className={indent({ className })}
      ref={ref}
    />
  )
}

export type DrawerIndentBackgroundProps = DrawerIndentProps

Drawer.IndentBackground = function DrawerIndentBackground({
  className,
  ref,
  ...props
}: DrawerIndentBackgroundProps) {
  const api = useDrawerStackContext()
  const { indentBackground } = drawerVariants()

  return (
    <div
      {...mergeProps(api.getIndentBackgroundProps(), props)}
      className={indentBackground({ className })}
      ref={ref}
    />
  )
}

Drawer.displayName = "Drawer"

export type DrawerElementIds = drawer.ElementIds
export type DrawerFocusOutsideEvent = drawer.FocusOutsideEvent
export type DrawerInteractOutsideEvent = drawer.InteractOutsideEvent
export type DrawerOpenChangeDetails = drawer.OpenChangeDetails
export type DrawerPointerDownOutsideEvent = drawer.PointerDownOutsideEvent
export type DrawerResolvedSnapPoint = drawer.ResolvedSnapPoint
export type DrawerSnapPoint = drawer.SnapPoint
export type DrawerSnapPointChangeDetails = drawer.SnapPointChangeDetails
export type DrawerStack = drawer.DrawerStack
export type DrawerStackSnapshot = drawer.DrawerStackSnapshot
export type DrawerSwipeDirection = drawer.SwipeDirection
export type DrawerTriggerValueChangeDetails = drawer.TriggerValueChangeDetails
