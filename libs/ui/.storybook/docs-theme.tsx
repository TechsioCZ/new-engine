import type { ComponentProps } from "react"
import { useEffect } from "react"
import { ThemedDocsContainer } from "./docs-container"
import { bindDocsTheme } from "./theme.mjs"

type DocsThemeProps = ComponentProps<typeof ThemedDocsContainer>

/** Own globals independently of Canvas; leave Docs color/elevation to its owner. */
export function DocsTheme({ children, ...props }: DocsThemeProps) {
  const { context } = props
  const story = context.componentStories()[0]
  const brandLock = story?.parameters.brandLock
  useEffect(
    () =>
      bindDocsTheme(
        context.channel,
        document.documentElement,
        context.projectAnnotations.initialGlobals,
        brandLock
      ),
    [context, brandLock]
  )
  return <ThemedDocsContainer {...props}>{children}</ThemedDocsContainer>
}
