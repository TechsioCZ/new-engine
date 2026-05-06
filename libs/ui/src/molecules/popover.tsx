import * as popover from "@zag-js/popover"
import { normalizeProps, Portal, useMachine } from "@zag-js/react"
<<<<<<< Updated upstream
import { type ReactNode, type Ref, useId } from "react"
=======
import {
  type MouseEventHandler,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useId,
  useRef,
} from "react"
>>>>>>> Stashed changes
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
      "relative",
    ],
    arrow: "",
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
  showCloseButton?: boolean
  title?: ReactNode
  description?: ReactNode
  triggerRef?: Ref<HTMLButtonElement>
  contentRef?: Ref<HTMLDivElement>
  triggerClassName?: string
  onTriggerClick?: MouseEventHandler<HTMLButtonElement>
  contentClassName?: string
  disabled?: boolean
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
  showCloseButton = false,
  autoFocus = true,
  portalled = true,
  title,
  description,
  id,
  triggerRef,
  contentRef,
  triggerClassName,
  onTriggerClick,
  contentClassName,
  size = "md",
  shadow = true,
  border = true,
  disabled = false,
  onPointerDownOutside,
}: PopoverProps) {
  const generatedId = useId()
  const uniqueId = id || generatedId

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

  const {
    trigger: triggerStyles,
    positioner,
    content: contentStyles,
    arrow,
    title: titleStyles,
    description: descriptionStyles,
    closeTrigger: closeTriggerStyles,
  } = popoverVariants({ size, shadow, border })

  const renderContent = () => (
    <div {...api.getPositionerProps()} className={positioner()}>
      <div
        {...api.getContentProps()}
        className={contentStyles({ className: contentClassName })}
        data-side={placement.split("-")[0]}
        data-state={api.open ? "open" : "closed"}
        ref={contentRef}
      >
        {showCloseButton && (
          <Button
            {...api.getCloseTriggerProps()}
            aria-label="Close popover"
            className={closeTriggerStyles()}
            icon="token-icon-close"
            size="current"
            theme="unstyled"
          />
        )}
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
        {...api.getTriggerProps()}
        className={triggerStyles({ className: triggerClassName })}
        data-state={api.open ? "open" : "closed"}
        ref={triggerRef}
<<<<<<< Updated upstream
=======
        onClick={(e) => {
          onTriggerClick?.(e)

          if (e.defaultPrevented) {
            return
          }

          if(!openOnHover || !onTriggerClick) {
            triggerProps.onClick?.(e)
          }
        }}
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
>>>>>>> Stashed changes
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
