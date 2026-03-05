import * as popover from "@zag-js/popover"
import { normalizeProps, Portal, useMachine } from "@zag-js/react"
import {
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useId,
  useRef,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { Button } from "../atoms/button"
import { tv } from "../utils"

const popoverVariants = tv({
  slots: {
    trigger: ["p-popover-trigger"],
    positioner: ["absolute"],
    content: [
      "bg-popover-bg",
      "text-popover-fg",
      "rounded-popover",
      "outline-none",
      "z-50",
    ],
    arrow: "",
    title: ["font-popover-title", "leading-none", "mb-popover-title-mb"],
    description: [
      "text-popover-description-fg text-popover-description-size",
      "leading-normal",
    ],
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
        arrow: "border-popover-border border-t border-l",
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
  },
})

export interface PopoverProps
  extends VariantProps<typeof popoverVariants>,
    popover.Props {
  trigger: ReactNode
  children: ReactNode
  placement?: popover.Placement
  offset?: popover.PositioningOptions["offset"]
  gutter?: popover.PositioningOptions["gutter"]
  flip?: popover.PositioningOptions["flip"]
  slide?: popover.PositioningOptions["slide"]
  sameWidth?: popover.PositioningOptions["sameWidth"]
  overflowPadding?: popover.PositioningOptions["overflowPadding"]
  showArrow?: boolean
  title?: ReactNode
  description?: ReactNode
  triggerRef?: Ref<HTMLButtonElement>
  contentRef?: Ref<HTMLDivElement>
  triggerClassName?: string
  contentClassName?: string
  disabled?: boolean
  openOnHover?: boolean
  hoverOpenDelay?: number
  hoverCloseDelay?: number
}

export function Popover({
  trigger,
  children,
  open,
  defaultOpen,
  onOpenChange,
  placement = "bottom",
  offset = { mainAxis: 8, crossAxis: 0 },
  gutter = 8,
  sameWidth = false,
  slide = true,
  flip = true,
  overflowPadding = 8,
  modal = false,
  closeOnInteractOutside = true,
  closeOnEscape = true,
  showArrow = true,
  autoFocus = true,
  portalled = true,
  title,
  description,
  id,
  triggerRef,
  contentRef,
  triggerClassName,
  contentClassName,
  size = "md",
  shadow = true,
  border = true,
  disabled = false,
  openOnHover = false,
  hoverOpenDelay = 0,
  hoverCloseDelay = 120,
  onPointerDownOutside,
}: PopoverProps) {
  const generatedId = useId()
  const uniqueId = id || generatedId
  const hoverOpenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const hoverCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const service = useMachine(popover.machine, {
    id: uniqueId,
    open,
    defaultOpen,
    dir: "ltr",
    positioning: {
      placement,
      offset,
      gutter,
      sameWidth,
      slide,
      flip,
      overflowPadding,
    },
    // Behavior
    modal,
    closeOnInteractOutside,
    closeOnEscape,
    autoFocus,
    portalled,
    // Callbacks
    onOpenChange,
    onPointerDownOutside,
  })

  const api = popover.connect(service as popover.Service, normalizeProps)

  const clearHoverTimeouts = useCallback(() => {
    if (hoverOpenTimeoutRef.current) {
      clearTimeout(hoverOpenTimeoutRef.current)
      hoverOpenTimeoutRef.current = null
    }

    if (hoverCloseTimeoutRef.current) {
      clearTimeout(hoverCloseTimeoutRef.current)
      hoverCloseTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      clearHoverTimeouts()
    }
  }, [clearHoverTimeouts])

  const scheduleHoverOpen = useCallback(() => {
    if (!openOnHover) {
      return
    }

    clearHoverTimeouts()
    hoverOpenTimeoutRef.current = setTimeout(() => {
      api.setOpen(true)
    }, hoverOpenDelay)
  }, [api, clearHoverTimeouts, hoverOpenDelay, openOnHover])

  const scheduleHoverClose = useCallback(() => {
    if (!openOnHover) {
      return
    }

    clearHoverTimeouts()
    hoverCloseTimeoutRef.current = setTimeout(() => {
      api.setOpen(false)
    }, hoverCloseDelay)
  }, [api, clearHoverTimeouts, hoverCloseDelay, openOnHover])

  const {
    trigger: triggerStyles,
    positioner,
    content: contentStyles,
    arrow,
    title: titleStyles,
    description: descriptionStyles,
  } = popoverVariants({ size, shadow, border })

  const triggerProps = api.getTriggerProps()
  const contentProps = api.getContentProps()

  const renderContent = () => (
    <div {...api.getPositionerProps()} className={positioner()}>
      <div
        {...contentProps}
        className={contentStyles({ className: contentClassName })}
        data-side={placement.split("-")[0]}
        data-state={api.open ? "open" : "closed"}
        ref={contentRef}
        onPointerEnter={(event) => {
          contentProps.onPointerEnter?.(event)

          if (!openOnHover || event.pointerType !== "mouse") {
            return
          }

          clearHoverTimeouts()
        }}
        onPointerLeave={(event) => {
          contentProps.onPointerLeave?.(event)

          if (event.pointerType !== "mouse") {
            return
          }

          scheduleHoverClose()
        }}
      >
        {showArrow && (
          <div {...api.getArrowProps()}>
            <div {...api.getArrowTipProps()} className={arrow()} />
          </div>
        )}

        {title && (
          <div {...api.getTitleProps()} className={titleStyles()}>
            {title}
          </div>
        )}
        {description && (
          <div {...api.getDescriptionProps()} className={descriptionStyles()}>
            {description}
          </div>
        )}
        {children}
      </div>
    </div>
  )

  return (
    <>
      <Button
        disabled={disabled}
        theme="borderless"
        {...triggerProps}
        className={triggerStyles({ className: triggerClassName })}
        data-state={api.open ? "open" : "closed"}
        ref={triggerRef}
        onPointerEnter={(event) => {
          triggerProps.onPointerEnter?.(event)

          if (event.pointerType !== "mouse") {
            return
          }

          scheduleHoverOpen()
        }}
        onPointerLeave={(event) => {
          triggerProps.onPointerLeave?.(event)

          if (event.pointerType !== "mouse") {
            return
          }

          scheduleHoverClose()
        }}
        onFocus={(event) => {
          triggerProps.onFocus?.(event)
          clearHoverTimeouts()
        }}
      >
        {trigger}
      </Button>

      {portalled ? (
        <Portal>{api.open && renderContent()}</Portal>
      ) : (
        api.open && renderContent()
      )}
    </>
  )
}
