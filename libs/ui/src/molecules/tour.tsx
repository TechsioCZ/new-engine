/**
 * Tour — @techsio/ui-kit molecule.
 *
 * @component Tour
 * @componentVersion v1.0.2
 * @skill tour-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 */
import {
  mergeProps,
  normalizeProps,
  Portal,
  type PropTypes,
  useMachine,
} from "@zag-js/react"
import {
  type Api,
  connect,
  machine,
  type Props,
  type Service,
  type StepActionFn,
  type StepActionType,
  type StepDetails,
} from "@zag-js/tour"
import {
  type ComponentPropsWithoutRef,
  createContext,
  type KeyboardEventHandler,
  type ReactNode,
  type Ref,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
} from "react"
import { ActionIcon, type ActionIconProps } from "../atoms/action-icon"
import { Button, type ButtonProps } from "../atoms/button"
import { tv } from "../utils"

const tourStyles = tv({
  slots: {
    backdrop: "tour-layer bg-tour-backdrop-bg",
    spotlight: "tour-layer tour-spotlight-border",
    positioner: "tour-layer tour-positioner",
    content:
      "tour-layer tour-content tour-border relative flex flex-col gap-tour-content rounded-tour bg-tour-bg p-tour text-tour-fg shadow-tour outline-none",
    arrow: "tour-arrow",
    arrowTip: "bg-tour-arrow-bg",
    title: "pe-tour-title font-tour-title text-tour-title-size",
    description: "text-tour-body-size text-tour-description-fg",
    progressText: "text-tour-progress-fg text-tour-progress-size",
    actions:
      "flex flex-wrap items-center justify-end gap-tour-actions pt-tour-actions",
    closeTrigger: "absolute end-tour-close top-tour-close",
  },
})

export type TourStep = Omit<StepDetails, "title" | "description"> & {
  title: ReactNode
  description: ReactNode
}

export type TourAction = StepActionType | StepActionFn
export type TourApi = Omit<
  Api<PropTypes>,
  "step" | "addStep" | "updateStep" | "setSteps"
> & {
  step: TourStep | null
  addStep: (step: TourStep) => void
  updateStep: (id: string, step: Partial<TourStep>) => void
  setSteps: (steps: TourStep[]) => void
}

type TourContextValue = TourApi & { isRunning: boolean }

const TourContext = createContext<TourContextValue | null>(null)
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect

function useTourContext() {
  const api = useContext(TourContext)
  if (!api) {
    throw new Error("Tour components must be used within Tour.Root")
  }
  return api
}

export type TourRootProps = Omit<Props, "id" | "steps" | "stepId"> & {
  children: ReactNode
  id?: string
  /** Initial steps. Use the context API's setSteps to replace a running tour. */
  steps: TourStep[]
}

