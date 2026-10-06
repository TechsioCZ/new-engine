/**
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
import { normalizeProps, Portal, useMachine } from "@zag-js/react"
import * as tooltip from "@zag-js/tooltip"
import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  type ReactNode,
  type Ref,
  useId,
} from "react"
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

function describeTooltipChildren(
  children: ReactNode,
  describedBy: string | undefined
): ReactNode {
  return Children.map(children, (child) => {
    if (
      !isValidElement<{
        children?: ReactNode
        "aria-describedby"?: string
      }>(child)
    ) {
      return child
    }

    if (child.type === Fragment) {
      return cloneElement(
        child,
        {},
        describeTooltipChildren(child.props.children, describedBy)
      )
    }

    const ids = [child.props["aria-describedby"], describedBy].flatMap(
      (value) => value?.split(/\s+/).filter(Boolean) ?? []
    )
    const props = {
      "aria-describedby": [...new Set(ids)].join(" ") || undefined,
    }

    return typeof child.type === "string" && child.props.children !== undefined
      ? cloneElement(
          child,
          props,
          describeTooltipChildren(child.props.children, describedBy)
        )
      : cloneElement(child, props)
  })
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

  const api = tooltip.connect(service, normalizeProps)
  const triggerProps = api.getTriggerProps()
  const {
    trigger,
    positioner,
    content: contentSlot,
    arrow,
  } = tooltipVariants({
    variant,
    size,
  })

  return (
    <>
      <span {...triggerProps} className={trigger()} ref={ref}>
        {describeTooltipChildren(children, triggerProps["aria-describedby"])}
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
