import type { IEventBusModuleService } from "@medusajs/framework/types"

export type CarrierSyncEvent = {
  key: string
  name: string
  data: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function createCarrierSyncEvent(
  name: string,
  identity: string,
  data: Record<string, unknown>
): CarrierSyncEvent {
  return {
    key: `${name}:${identity}`,
    name,
    data,
  }
}

export function getCarrierSyncEvent(
  value: unknown,
  allowedNames: readonly string[]
): CarrierSyncEvent | null {
  if (!(isRecord(value) && isRecord(value.data))) {
    return null
  }

  const key = value.key
  const name = value.name
  if (
    typeof key !== "string" ||
    typeof name !== "string" ||
    !allowedNames.includes(name)
  ) {
    return null
  }

  return { key, name, data: value.data }
}

export async function emitCarrierSyncEvent(
  eventBus: IEventBusModuleService,
  event: CarrierSyncEvent
): Promise<void> {
  await eventBus.emit({
    name: event.name,
    data: {
      ...event.data,
      idempotency_key: event.key,
    },
  })
}
