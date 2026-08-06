import { sleep } from "@techsio/std/async"
import { isRecord } from "@techsio/std/object"

import type { PacketaWidgetGlobal } from "./packeta-widget.types"

const PACKETA_SCRIPT_ID = "packeta-pickup-widget-library"
const READINESS_POLL_INTERVAL_MS = 50
const READINESS_POLL_LIMIT = 300

let loaderPromise: Promise<PacketaWidgetGlobal> | null = null

const isPacketaWidgetGlobal = (
  value: unknown,
): value is PacketaWidgetGlobal => {
  if (!isRecord(value)) {
    return false
  }
  const widget: unknown = Reflect.get(value, "Widget")
  return (
    isRecord(widget) &&
    typeof Reflect.get(widget, "close") === "function" &&
    typeof Reflect.get(widget, "pick") === "function"
  )
}

const resolvePacketaGlobal = (): PacketaWidgetGlobal | null => {
  const packeta: unknown = Reflect.get(window, "Packeta")
  return isPacketaWidgetGlobal(packeta) ? packeta : null
}

const findFrameworkScript = async (
  id: string,
  attempt = 0,
): Promise<HTMLScriptElement> => {
  const script = document.querySelector<HTMLScriptElement>(`script#${id}`)
  if (script !== null) {
    return script
  }
  if (attempt >= READINESS_POLL_LIMIT) {
    throw new Error(`Framework-owned script #${id} was not mounted.`)
  }

  await sleep(READINESS_POLL_INTERVAL_MS)
  return await findFrameworkScript(id, attempt + 1)
}

const waitForPacketaGlobal = async (script: HTMLScriptElement) => {
  const readiness = Promise.withResolvers<PacketaWidgetGlobal>()
  let attempts = 0

  const resolveWhenReady = () => {
    const packeta = resolvePacketaGlobal()
    if (packeta !== null) {
      readiness.resolve(packeta)
      return
    }

    attempts += 1
    if (attempts >= READINESS_POLL_LIMIT) {
      readiness.reject(new Error("Packeta widget library did not initialise."))
    }
  }
  const handleError = () => {
    readiness.reject(new Error("Packeta widget library failed to load."))
  }
  const intervalId = window.setInterval(
    resolveWhenReady,
    READINESS_POLL_INTERVAL_MS,
  )

  script.addEventListener("load", resolveWhenReady, { once: true })
  script.addEventListener("error", handleError, { once: true })
  resolveWhenReady()

  try {
    return await readiness.promise
  } finally {
    window.clearInterval(intervalId)
    script.removeEventListener("load", resolveWhenReady)
    script.removeEventListener("error", handleError)
  }
}

const waitForPacketaWidget = async () => {
  const script = await findFrameworkScript(PACKETA_SCRIPT_ID)
  return await waitForPacketaGlobal(script)
}

export const loadPacketaWidget = async () => {
  if (typeof window === "undefined") {
    throw new TypeError("Packeta widget requires a browser.")
  }

  const packeta = resolvePacketaGlobal()
  if (packeta !== null) {
    return packeta
  }

  const pendingLoad = loaderPromise ?? waitForPacketaWidget()
  loaderPromise = pendingLoad

  try {
    return await pendingLoad
  } catch (error) {
    if (loaderPromise === pendingLoad) {
      loaderPromise = null
    }
    throw error
  }
}
