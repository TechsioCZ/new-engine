import {
  type CommandDefinition,
  formatHotkey,
  type HotkeyCommand,
  type HotkeyFormatOptions,
  type HotkeyOptions,
  type HotkeyStore,
} from "@zag-js/hotkeys"
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react"

// biome-ignore lint/performance/noBarrelFile: This behavior entrypoint also exposes its native store factory.
export { createHotkeyStore } from "@zag-js/hotkeys"
export type {
  CommandDefinition,
  HotkeyAction,
  HotkeyCommand,
  HotkeyFormatOptions,
  HotkeyOptions,
  HotkeyStore,
  HotkeyStoreOptions,
} from "@zag-js/hotkeys"

export type UseHotkeyProps = Omit<CommandDefinition, "id"> & {
  store: HotkeyStore
  id?: string
}

export function useHotkey({ store, id, ...command }: UseHotkeyProps) {
  const generatedId = useId()
  useHotkeys({ store, commands: [{ ...command, id: id ?? generatedId }] })
}

export type UseHotkeysProps = {
  store: HotkeyStore
  commands: CommandDefinition[]
}

function sameValues(left: unknown, right: unknown) {
  if (Object.is(left, right)) {
    return true
  }
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => Object.is(value, right[index]))
  )
}

function sameOptions(left?: HotkeyOptions, right?: HotkeyOptions) {
  return (
    left?.capture === right?.capture &&
    left?.eventType === right?.eventType &&
    left?.preventDefault === right?.preventDefault &&
    left?.stopPropagation === right?.stopPropagation &&
    left?.requireReset === right?.requireReset &&
    left?.enableOnContentEditable === right?.enableOnContentEditable &&
    sameValues(left?.enableOnFormTags, right?.enableOnFormTags) &&
    left?.target === right?.target
  )
}

function sameRegistration(left: CommandDefinition, right: CommandDefinition) {
  return (
    left.hotkey === right.hotkey &&
    left.label === right.label &&
    left.description === right.description &&
    left.category === right.category &&
    sameValues(left.scopes, right.scopes) &&
    sameValues(left.keywords, right.keywords) &&
    sameOptions(left.options, right.options)
  )
}

function readEnabled(command?: CommandDefinition) {
  const value = command?.enabled
  return typeof value === "function" ? value() : (value ?? false)
}

function syncCommand(
  store: HotkeyStore,
  command: CommandDefinition,
  previous: CommandDefinition | undefined,
  getCurrent: () => CommandDefinition | undefined
) {
  const enabled =
    typeof command.enabled === "function"
      ? () => readEnabled(getCurrent())
      : (command.enabled ?? true)
  const enabledUnchanged =
    previous?.enabled === command.enabled ||
    (typeof previous?.enabled === "function" &&
      typeof command.enabled === "function")

  if (previous && sameRegistration(previous, command)) {
    if (!enabledUnchanged) {
      store.setEnabled(command.id, enabled)
    }
    return
  }

  if (previous) {
    store.unregister(command.id)
  }
  store.register({
    ...command,
    action: (event) => getCurrent()?.action(event),
    enabled,
  })
}

export function useHotkeys({ store, commands }: UseHotkeysProps) {
  const current = useRef(commands)
  const registered = useRef(new Map<string, CommandDefinition>())

  useLayoutEffect(() => {
    current.current = commands
  })

  useEffect(() => {
    const owned = registered.current
    return () => {
      for (const id of owned.keys()) {
        store.unregister(id)
      }
      owned.clear()
    }
  }, [store])

  useEffect(() => {
    const owned = registered.current
    for (const id of owned.keys()) {
      if (!commands.some((command) => command.id === id)) {
        owned.delete(id)
        store.unregister(id)
      }
    }

    for (const command of commands) {
      const previous = owned.get(command.id)
      owned.set(command.id, command)
      syncCommand(store, command, previous, () =>
        current.current.find((item) => item.id === command.id)
      )
    }
  })
}

export type UseHotkeyRegistrationsProps = { store: HotkeyStore }

const emptyRegistrations: HotkeyCommand[] = []
const getServerRegistrations = () => emptyRegistrations

export function useHotkeyRegistrations({ store }: UseHotkeyRegistrationsProps) {
  const subscription = useMemo(() => {
    let snapshot: HotkeyCommand[] = []
    const getSnapshot = () => {
      const commands = [...store.getState().commands.values()]
      if (
        commands.length !== snapshot.length ||
        commands.some((command, index) => {
          const previous = snapshot[index]
          return (
            !previous ||
            command._registrationOrder !== previous._registrationOrder ||
            command.enabled !== previous.enabled ||
            command.options !== previous.options ||
            command._parsed !== previous._parsed
          )
        })
      ) {
        snapshot = commands.map((command) => ({ ...command }))
      }
      return snapshot
    }
    return {
      getSnapshot,
      subscribe: (notify: () => void) => store.subscribe(getSnapshot, notify),
    }
  }, [store])

  return useSyncExternalStore(
    subscription.subscribe,
    subscription.getSnapshot,
    getServerRegistrations
  )
}

const subscribeToHydration = () => () => {
  // Hydration has no external event source.
}
const getClientHydration = () => true
const getServerHydration = () => false

export function useFormatHotkey() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydration,
    getServerHydration
  )
  const defaultPlatform = hydrated ? "auto" : "windows"
  return (hotkey: string, options?: HotkeyFormatOptions) =>
    formatHotkey(hotkey, {
      ...options,
      platform:
        options?.platform && options.platform !== "auto"
          ? options.platform
          : defaultPlatform,
    })
}
