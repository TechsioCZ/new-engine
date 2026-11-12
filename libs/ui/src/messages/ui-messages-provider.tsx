"use client"

import {
  type Context,
  createContext,
  type ReactNode,
  useContext,
  useMemo,
} from "react"
import {
  enUiMessages,
  mergeUiMessages,
  type UiMessages,
  type UiMessagesInput,
} from "./ui-messages"

/** The catalogs of every provider above, outermost first. */
type UiMessagesLayers = readonly UiMessagesInput[]

const NO_LAYERS: UiMessagesLayers = []

/**
 * One context per page, not per copy of the kit: an app that bundles the kit more than once
 * (module-federation remotes, micro-frontends) still sets the language with one provider. Each copy
 * reads the provided catalogs over its own English, so copies of different versions agree.
 */
const contextKey = Symbol.for("@techsio/ui-kit/ui-messages")

function sharedContext(): Context<UiMessagesLayers> {
  const registry = globalThis as typeof globalThis & {
    [contextKey]?: Context<UiMessagesLayers>
  }
  registry[contextKey] ??= createContext<UiMessagesLayers>(NO_LAYERS)
  return registry[contextKey]
}

const UiMessagesContext = sharedContext()

const resolved = new WeakMap<UiMessagesLayers, UiMessages>()

function resolve(layers: UiMessagesLayers): UiMessages {
  const cached = resolved.get(layers)
  if (cached) {
    return cached
  }
  const messages = layers.reduce(mergeUiMessages, enUiMessages)
  resolved.set(layers, messages)
  return messages
}

export type UiMessagesProviderProps = {
  /** The app's catalog, whole or partial. Missing entries come from the outer provider, then English. */
  messages?: UiMessagesInput
  /** BCP 47 locale for formatting; shorthand for `messages.locale`. */
  locale?: string
  children: ReactNode
}

/**
 * Sets the language of every @techsio/ui-kit component below it. Place it once near the app root;
 * nest another to change part of the catalog for one subtree. Keep `messages` stable (a module
 * constant or a memoized value), so components below do not re-render on every parent render.
 */
export function UiMessagesProvider({
  messages,
  locale,
  children,
}: UiMessagesProviderProps) {
  const outer = useContext(UiMessagesContext)
  const layers = useMemo(() => {
    const own: UiMessagesInput[] = []
    if (messages) {
      own.push(messages)
    }
    if (locale !== undefined) {
      own.push({ locale })
    }
    return own.length === 0 ? outer : [...outer, ...own]
  }, [outer, messages, locale])
  return (
    <UiMessagesContext.Provider value={layers}>
      {children}
    </UiMessagesContext.Provider>
  )
}

/** The catalog in effect: the nearest providers' over English, or English without one. */
export function useUiMessages(): UiMessages {
  return resolve(useContext(UiMessagesContext))
}
