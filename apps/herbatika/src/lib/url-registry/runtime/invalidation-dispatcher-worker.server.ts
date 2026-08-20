import "server-only"
import { randomUUID } from "node:crypto"
import type {
  InvalidationOutboxHealth,
  InvalidationOutboxStore,
} from "../postgres/invalidation-outbox-store"
import { getUrlRegistryRuntime } from "./instance.server"
import { deliverInvalidationOutboxEvent } from "./invalidation-delivery-client"
import {
  dispatchInvalidationOutboxBatch,
  type InvalidationDispatchResult,
} from "./invalidation-dispatcher"
import {
  type InvalidationDispatcherConfig,
  parseInvalidationDispatcherConfig,
} from "./invalidation-dispatcher-config.server"

const POLL_INTERVAL_MS = 5000

type WorkerState = {
  config: InvalidationDispatcherConfig
  consecutiveFailures: number
  lastBacklog: InvalidationOutboxHealth | null
  lastResult: InvalidationDispatchResult | null
  lastSuccessAt: string | null
  startedAt: string | null
  starting: Promise<void> | null
  store: InvalidationOutboxStore | null
  timer: ReturnType<typeof setTimeout> | null
  workerId: string
}

const runtimeGlobal = globalThis as typeof globalThis & {
  __herbatikaUrlRegistryInvalidationWorker?: WorkerState
}

const state: WorkerState =
  runtimeGlobal.__herbatikaUrlRegistryInvalidationWorker ?? {
    config: { enabled: false },
    consecutiveFailures: 0,
    lastBacklog: null,
    lastResult: null,
    lastSuccessAt: null,
    startedAt: null,
    starting: null,
    store: null,
    timer: null,
    workerId: `herbatika-urlr-${process.pid}-${randomUUID()}`,
  }
runtimeGlobal.__herbatikaUrlRegistryInvalidationWorker = state

const schedule = () => {
  if (!(state.config.enabled && state.store)) {
    return
  }
  state.timer = setTimeout(runCycle, POLL_INTERVAL_MS)
  state.timer.unref()
}

const runCycle = async () => {
  if (!(state.config.enabled && state.store)) {
    return
  }
  try {
    state.lastResult = await dispatchInvalidationOutboxBatch({
      deliver: (event) =>
        deliverInvalidationOutboxEvent(
          event,
          state.config as {
            endpoint: string
            token: string
          }
        ),
      logger: console,
      store: state.store,
      workerId: state.workerId,
    })
    state.lastBacklog = await state.store.health()
    state.lastSuccessAt = new Date().toISOString()
    state.consecutiveFailures = 0
  } catch {
    state.consecutiveFailures += 1
    console.error("URL registry invalidation dispatcher cycle failed")
  } finally {
    schedule()
  }
}

const stop = () => {
  if (state.timer) {
    clearTimeout(state.timer)
    state.timer = null
  }
}

export const startUrlRegistryInvalidationDispatcher =
  async (): Promise<void> => {
    if (state.starting) {
      return await state.starting
    }
    state.starting = (async () => {
      state.config = parseInvalidationDispatcherConfig()
      if (!state.config.enabled || state.timer) {
        return
      }
      const runtime = await getUrlRegistryRuntime()
      if (!runtime.enabled) {
        throw new Error("URL registry runtime is disabled")
      }
      state.store = runtime.invalidationOutboxStore
      state.startedAt = new Date().toISOString()
      schedule()
      process.once("SIGTERM", stop)
      process.once("SIGINT", stop)
    })()
    try {
      await state.starting
    } finally {
      state.starting = null
    }
  }

export const getInvalidationDispatcherHealth = () => {
  const enabled = state.config.enabled
  let status: "degraded" | "disabled" | "healthy" | "starting" = "disabled"
  if (enabled) {
    status = state.lastSuccessAt ? "healthy" : "starting"
    if (state.consecutiveFailures > 0) {
      status = "degraded"
    }
  }
  return Object.freeze({
    backlog: state.lastBacklog,
    consecutiveFailures: state.consecutiveFailures,
    enabled,
    lastResult: state.lastResult,
    lastSuccessAt: state.lastSuccessAt,
    startedAt: state.startedAt,
    status,
  })
}
