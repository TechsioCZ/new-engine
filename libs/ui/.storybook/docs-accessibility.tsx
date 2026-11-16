import { type PropsWithChildren, useEffect, useRef } from "react"

/** Adds keyboard access only when a genuinely two-dimensional table overflows. */
export function AccessibleDocsContent({ children }: PropsWithChildren) {
  const content = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = content.current
    if (!root) {
      return
    }
    const originals = new Map<HTMLElement, Map<string, string | null>>()
    const attributes = ["tabindex", "role", "aria-label", "data-api-scroll"]
    const restore = (element: HTMLElement) => {
      for (const [name, value] of originals.get(element) ?? []) {
        if (value === null) {
          element.removeAttribute(name)
        } else {
          element.setAttribute(name, value)
        }
      }
      originals.delete(element)
    }
    const updateWrapper = (wrapper: HTMLElement) => {
      if (wrapper.scrollWidth <= wrapper.clientWidth + 1) {
        restore(wrapper)
        return
      }
      if (!originals.has(wrapper)) {
        originals.set(
          wrapper,
          new Map(attributes.map((name) => [name, wrapper.getAttribute(name)]))
        )
      }
      wrapper.tabIndex = 0
      wrapper.setAttribute("role", "region")
      wrapper.setAttribute(
        "aria-label",
        "Component properties and controls, horizontally scrollable"
      )
      wrapper.setAttribute("data-api-scroll", "")
    }
    const update = () => {
      for (const element of originals.keys()) {
        if (!root.contains(element)) {
          resize.unobserve(element)
          restore(element)
        }
      }
      for (const table of root.querySelectorAll<HTMLElement>(
        ".docblock-argstable"
      )) {
        const wrapper = table.parentElement
        if (!wrapper) {
          continue
        }
        resize.observe(wrapper)
        updateWrapper(wrapper)
      }
    }
    const resize = new ResizeObserver(update)
    const observer = new MutationObserver(update)
    // Attribute changes made by this enhancement must not observe themselves.
    observer.observe(root, { childList: true, subtree: true })
    window.addEventListener("resize", update)
    update()
    return () => {
      observer.disconnect()
      resize.disconnect()
      window.removeEventListener("resize", update)
      for (const element of originals.keys()) {
        restore(element)
      }
    }
  }, [])
  return <div ref={content}>{children}</div>
}
