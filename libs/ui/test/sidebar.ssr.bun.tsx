import { expect, test } from "bun:test"
import { renderToString } from "react-dom/server"
import { Sidebar } from "../src/organisms/sidebar"

test("fixed-side policy is reflected in the first server render", () => {
  const markup = renderToString(
    <Sidebar collapsible={{ end: "none" }} defaultExpanded={[]}>
      <Sidebar.Panel aria-label="Fixed navigation" side="end">
        <Sidebar.Content>Navigation</Sidebar.Content>
      </Sidebar.Panel>
      <Sidebar.Trigger
        aria-label="Toggle fixed navigation"
        side="end"
      />
    </Sidebar>
  )

  expect(markup).toContain('data-collapsible="none"')
  expect(markup).toContain('data-state="expanded"')
  expect(markup).toContain('aria-label="Fixed navigation"')
  expect(markup).not.toContain("Toggle fixed navigation")
})
