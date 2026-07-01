import type { TV } from "tailwind-variants"
import { createTV } from "tailwind-variants"

const TEXT_SIZE_REGEX = /-(size|sm|md|lg|\d?x?[sml])$/
const WHITESPACE_REGEX = /\s+/g
const NON_WORD_REGEX = /[^\w-]+/g
const MULTIPLE_DASHES_REGEX = /--+/g
const LEADING_DASHES_REGEX = /^-+/
const TRAILING_DASHES_REGEX = /-+$/

export const tv: TV = createTV({
  twMergeConfig: {
    theme: {
      text: [(value: string) => TEXT_SIZE_REGEX.test(value)],
    },
  },
})

export interface LoadStylesheetOptions {
  /**
   * Optional DOM id for the injected `<link>` tag. Also used to dedupe loads.
   */
  id?: string
  nonce?: string
  crossOrigin?: "" | "anonymous" | "use-credentials"
  integrity?: string
  referrerPolicy?: HTMLLinkElement["referrerPolicy"]
}

const stylesheetLoads = new Map<string, Promise<void>>()

export function loadStylesheet(
  href: string,
  {
    id,
    nonce,
    crossOrigin,
    integrity,
    referrerPolicy,
  }: LoadStylesheetOptions = {}
) {
  if (typeof document === "undefined") return Promise.resolve()

  const key = id ?? href
  const existingLoad = stylesheetLoads.get(key)
  if (existingLoad) return existingLoad

  if (id && document.getElementById(id)) return Promise.resolve()
  const resolvedHref = (() => {
    try {
      return new URL(href, document.baseURI).href
    } catch {
      return href
    }
  })()

  for (const link of document.querySelectorAll<HTMLLinkElement>(
    'link[rel="stylesheet"]'
  )) {
    if (link.getAttribute("href") === href) return Promise.resolve()
    if (link.href === resolvedHref) return Promise.resolve()
  }

  const loadPromise = new Promise<void>((resolve, reject) => {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = href

    if (id) link.id = id
    if (nonce) link.nonce = nonce
    if (crossOrigin) link.crossOrigin = crossOrigin
    if (integrity) link.integrity = integrity
    if (referrerPolicy) link.referrerPolicy = referrerPolicy

    link.addEventListener(
      "load",
      () => {
        stylesheetLoads.delete(key)
        resolve()
      },
      { once: true }
    )
    link.addEventListener(
      "error",
      () => {
        stylesheetLoads.delete(key)
        link.remove()
        reject(new Error(`Failed to load stylesheet: ${href}`))
      },
      { once: true }
    )

    document.head.appendChild(link)
  })

  stylesheetLoads.set(key, loadPromise)
  return loadPromise
}

/**
 * Loads the lazy, full flag-icon stylesheet via `<link>` injection.
 *
 * Consumers should serve `node_modules/@techsio/ui-kit/dist/flags.css` at `href`
 * (e.g. `/flags.css`).
 */
export function loadFlagIconsStylesheet(href = "/flags.css") {
  return loadStylesheet(href, { id: "techsio-ui-kit-flag-icons" })
}

export function slugify(str: string) {
  return str
    .toString()
    .toLowerCase()
    .replace(WHITESPACE_REGEX, "-")
    .replace(NON_WORD_REGEX, "")
    .replace(MULTIPLE_DASHES_REGEX, "-")
    .replace(LEADING_DASHES_REGEX, "")
    .replace(TRAILING_DASHES_REGEX, "")
}
