import { sleep } from "@techsio/std/async"

const PPL_SCRIPT_ID = "ppl-access-point-widget-loader"
const PPL_WIDGET_TAG = "ppl-access-point-widget"
const READINESS_POLL_INTERVAL_MS = 50
const READINESS_POLL_LIMIT = 300

let loaderPromise: Promise<void> | null = null

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

const waitForPplElement = async (script: HTMLScriptElement) => {
  const readiness = Promise.withResolvers<null>()
  let attempts = 0

  const resolveWhenReady = () => {
    if (customElements.get(PPL_WIDGET_TAG) !== undefined) {
      readiness.resolve(null)
      return
    }

    attempts += 1
    if (attempts >= READINESS_POLL_LIMIT) {
      readiness.reject(new Error("PPL widget loader timed out."))
    }
  }
  const handleError = () => {
    readiness.reject(new Error("PPL widget loader failed."))
  }
  const intervalId = window.setInterval(
    resolveWhenReady,
    READINESS_POLL_INTERVAL_MS,
  )

  script.addEventListener("load", resolveWhenReady, { once: true })
  script.addEventListener("error", handleError, { once: true })
  resolveWhenReady()

  try {
    await readiness.promise
  } finally {
    window.clearInterval(intervalId)
    script.removeEventListener("load", resolveWhenReady)
    script.removeEventListener("error", handleError)
  }
}

const waitForPplWidget = async () => {
  const script = await findFrameworkScript(PPL_SCRIPT_ID)
  await waitForPplElement(script)
}

export const loadPplWidgetLoader = async () => {
  if (typeof window === "undefined") {
    return
  }

  if (customElements.get(PPL_WIDGET_TAG) !== undefined) {
    return
  }

  const pendingLoad = loaderPromise ?? waitForPplWidget()
  loaderPromise = pendingLoad

  try {
    await pendingLoad
  } catch (error) {
    if (loaderPromise === pendingLoad) {
      loaderPromise = null
    }
    throw error
  }
}
