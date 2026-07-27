const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY?.trim() ?? ""
const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-script"
const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
const TURNSTILE_TIMEOUT_MS = 15_000

export const PRODUCT_REVIEW_TURNSTILE_ERROR_MESSAGE =
  "Nepodarilo sa overiť captcha. Skúste to znova."

type TurnstileWidgetId = string

type TurnstileRenderOptions = {
  sitekey: string
  size: "invisible"
  callback: (token: string) => void
  "error-callback": () => void
  "expired-callback": () => void
}

type TurnstileApi = {
  execute: (widgetId: TurnstileWidgetId) => void
  remove: (widgetId: TurnstileWidgetId) => void
  render: (
    container: HTMLElement,
    options: TurnstileRenderOptions
  ) => TurnstileWidgetId
}

type TurnstileWindow = Window & {
  turnstile?: TurnstileApi
}

function getTurnstileApi(): TurnstileApi | undefined {
  return (window as TurnstileWindow).turnstile
}

function loadTurnstileScript(): Promise<TurnstileApi> {
  const turnstile = getTurnstileApi()

  if (turnstile) {
    return Promise.resolve(turnstile)
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID)

    if (existingScript) {
      existingScript.addEventListener(
        "load",
        () => {
          const loadedTurnstile = getTurnstileApi()

          if (loadedTurnstile) {
            resolve(loadedTurnstile)
            return
          }

          reject(new Error("Turnstile script loaded without API"))
        },
        { once: true }
      )
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Turnstile script failed to load")),
        { once: true }
      )
      return
    }

    const script = document.createElement("script")
    script.defer = true
    script.id = TURNSTILE_SCRIPT_ID
    script.src = TURNSTILE_SCRIPT_SRC

    script.addEventListener(
      "load",
      () => {
        const loadedTurnstile = getTurnstileApi()

        if (loadedTurnstile) {
          resolve(loadedTurnstile)
          return
        }

        reject(new Error("Turnstile script loaded without API"))
      },
      { once: true }
    )
    script.addEventListener(
      "error",
      () => reject(new Error("Turnstile script failed to load")),
      { once: true }
    )

    document.head.appendChild(script)
  })
}

async function executeTurnstileChallenge(): Promise<string> {
  const turnstile = await loadTurnstileScript()
  const container = document.createElement("div")
  container.hidden = true
  document.body.appendChild(container)

  return new Promise((resolve, reject) => {
    let widgetId: TurnstileWidgetId | undefined
    const cleanup = () => {
      window.clearTimeout(timeoutId)

      if (widgetId) {
        turnstile.remove(widgetId)
      } else {
        container.remove()
      }
    }
    const fail = () => {
      cleanup()
      reject(new Error(PRODUCT_REVIEW_TURNSTILE_ERROR_MESSAGE))
    }
    const timeoutId = window.setTimeout(fail, TURNSTILE_TIMEOUT_MS)

    widgetId = turnstile.render(container, {
      sitekey: TURNSTILE_SITE_KEY,
      size: "invisible",
      callback: (token) => {
        cleanup()
        resolve(token)
      },
      "error-callback": fail,
      "expired-callback": fail,
    })

    turnstile.execute(widgetId)
  })
}

export async function getProductReviewTurnstileToken(): Promise<
  string | undefined
> {
  if (!TURNSTILE_SITE_KEY || typeof window === "undefined") {
    return
  }

  return await executeTurnstileChallenge()
}
