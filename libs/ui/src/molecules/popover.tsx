import {
  connect,
  machine,
  type Api as PopoverApi,
  type Props as PopoverMachineProps,
  type Placement as PopoverPlacement,
  type PositioningOptions as PopoverPositioningOptions,
  type Service as PopoverService,
} from "@zag-js/popover"
import { mergeProps, normalizeProps, Portal, useMachine } from "@zag-js/react"
import {
  type ComponentPropsWithoutRef,
  createContext,
  type ReactNode,
  type Ref,
  useContext,
  useEffect,
  useId,
  useRef,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { Button, type ButtonProps } from "../atoms/button"
import { tv } from "../utils"

const popoverVariants = tv({
  slots: {
    trigger: ["p-popover-trigger"],
    indicator: ["data-[state=open]:rotate-180"],
    positioner: ["absolute"],
    content: [
      "bg-popover-bg",
      "text-popover-fg",
      "rounded-popover",
      "outline-none",
      "z-50",
      "relative",
    ],
    arrow: "",
    arrowTip: "",
    title: ["font-popover-title", "leading-none", "mb-popover-title-mb"],
    description: [
      "text-popover-description-fg text-popover-description-size",
      "leading-normal",
    ],
    closeTrigger: ["absolute top-2 right-2", "text-popover-close-trigger-fg"],
  },
  variants: {
    shadow: {
      true: {
        content: "shadow-popover",
      },
    },
    border: {
      true: {
        content: "border border-popover-border",
        arrowTip: "border-popover-border border-t border-l",
      },
    },
    size: {
      sm: {
        content: "p-popover-sm text-sm",
        title: "text-popover-title-sm",
      },
      md: {
        content: "p-popover-md",
        title: "text-popover-title-md",
      },
      lg: {
        content: "p-popover-lg text-lg",
        title: "text-popover-title-lg",
      },
    },
  },
  defaultVariants: {
    size: "md",
    shadow: true,
    border: true,
  },
})

type PopoverContextValue = {
  api: PopoverApi
  clearHoverTimeouts: () => void
  openOnHover: boolean
  placement: PopoverPlacement
  scheduleHoverClose: () => void
  scheduleHoverOpen: () => void
  styles: ReturnType<typeof popoverVariants>
}

const PopoverContext = createContext<PopoverContextValue | null>(null)

function usePopoverContext() {
  const context = useContext(PopoverContext)

  if (!context) {
    throw new Error("Popover components must be used within Popover.Root")
  }

  return context
}

export type PopoverRootProps = VariantProps<typeof popoverVariants> &
  Omit<PopoverMachineProps, "positioning"> & {
    children: ReactNode
    flip?: PopoverPositioningOptions["flip"]
    gutter?: PopoverPositioningOptions["gutter"]
    hoverCloseDelay?: number
    hoverOpenDelay?: number
    offset?: PopoverPositioningOptions["offset"]
    openOnHover?: boolean
    overflowPadding?: PopoverPositioningOptions["overflowPadding"]
    placement?: PopoverPlacement
    sameWidth?: PopoverPositioningOptions["sameWidth"]
    slide?: PopoverPositioningOptions["slide"]
  }

export function Popover({
  autoFocus = true,
  border,
  children,
  closeOnEscape = true,
  closeOnInteractOutside = true,
  defaultOpen,
  dir = "ltr",
  flip = true,
  gutter = 8,
  hoverCloseDelay = 120,
  hoverOpenDelay = 0,
  id,
  modal = false,
  offset = { mainAxis: 8, crossAxis: 0 },
  onOpenChange,
  onPointerDownOutside,
  open,
  openOnHover = false,
  overflowPadding = 8,
  placement = "bottom",
  portalled = true,
  sameWidth = false,
  shadow,
  size,
  slide = true,
  ...props
}: PopoverRootProps) {
  const generatedId = useId()
  const uniqueId = id || generatedId
  const hoverOpenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const service = useMachine(machine, {
    ...props,
    autoFocus,
    closeOnEscape,
    closeOnInteractOutside,
    defaultOpen,
    dir,
    id: uniqueId,
    modal,
    onOpenChange,
    onPointerDownOutside,
    open,
    portalled,
    positioning: {
      flip,
      gutter,
      offset,
      overflowPadding,
      placement,
      sameWidth,
      slide,
    },
  })

  const api = connect(service as PopoverService, normalizeProps)
  const styles = popoverVariants({ border, shadow, size })

  const clearHoverTimeouts = () => {
    if (hoverOpenTimeoutRef.current) {
      clearTimeout(hoverOpenTimeoutRef.current)
      hoverOpenTimeoutRef.current = null
    }

    if (hoverCloseTimeoutRef.current) {
      clearTimeout(hoverCloseTimeoutRef.current)
      hoverCloseTimeoutRef.current = null
    }
  }

  const scheduleHoverOpen = () => {
    if (!openOnHover) {
      return
    }

    clearHoverTimeouts()
    hoverOpenTimeoutRef.current = setTimeout(() => {
      api.setOpen(true)
    }, hoverOpenDelay)
  }

  const scheduleHoverClose = () => {
    if (!openOnHover) {
      return
    }

    clearHoverTimeouts()
    hoverCloseTimeoutRef.current = setTimeout(() => {
      api.setOpen(false)
    }, hoverCloseDelay)
  }

  useEffect(
    () => () => {
      if (hoverOpenTimeoutRef.current) {
        clearTimeout(hoverOpenTimeoutRef.current)
      }

      if (hoverCloseTimeoutRef.current) {
        clearTimeout(hoverCloseTimeoutRef.current)
      }
    },
    []
  )

  return (
    <PopoverContext.Provider
      value={{
        api,
        clearHoverTimeouts,
        openOnHover,
        placement,
        scheduleHoverClose,
        scheduleHoverOpen,
        styles,
      }}
    >
      {children}
    </PopoverContext.Provider>
  )
}

export type PopoverAnchorProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

Popover.Anchor = function PopoverAnchor({
  className,
  ref,
  ...props
}: PopoverAnchorProps) {
  const { api } = usePopoverContext()
  const anchorProps = mergeProps(props, api.getAnchorProps())

  return <div className={className} ref={ref} {...anchorProps} />
}

export type PopoverTriggerProps = ButtonProps & {
  clickBehavior?: "toggle" | "manual"
  ref?: Ref<HTMLButtonElement>
}

Popover.Trigger = function PopoverTrigger({
  children,
  className,
  clickBehavior = "toggle",
  disabled,
  onClick,
  onFocus,
  onPointerEnter,
  onPointerLeave,
  ref,
  size = "current",
  theme = "borderless",
  type = "button",
  ...props
}: PopoverTriggerProps) {
  const {
    api,
    clearHoverTimeouts,
    openOnHover,
    scheduleHoverClose,
    scheduleHoverOpen,
    styles,
  } = usePopoverContext()
  const {
    disabled: machineDisabled,
    onClick: onMachineClick,
    onFocus: onMachineFocus,
    onPointerEnter: onMachinePointerEnter,
    onPointerLeave: onMachinePointerLeave,
    ...machineTriggerProps
  } = api.getTriggerProps() as ComponentPropsWithoutRef<"button">
  const buttonProps = mergeProps(props, machineTriggerProps)
  const isDisabled = Boolean(disabled || machineDisabled)

  return (
    <Button
      {...buttonProps}
      className={styles.trigger({ className })}
      data-state={api.open ? "open" : "closed"}
      disabled={isDisabled}
      onClick={(event) => {
        onClick?.(event)

        if (!event.defaultPrevented && clickBehavior === "toggle") {
          onMachineClick?.(event)
        }
      }}
      onFocus={(event) => {
        onFocus?.(event)

        if (!event.defaultPrevented) {
          onMachineFocus?.(event)
          clearHoverTimeouts()
        }
      }}
      onPointerEnter={(event) => {
        onPointerEnter?.(event)

        if (!event.defaultPrevented) {
          onMachinePointerEnter?.(event)
        }

        if (
          event.defaultPrevented ||
          !openOnHover ||
          event.pointerType !== "mouse"
        ) {
          return
        }

        scheduleHoverOpen()
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event)

        if (!event.defaultPrevented) {
          onMachinePointerLeave?.(event)
        }

        if (
          event.defaultPrevented ||
          !openOnHover ||
          event.pointerType !== "mouse"
        ) {
          return
        }

        scheduleHoverClose()
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

export type PopoverIndicatorProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement>
}

Popover.Indicator = function PopoverIndicator({
  className,
  ref,
  ...props
}: PopoverIndicatorProps) {
  const { api, styles } = usePopoverContext()
  const indicatorProps = mergeProps(props, api.getIndicatorProps())

  return (
    <span
      className={styles.indicator({ className })}
      data-state={api.open ? "open" : "closed"}
      ref={ref}
      {...indicatorProps}
    />
  )
}

export type PopoverPositionerProps = ComponentPropsWithoutRef<"div"> & {
  forceMount?: boolean
  ref?: Ref<HTMLDivElement>
}

Popover.Positioner = function PopoverPositioner({
  children,
  className,
  forceMount = false,
  ref,
  ...props
}: PopoverPositionerProps) {
  const { api, styles } = usePopoverContext()

  if (!(api.open || forceMount)) {
    return null
  }

  const positionerProps = mergeProps(props, api.getPositionerProps())
  const positionerNode = (
    <div
      className={styles.positioner({ className })}
      ref={ref}
      {...positionerProps}
    >
      {children}
    </div>
  )

  return api.portalled ? <Portal>{positionerNode}</Portal> : positionerNode
}

export type PopoverContentProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

Popover.Content = function PopoverContent({
  children,
  className,
  onPointerEnter,
  onPointerLeave,
  ref,
  ...props
}: PopoverContentProps) {
  const {
    api,
    clearHoverTimeouts,
    openOnHover,
    placement,
    scheduleHoverClose,
    styles,
  } = usePopoverContext()
  const {
    onPointerEnter: onMachinePointerEnter,
    onPointerLeave: onMachinePointerLeave,
    ...machineContentProps
  } = api.getContentProps() as ComponentPropsWithoutRef<"div">
  const contentProps = mergeProps(props, machineContentProps)

  return (
    <div
      {...contentProps}
      className={styles.content({ className })}
      data-side={placement.split("-")[0]}
      data-state={api.open ? "open" : "closed"}
      onPointerEnter={(event) => {
        onPointerEnter?.(event)

        if (!event.defaultPrevented) {
          onMachinePointerEnter?.(event)
        }

        if (
          event.defaultPrevented ||
          !openOnHover ||
          event.pointerType !== "mouse"
        ) {
          return
        }

        clearHoverTimeouts()
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event)

        if (!event.defaultPrevented) {
          onMachinePointerLeave?.(event)
        }

        if (
          event.defaultPrevented ||
          !openOnHover ||
          event.pointerType !== "mouse"
        ) {
          return
        }

        scheduleHoverClose()
      }}
      ref={ref}
    >
      {children}
    </div>
  )
}

export type PopoverArrowProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

Popover.Arrow = function PopoverArrow({
  children,
  className,
  ref,
  ...props
}: PopoverArrowProps) {
  const { api, styles } = usePopoverContext()
  const arrowProps = mergeProps(props, api.getArrowProps())

  return (
    <div className={styles.arrow({ className })} ref={ref} {...arrowProps}>
      {children ?? <Popover.ArrowTip />}
    </div>
  )
}

export type PopoverArrowTipProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

Popover.ArrowTip = function PopoverArrowTip({
  className,
  ref,
  ...props
}: PopoverArrowTipProps) {
  const { api, styles } = usePopoverContext()
  const arrowTipProps = mergeProps(props, api.getArrowTipProps())

  return (
    <div
      className={styles.arrowTip({ className })}
      ref={ref}
      {...arrowTipProps}
    />
  )
}

export type PopoverTitleProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

Popover.Title = function PopoverTitle({
  className,
  ref,
  ...props
}: PopoverTitleProps) {
  const { api, styles } = usePopoverContext()
  const titleProps = mergeProps(props, api.getTitleProps())

  return (
    <div className={styles.title({ className })} ref={ref} {...titleProps} />
  )
}

export type PopoverDescriptionProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

Popover.Description = function PopoverDescription({
  className,
  ref,
  ...props
}: PopoverDescriptionProps) {
  const { api, styles } = usePopoverContext()
  const descriptionProps = mergeProps(props, api.getDescriptionProps())

  return (
    <div
      className={styles.description({ className })}
      ref={ref}
      {...descriptionProps}
    />
  )
}

export type PopoverCloseTriggerProps = ButtonProps & {
  ref?: Ref<HTMLButtonElement>
}

Popover.CloseTrigger = function PopoverCloseTrigger({
  children,
  className,
  icon,
  onClick,
  ref,
  size = "current",
  theme = "unstyled",
  type = "button",
  ...props
}: PopoverCloseTriggerProps) {
  const { api, styles } = usePopoverContext()
  const { onClick: onMachineClick, ...machineCloseTriggerProps } =
    api.getCloseTriggerProps() as ComponentPropsWithoutRef<"button">
  const buttonProps = mergeProps(props, machineCloseTriggerProps)
  const closeIcon = icon ?? (children ? undefined : "token-icon-close")

  return (
    <Button
      {...buttonProps}
      aria-label={children ? undefined : "Close popover"}
      className={styles.closeTrigger({ className })}
      icon={closeIcon}
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

export type PopoverContextProps = {
  children: (api: PopoverApi) => ReactNode
}

Popover.Context = function PopoverApiContext({
  children,
}: PopoverContextProps) {
  const { api } = usePopoverContext()

  return children(api)
}

Popover.Root = Popover
Popover.displayName = "Popover"
