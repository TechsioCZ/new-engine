import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import { claimEvents, reclaimEvents } from "./delivery-state-claims"
import {
  acknowledgeEvent,
  failEvent,
  retryEvent,
} from "./delivery-state-transitions"

export const claimUrlRegistryOutboxEvents = (
  manager: SqlEntityManager,
  input: unknown
) => claimEvents(manager, input)

export const reclaimExpiredUrlRegistryOutboxEvents = (
  manager: SqlEntityManager,
  input: unknown
) => reclaimEvents(manager, input)

export const acknowledgeUrlRegistryOutboxEvent = (
  manager: SqlEntityManager,
  input: unknown
) => acknowledgeEvent(manager, input)

export const retryUrlRegistryOutboxEvent = (
  manager: SqlEntityManager,
  input: unknown
) => retryEvent(manager, input)

export const failUrlRegistryOutboxEvent = (
  manager: SqlEntityManager,
  input: unknown
) => failEvent(manager, input)
