import { DocsContainer } from "@storybook/addon-docs/blocks"
import { type ComponentProps, useEffect, useState } from "react"
import { themes } from "storybook/theming"
import "./docs.css"

type DocsContainerProps = ComponentProps<typeof DocsContainer>

/** Follow the same resolved scheme as the preview, including toolbar changes. */
export function ThemedDocsContainer({
  children,
  ...props
}: DocsContainerProps) {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const update = () =>
      setDark(
        getComputedStyle(root).colorScheme === "dark" ||
          (!(
            root.classList.contains("light") || root.classList.contains("dark")
          ) &&
            media.matches)
      )
    const observer = new MutationObserver(update)
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    })
    media.addEventListener("change", update)
    update()
    return () => {
      observer.disconnect()
      media.removeEventListener("change", update)
    }
  }, [])
  return (
    <DocsContainer {...props} theme={dark ? themes.dark : themes.light}>
      {children}
    </DocsContainer>
  )
}
