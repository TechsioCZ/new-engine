"use client"

import * as drawer from "@zag-js/drawer"
import * as presence from "@zag-js/presence"
import { type PropTypes, normalizeProps, useMachine } from "@zag-js/react"
import {
  createContext,
  type ReactNode,
  type Ref,
  type RefCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { type DrawerSize, drawerVariants } from "./drawer.styles"

export type DrawerApi = drawer.Api<PropTypes>
export type DrawerStackApi = drawer.DrawerStackApi<PropTypes>

export type UseDrawerProps = Omit<drawer.Props, "id"> & {
  id?: string
}

export type DrawerPresenceProps = Pick<
  presence.Props,
  "immediate" | "onEnterComplete" | "onExitComplete"
> & {
  lazyMount?: boolean
  skipAnimationOnMount?: boolean
  unmountOnExit?: boolean
}

type DrawerPresenceOptions = Pick<
  DrawerPresenceProps,
  "immediate" | "lazyMount" | "skipAnimationOnMount" | "unmountOnExit"
>

export type DrawerPresenceState = {
  api: presence.Api
  ref: RefCallback<HTMLDivElement>
  skipAnimationOnMount: boolean
  unmounted: boolean
}

type DrawerContextValue = {
  api: DrawerApi
  presence: DrawerPresenceState
  presenceOptions: DrawerPresenceOptions
  styles: ReturnType<typeof drawerVariants>
}

const DrawerContext = createContext<DrawerContextValue | null>(null)
const DrawerStackStoreContext = createContext<drawer.DrawerStack | undefined>(
  undefined
)
const DrawerStackContext = createContext<DrawerStackApi | null>(null)

export function useDrawer(props: UseDrawerProps = {}): DrawerApi {
  const generatedId = useId()
  const inheritedStack = useContext(DrawerStackStoreContext)
  const {
    defaultSnapPoint,
    id = generatedId,
    stack = inheritedStack,
    ...machineProps
  } = props
  const machineOptions = {
    id,
    stack,
    ...machineProps,
  }

  // Public Drawer props allow null, while Zag's defaulted machine prop narrows it.
  if ("defaultSnapPoint" in props) {
    Object.assign(machineOptions, { defaultSnapPoint })
  }

  const service = useMachine(drawer.machine, machineOptions)

  return drawer.connect(service, normalizeProps)
}

export function useDrawerContext(): DrawerContextValue {
  const context = useContext(DrawerContext)
  if (!context) {
    throw new Error("Drawer components must be used within Drawer.Root")
  }
  return context
}

export function useDrawerStackContext(): DrawerStackApi {
  const context = useContext(DrawerStackContext)
  if (!context) {
    throw new Error(
      "Drawer stack components must be used within Drawer.Stack"
    )
  }
  return context
}

type UseDrawerPresenceProps = DrawerPresenceProps & {
  present: boolean
}

export function useDrawerPresence({
  immediate,
  lazyMount = true,
  onEnterComplete,
  onExitComplete,
  present,
  skipAnimationOnMount = false,
  unmountOnExit = true,
}: UseDrawerPresenceProps): DrawerPresenceState {
  const wasEverPresent = useRef(false)
  const service = useMachine(presence.machine, {
    immediate,
    onEnterComplete,
    onExitComplete,
    present,
  })
  const api = presence.connect(service, normalizeProps)
  const latestSetNode = useRef(api.setNode)
  latestSetNode.current = api.setNode
  const presenceRef = useRef<RefCallback<HTMLDivElement>>((node) => {
    latestSetNode.current(node)

    return () => {
      latestSetNode.current(null)
    }
  }).current

  if (api.present) {
    wasEverPresent.current = true
  }

  const unmounted =
    (!api.present && !wasEverPresent.current && lazyMount) ||
    (!api.present && wasEverPresent.current && unmountOnExit)

  return {
    api,
    ref: presenceRef,
    skipAnimationOnMount,
    unmounted,
  }
}

type DrawerProviderProps = DrawerPresenceProps & {
  api: DrawerApi
  children?: ReactNode
  size?: DrawerSize
}

export function DrawerProvider({
  api,
  children,
  immediate,
  lazyMount = true,
  onEnterComplete,
  onExitComplete,
  size,
  skipAnimationOnMount = false,
  unmountOnExit = true,
}: DrawerProviderProps) {
  const presenceOptions = {
    immediate,
    lazyMount,
    skipAnimationOnMount,
    unmountOnExit,
  }
  const contentPresence = useDrawerPresence({
    ...presenceOptions,
    onEnterComplete,
    onExitComplete,
    present: api.open,
  })
  const styles = drawerVariants({ size })

  return (
    <DrawerContext.Provider
      value={{
        api,
        presence: contentPresence,
        presenceOptions,
        styles,
      }}
    >
      {children}
    </DrawerContext.Provider>
  )
}

export function getDrawerPresenceProps(
  open: boolean,
  presenceState: DrawerPresenceState
) {
  return {
    "data-state":
      presenceState.api.skip && presenceState.skipAnimationOnMount
        ? null
        : open
          ? "open"
          : "closed",
    hidden: !presenceState.api.present,
  } as const
}

type PossibleRef<T> = Ref<T> | undefined

function composeRefs<T>(...refs: PossibleRef<T>[]): RefCallback<T> {
  return (node) => {
    const cleanups: VoidFunction[] = []

    for (const ref of refs) {
      if (typeof ref === "function") {
        const cleanup = ref(node)
        cleanups.push(
          typeof cleanup === "function" ? cleanup : () => ref(null)
        )
      } else if (ref) {
        ref.current = node
        cleanups.push(() => {
          ref.current = null
        })
      }
    }

    return () => {
      for (const cleanup of cleanups) {
        cleanup()
      }
    }
  }
}

export function useComposedRefs<T>(
  firstRef: PossibleRef<T>,
  secondRef: PossibleRef<T>
): RefCallback<T> {
  return useMemo(
    () => composeRefs(firstRef, secondRef),
    [firstRef, secondRef]
  )
}

export type DrawerStackProviderProps = {
  children?: ReactNode
}

export function DrawerStackProvider({ children }: DrawerStackProviderProps) {
  const [stack] = useState(() => drawer.createStack())
  const snapshot = useSyncExternalStore(
    stack.subscribe,
    stack.getSnapshot,
    stack.getSnapshot
  )
  const api = useMemo(
    () => drawer.connectStack(snapshot, normalizeProps),
    [snapshot]
  )

  return (
    <DrawerStackStoreContext.Provider value={stack}>
      <DrawerStackContext.Provider value={api}>
        {children}
      </DrawerStackContext.Provider>
    </DrawerStackStoreContext.Provider>
  )
}
