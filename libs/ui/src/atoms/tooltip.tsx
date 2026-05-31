import { normalizeProps, Portal, useMachine } from "@zag-js/react"
import * as tooltip from "@zag-js/tooltip"
import { type ReactNode, type Ref, useId } from "react"
import { tv, type VariantProps } from "tailwind-variants"

const tooltipVariants = tv({
  slots: {
    trigger: ["inline-flex"],
    content: [
      "[--arrow-size:var(--tooltip-arrow-size)]",
      "[--arrow-background:var(--tooltip-arrow-background)]",
      "bg-tooltip-bg",
      "rounded-tooltip",
    ],
    positioner: ["relative"],
    arrow: "",
  },
  variants: {
    variant: {
      default: {},
      outline: {
        content: "border border-tooltip-border-outline",
        arrow: "border-tooltip-border-outline border-s border-t",
      },
    },
    size: {
      sm: {
        content: "p-tooltip-sm text-tooltip-sm",
      },
      md: {
        content: "p-tooltip-md text-tooltip-md",
      },
      lg: {
        content: "p-tooltip-lg text-tooltip-lg",
      },
    },
  },
  defaultVariants: {
    size: "md",
    variant: "default",
  },
})

export interface TooltipProps
  extends VariantProps<typeof tooltipVariants>,
    Partial<tooltip.Props>,
    Partial<tooltip.PositioningOptions> {
  ref?: Ref<HTMLSpanElement>
  content: ReactNode
  children: ReactNode
  className?: string
}

export function Tooltip({
  content,
  children,
  className,
  ref,
  size,
  variant,

  id: MRAId,
  dir = "ltr",
  openDelay = 200,
  closeDelay = 200,
  interactive = true,
  defaultOpen,
  open,
  onOpenChange,
  disabled,
  closeOnEscape = true,
  closeOnPointerDown,
  closeOnScroll,
  closeOnClick,

  placement,
  offset = { mainAxis: 16, crossAxis: 0 },
  gutter,
  flip,
  sameWidth,
  boundary,
  listeners,
  strategy,
}: TooltipProps) {
  const generatedId = useId()
  const id = MRAId || generatedId

  const service = useMachine(tooltip.machine, {
    id,
    dir,
    open,
    defaultOpen,
    disabled,

    openDelay,
    closeDelay,
    interactive,
    closeOnPointerDown,
    closeOnEscape,
    closeOnScroll,
    closeOnClick,

    onOpenChange,

    positioning: {
      placement,
      offset,
      gutter,
      flip,
      sameWidth,
      boundary,
      listeners,
      strategy,
    },
  })

  const api = tooltip.connect(service as tooltip.Service, normalizeProps)
  const {
    trigger,
    positioner,
    content: contentSlot,
    arrow,
  } = tooltipVariants({
    variant,
    size,
  })

  const triggerProps = api.getTriggerProps()
  // Exclude onBeforeInput: incompatible with span elements in React 19.2+
  const { onBeforeInput, ...spanCompatibleProps } = triggerProps

  return (
    <>
      <span {...spanCompatibleProps} className={trigger()} ref={ref}>
        {children}
      </span>
      <Portal>
        {api.open && (
          <div {...api.getPositionerProps()} className={positioner()}>
            <div
              {...api.getContentProps()}
              className={contentSlot({ className })}
            >
              <div {...api.getArrowProps()}>
                <div {...api.getArrowTipProps()} className={arrow()} />
              </div>
              {content}
            </div>
          </div>
        )}
      </Portal>
    </>
  )
}

Tooltip.displayName = "Tooltip"