export function Tour({
  children,
  getRootNode,
  id,
  onStatusChange,
  steps,
  ...props
}: TourRootProps) {
  const generatedId = useId()
  const previousFocus = useRef<HTMLElement | null>(null)
  const effectCleanup = useRef<(() => void) | undefined>(undefined)
  const service: Service = useMachine(machine, {
    ...props,
    // Zag 1.43.3 unconditionally clears inert for existing targets and skips
    // late targets. Own both paths below so cleanup preserves application writes.
    preventInteraction: false,
    getRootNode,
    id: id ?? generatedId,
    steps: steps.map(prepareStep),
    onStatusChange(details) {
      if (details.status === "not-found") {
        effectCleanup.current?.()
      }
      if (details.status === "started") {
        const rootNode = getRootNode?.() ?? document
        const activeElement =
          "activeElement" in rootNode
            ? rootNode.activeElement
            : rootNode.ownerDocument?.activeElement
        previousFocus.current =
          activeElement instanceof HTMLElement ? activeElement : null
      } else if (details.status !== "idle") {
        // Zag 1.43.3 intentionally disables focus return between steps. Restore
        // only when the entire tour ends, after its focus trap has been removed.
        const target = previousFocus.current
        previousFocus.current = null
        requestAnimationFrame(() => {
          if (target?.isConnected) {
            target.focus({ preventScroll: true })
          }
        })
      }
      onStatusChange?.(details)
    },
  })
  function prepareStep(step: TourStep): TourStep {
    return { ...step, effect: step.effect && prepareEffect(step.effect) }
  }

  function prepareEffect(
    effect: NonNullable<TourStep["effect"]>
  ): NonNullable<TourStep["effect"]> {
    // Zag 1.43.3 does not clean up the step effect on target timeout.
    return (args) => {
      const cleanup = effect(args)
      let cleaned = false
      const cleanupOnce = () => {
        if (cleaned) {
          return
        }
        cleaned = true
        if (effectCleanup.current === cleanupOnce) {
          effectCleanup.current = undefined
        }
        cleanup?.()
      }
      effectCleanup.current = cleanupOnce
      return cleanupOnce
    }
  }

  const zag = connect(service, normalizeProps)
  const handleKeyDown: KeyboardEventHandler<HTMLElement> = (event) => {
    if (event.defaultPrevented || props.keyboardNavigation === false) {
      return
    }
    // Zag 1.43.3 navigates out of editors and checks LTR boundaries in RTL.
    if (
      event.target instanceof Element &&
      event.target.closest("input, textarea, select, [contenteditable='true']")
    ) {
      return
    }
    const [nextKey, prevKey] =
      props.dir === "rtl"
        ? ["ArrowLeft", "ArrowRight"]
        : ["ArrowRight", "ArrowLeft"]
    if (event.key === nextKey && zag.hasNextStep) {
      event.preventDefault()
      zag.next()
      return
    }
    if (event.key === prevKey && zag.hasPrevStep) {
      event.preventDefault()
      zag.prev()
    }
  }
  const api: TourApi = {
    ...zag,
    addStep: (step) => zag.addStep(prepareStep(step)),
    updateStep: (stepId, step) =>
      zag.updateStep(
        stepId,
        "effect" in step
          ? { ...step, effect: step.effect && prepareEffect(step.effect) }
          : step
      ),
    setSteps: (nextSteps) => zag.setSteps(nextSteps.map(prepareStep)),
    getContentProps() {
      return {
        ...zag.getContentProps(),
        onKeyDown: handleKeyDown,
      }
    },
  }
  const activeTarget = api.step?.target?.()
  useIsomorphicLayoutEffect(() => {
    if (
      !(api.open && props.preventInteraction && activeTarget) ||
      activeTarget.inert
    ) {
      return
    }
    activeTarget.inert = true
    // Observe after our write: even another inert=true assignment transfers
    // ownership to the application, so restoring the initial boolean is unsafe.
    let changedExternally = false
    const observer = new MutationObserver(() => {
      changedExternally = true
    })
    observer.observe(activeTarget, {
      attributes: true,
      attributeFilter: ["inert"],
    })
    return () => {
      // Include writes queued in the same task as dismissal or unmount.
      const hasExternalWrite =
        changedExternally || observer.takeRecords().length > 0
      observer.disconnect()
      if (!hasExternalWrite) {
        activeTarget.inert = false
      }
    }
  }, [api.open, props.preventInteraction, activeTarget])
  useEffect(
    () => () => {
      const target = previousFocus.current
      previousFocus.current = null
      queueMicrotask(() => {
        if (target?.isConnected) {
          target.focus({ preventScroll: true })
        }
      })
    },
    []
  )
  return (
    <TourContext.Provider
      value={{ ...api, isRunning: !service.state.matches("tourInactive") }}
    >
      {children}
    </TourContext.Provider>
  )
}

export type TourContextProps = { children: (api: TourApi) => ReactNode }

Tour.Context = function TourApiContext({ children }: TourContextProps) {
  return children(useTourContext())
}

export type TourTriggerProps = ButtonProps & {
  ref?: Ref<HTMLButtonElement>
  /** Start at this step instead of the first one. */
  stepId?: string
}

Tour.Trigger = function TourTrigger({
  disabled,
  onClick,
  stepId,
  type = "button",
  ...props
}: TourTriggerProps) {
  const api = useTourContext()
  return (
    <Button
      {...props}
      disabled={disabled || api.isRunning || api.totalSteps === 0}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          api.start(stepId)
        }
      }}
      type={type}
    />
  )
}

Tour.Portal = Portal

export type TourPartProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

Tour.Backdrop = function TourBackdrop({
  className,
  ref,
  ...props
}: TourPartProps) {
  const api = useTourContext()
  if (!(api.open && api.step?.backdrop)) {
    return null
  }
  return (
    <div
      {...mergeProps(props, api.getBackdropProps())}
      className={tourStyles().backdrop({ className })}
      ref={ref}
    />
  )
}

Tour.Spotlight = function TourSpotlight({
  className,
  ref,
  ...props
}: TourPartProps) {
  const api = useTourContext()
  if (!api.open || api.step?.type !== "tooltip") {
    return null
  }
  return (
    <div
      {...mergeProps(props, api.getSpotlightProps())}
      className={tourStyles().spotlight({ className })}
      ref={ref}
    />
  )
}

