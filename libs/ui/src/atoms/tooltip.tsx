/**
 * Tooltip — @techsio/ui-kit atom.
 *
 * @component Tooltip
 * @componentVersion v1.1.0
 * @skill tooltip-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the tooltip-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { normalizeProps, useMachine } from "@zag-js/react"
import {
  connect,
  machine,
  type PositioningOptions,
  splitProps,
  type Props as TooltipMachineProps,
} from "@zag-js/tooltip"
import {
  Children,
  cloneElement,
  Fragment,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
  type Ref,
  useEffect,
  useId,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { joinDescribedBy } from "../internal/described-by"
import { OverlayPortal as Portal } from "../molecules/dialog"
import { tv } from "../utils"

const tooltipVariants = tv({
  slots: {
    trigger: ["inline-flex"],
    content: [
      "tooltip-surface",
      "popup-layer",
      "text-tooltip-fg",
      "shadow-tooltip",
      "bg-tooltip-bg",
      "rounded-tooltip",
    ],
    positioner: ["relative", "popup-layer"],
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

export type TooltipProps = VariantProps<typeof tooltipVariants> &
  Partial<TooltipMachineProps> &
  Partial<PositioningOptions> & {
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

    const props = {
      "aria-describedby": joinDescribedBy(
        child.props["aria-describedby"],
        describedBy
      ),
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

  ...props
}: TooltipProps) {
  const generatedId = useId()
  const [machineProps, positioningProps] = splitProps(props)
  const service = useMachine(machine, {
    openDelay: 200,
    closeDelay: 200,
    interactive: true,
    ...machineProps,
    id: machineProps.id ?? generatedId,
    // Tooltip isn't a Zag dismissable layer. Consume Escape before the
    // document-level modal listener so it only dismisses this hint.
    closeOnEscape: false,
    positioning: {
      offset: { mainAxis: 16, crossAxis: 0 },
      ...positioningProps,
      ...machineProps.positioning,
    },
  })

  const api = connect(service, normalizeProps)
  useEffect(() => {
    if (!api.open || machineProps.closeOnEscape === false) {
      return
    }
    const root = machineProps.getRootNode?.() ?? document
    const doc = root.nodeType === 9 ? (root as Document) : root.ownerDocument
    const lookupRoot = root.nodeType === 11 ? (root as ShadowRoot) : doc
    // Zag listens on document in capture phase. Window capture runs first,
    // regardless of when the parent modal registered its listener.
    const eventTarget = doc?.defaultView ?? root
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        event.isComposing ||
        event.defaultPrevented
      ) {
        return
      }
      const triggerProps = api.getTriggerProps()
      const contentId = triggerProps["aria-describedby"]
      const contentElement = contentId
        ? lookupRoot?.getElementById(contentId)
        : null
      if (contentElement?.closest('[aria-hidden="true"], [inert]')) {
        return
      }
      const triggerElement = triggerProps.id
        ? lookupRoot?.getElementById(triggerProps.id)
        : null
      // A focused managed popup owns Escape before an unrelated hint. Tooltip
      // portals may be siblings of their trigger's layer, so check both nodes.
      // Zag publishes --layer-index only while a dismissable layer is active.
      const focusedElement = event
        .composedPath()
        .find(
          (node): node is HTMLElement =>
            node instanceof (doc?.defaultView?.HTMLElement ?? HTMLElement)
        )
      const focusedLayer = focusedElement?.closest<HTMLElement>(
        '[data-scope][data-part="content"][style*="--layer-index"]'
      )
      if (
        focusedLayer &&
        !focusedLayer.contains(triggerElement ?? null) &&
        !focusedLayer.contains(contentElement ?? null)
      ) {
        return
      }
      event.preventDefault()
      event.stopImmediatePropagation()
      api.setOpen(false)
    }
    eventTarget.addEventListener("keydown", onEscape as EventListener, true)
    return () =>
      eventTarget.removeEventListener(
        "keydown",
        onEscape as EventListener,
        true
      )
  }, [
    api.open,
    api.setOpen,
    api.getTriggerProps,
    machineProps.closeOnEscape,
    machineProps.getRootNode,
  ])
  // Zag types trigger props for a button; the inline trigger is a span wrapper.
  const triggerProps =
    api.getTriggerProps() as unknown as HTMLAttributes<HTMLSpanElement>
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
      <Portal getRootNode={machineProps.getRootNode}>
        {api.open && (
          <div {...api.getPositionerProps()} className={positioner()}>
            <div
              {...api.getContentProps()}
              aria-label={machineProps["aria-label"]}
              className={contentSlot({ className })}
              id={triggerProps["aria-describedby"]}
              role="tooltip"
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
