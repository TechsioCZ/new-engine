const PPL_WIDGET_LOADER_URL = "https://www.ppl.cz/accesspointwidget/loader.js"

let loaderPromise: Promise<void> | null = null

export function loadPplWidgetLoader() {
  if (typeof window === "undefined") {
    return Promise.resolve()
  }

  if (customElements.get("ppl-access-point-widget")) {
    return Promise.resolve()
  }

  if (loaderPromise) {
    return loaderPromise
  }

  loaderPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${PPL_WIDGET_LOADER_URL}"]`
    )

    if (existingScript) {
      customElements
        .whenDefined("ppl-access-point-widget")
        .then(() => resolve())
      return
    }

    const script = document.createElement("script")
    script.async = true
    script.src = PPL_WIDGET_LOADER_URL
    script.onload = () => {
      customElements
        .whenDefined("ppl-access-point-widget")
        .then(() => resolve())
    }
    script.onerror = () => {
      loaderPromise = null
      reject(new Error("PPL widget loader failed."))
    }

    document.head.appendChild(script)
  })

  return loaderPromise
}
