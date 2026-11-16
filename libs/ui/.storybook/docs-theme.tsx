import type { ComponentProps } from "react"
import { useEffect } from "react"
import { ThemedDocsContainer } from "./docs-container"
import { bindDocsTheme } from "./theme.mjs"
import { UIDefaultsPanel } from "./ui-defaults-panel"

const COMPONENT_PAGE = /^(Atoms|Molecules|Organisms|Templates)\//

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
  const componentPage = COMPONENT_PAGE.test(story?.title ?? "")
  return (
    <ThemedDocsContainer {...props}>
      {componentPage ? (
        <UIDefaultsPanel
          channel={context.channel}
          initialGlobals={context.projectAnnotations.initialGlobals}
        />
      ) : null}
      {children}
    </ThemedDocsContainer>
  )
}
