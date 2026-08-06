/*
 * Tooltip — @techsio/ui-kit atom.
 *
 * @component Tooltip
 * @componentVersion v1.0.1
 * @skill tooltip-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the tooltip-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { omitKeys } from "@techsio/std/object"
import { normalizeProps, Portal, useMachine } from "@zag-js/react"
import {
  connect as connectTooltip,
  machine as tooltipMachine,
} from "@zag-js/tooltip"
import type {
  PositioningOptions as TooltipPositioningOptions,
  Props as TooltipMachineProps,
} from "@zag-js/tooltip"
import { useId } from "react"
import type { ReactNode, Ref } from "react"
import { tv } from "tailwind-variants"
import type { VariantProps } from "tailwind-variants"

const tooltipVariants = tv({
  defaultVariants: {
    size: "md",
    variant: "default",
  },
  slots: {
    arrow: "",
    content: [
      "[--arrow-size:var(--tooltip-arrow-size)]",
      "[--arrow-background:var(--tooltip-arrow-background)]",
      "bg-tooltip-bg",
      "rounded-tooltip",
    ],
    positioner: ["relative"],
    trigger: ["inline-flex"],
  },
  variants: {
    size: {
      lg: {
        content: "p-tooltip-lg text-tooltip-lg",
      },
      md: {
        content: "p-tooltip-md text-tooltip-md",
      },
      sm: {
        content: "p-tooltip-sm text-tooltip-sm",
      },
    },
    variant: {
      default: {},
      outline: {
        arrow: "border-tooltip-border-outline border-s border-t",
        content: "border border-tooltip-border-outline",
      },
    },
  },
})

const defaultTooltipOffset: NonNullable<TooltipPositioningOptions["offset"]> = {
  crossAxis: 0,
  mainAxis: 16,
}

export interface TooltipProps
  extends
    VariantProps<typeof tooltipVariants>,
    Partial<TooltipMachineProps>,
    Partial<TooltipPositioningOptions> {
  ref?: Ref<HTMLSpanElement> | undefined
  content: ReactNode
  children: ReactNode
  className?: string | undefined
}

export const Tooltip = ({
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
  offset = defaultTooltipOffset,
  gutter,
  flip,
  sameWidth,
  boundary,
  listeners,
  strategy,
}: TooltipProps) => {
  const generatedId = useId()
  const id = MRAId === undefined || MRAId === "" ? generatedId : MRAId

  const service = useMachine(tooltipMachine, {
    closeDelay,
    closeOnEscape,
    dir,
    id,
    interactive,
    openDelay,
    ...(closeOnClick !== undefined && { closeOnClick }),
    ...(closeOnPointerDown !== undefined && { closeOnPointerDown }),
    ...(closeOnScroll !== undefined && { closeOnScroll }),
    ...(defaultOpen !== undefined && { defaultOpen }),
    ...(disabled !== undefined && { disabled }),
    ...(onOpenChange !== undefined && { onOpenChange }),
    ...(open !== undefined && { open }),

    positioning: {
      boundary,
      flip,
      gutter,
      listeners,
      offset,
      placement,
      sameWidth,
      strategy,
    },
  })

  const api = connectTooltip(service, normalizeProps)
  const {
    trigger,
    positioner,
    content: contentSlot,
    arrow,
  } = tooltipVariants({
    size,
    variant,
  })

  // Exclude onBeforeInput: incompatible with span elements in React 19.2+
  const spanCompatibleProps = omitKeys(api.getTriggerProps(), ["onBeforeInput"])

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