Tour.Positioner = function TourPositioner({
  className,
  ref,
  ...props
}: TourPartProps) {
  const api = useTourContext()
  if (!api.open) {
    return null
  }
  return (
    <div
      {...mergeProps(props, api.getPositionerProps())}
      className={tourStyles().positioner({ className })}
      ref={ref}
    />
  )
}

Tour.Content = function TourContent({
  className,
  ref,
  ...props
}: TourPartProps) {
  const api = useTourContext()
  return (
    <div
      {...mergeProps(props, api.getContentProps())}
      className={tourStyles().content({ className })}
      ref={ref}
    />
  )
}

Tour.Arrow = function TourArrow({
  children,
  className,
  ref,
  ...props
}: TourPartProps) {
  const api = useTourContext()
  if (!api.step?.arrow || api.step.type !== "tooltip") {
    return null
  }
  return (
    <div
      {...mergeProps(props, api.getArrowProps())}
      className={tourStyles().arrow({ className })}
      ref={ref}
    >
      {children ?? <Tour.ArrowTip />}
    </div>
  )
}

Tour.ArrowTip = function TourArrowTip({
  className,
  ref,
  ...props
}: TourPartProps) {
  const api = useTourContext()
  return (
    <div
      {...mergeProps(props, api.getArrowTipProps())}
      className={tourStyles().arrowTip({ className })}
      ref={ref}
    />
  )
}

Tour.Title = function TourTitle({
  children,
  className,
  ref,
  ...props
}: TourPartProps) {
  const api = useTourContext()
  return (
    <div
      {...mergeProps(props, api.getTitleProps())}
      className={tourStyles().title({ className })}
      ref={ref}
    >
      {children ?? api.step?.title}
    </div>
  )
}

Tour.Description = function TourDescription({
  children,
  className,
  ref,
  ...props
}: TourPartProps) {
  const api = useTourContext()
  return (
    <div
      {...mergeProps(props, api.getDescriptionProps())}
      className={tourStyles().description({ className })}
      ref={ref}
    >
      {children ?? api.step?.description}
    </div>
  )
}

export type TourProgressTextProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement>
}

Tour.ProgressText = function TourProgressText({
  children,
  className,
  ref,
  ...props
}: TourProgressTextProps) {
  const api = useTourContext()
  return (
    <span
      {...mergeProps(props, api.getProgressTextProps())}
      className={tourStyles().progressText({ className })}
      ref={ref}
    >
      {children ?? api.getProgressText()}
    </span>
  )
}

Tour.Actions = function TourActions({
  className,
  ref,
  ...props
}: TourPartProps) {
  useTourContext()
  return (
    <div {...props} className={tourStyles().actions({ className })} ref={ref} />
  )
}

export type TourActionTriggerProps = Omit<ButtonProps, "action"> & {
  action: TourAction
  ref?: Ref<HTMLButtonElement>
}

Tour.ActionTrigger = function TourActionTrigger({
  action,
  children,
  disabled,
  onClick,
  type = "button",
  ...props
}: TourActionTriggerProps) {
  const api = useTourContext()
  const {
    onClick: onMachineClick,
    disabled: machineDisabled,
    "aria-label": machineLabel,
    ...machineProps
  } = api.getActionTriggerProps({
    action: { action, label: "" },
  })
  return (
    <Button
      {...mergeProps(props, machineProps)}
      aria-label={
        props["aria-label"] ?? (children != null ? undefined : machineLabel)
      }
      disabled={disabled || machineDisabled}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          onMachineClick?.(event)
        }
      }}
      type={type}
    >
      {children}
    </Button>
  )
}

export type TourCloseTriggerProps = Omit<ActionIconProps, "icon"> & {
  icon?: ActionIconProps["icon"]
}

Tour.CloseTrigger = function TourCloseTrigger({
  className,
  icon = "token-icon-close",
  onClick,
  ref,
  ...props
}: TourCloseTriggerProps) {
  const api = useTourContext()
  const {
    onClick: onMachineClick,
    "aria-label": machineLabel,
    ...machineProps
  } = api.getCloseTriggerProps()
  return (
    <ActionIcon
      {...mergeProps(props, machineProps)}
      aria-label={props["aria-label"] ?? machineLabel}
      className={tourStyles().closeTrigger({ className })}
      icon={icon}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          onMachineClick?.(event)
        }
      }}
      ref={ref}
    />
  )
}

Tour.Root = Tour
Tour.displayName = "Tour"
