import type { PacketaWidgetGlobal } from "./packeta-widget.types"

const PACKETA_WIDGET_LIBRARY_URL =
  "https://widget.packeta.com/v6/www/js/library.js"

let loaderPromise: Promise<PacketaWidgetGlobal> | null = null

export function loadPacketaWidget() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Packeta widget requires a browser."))
  }

  if (window.Packeta?.Widget) {
    return Promise.resolve(window.Packeta)
  }

  if (loaderPromise) {
    return loaderPromise
  }

  loaderPromise = new Promise<PacketaWidgetGlobal>((resolve, reject) => {
    const handleLoaded = () => {
      if (window.Packeta?.Widget) {
        resolve(window.Packeta)
        return
      }

      loaderPromise = null
      reject(new Error("Packeta widget library did not initialise."))
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${PACKETA_WIDGET_LIBRARY_URL}"]`
    )

    if (existingScript) {
      existingScript.addEventListener("load", handleLoaded, { once: true })
      existingScript.addEventListener(
        "error",
        () => {
          loaderPromise = null
          reject(new Error("Packeta widget library failed to load."))
        },
        { once: true }
      )
      return
    }

    const script = document.createElement("script")
    script.async = true
    script.src = PACKETA_WIDGET_LIBRARY_URL
    script.onload = handleLoaded
    script.onerror = () => {
      loaderPromise = null
      reject(new Error("Packeta widget library failed to load."))
    }

    document.head.appendChild(script)
  })

  return loaderPromise
}
