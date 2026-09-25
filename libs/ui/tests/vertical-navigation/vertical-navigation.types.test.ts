import { type ComponentProps, createElement } from "react"
import { expectTypeOf, it } from "vitest"
import {
  VerticalNavigation,
  type VerticalNavigationLinkProps,
} from "../../src/molecules/vertical-navigation"

function RouterLink({ to, ...props }: ComponentProps<"a"> & { to: string }) {
  return createElement("a", { ...props, href: to })
}

it("preserves required router-link props without exposing button styling", () => {
  expectTypeOf<VerticalNavigationLinkProps<typeof RouterLink>>().toExtend<{
    to: string
  }>()
  const valid: VerticalNavigationLinkProps<typeof RouterLink> = {
    as: RouterLink,
    to: "/catalog",
    current: true,
  }
  createElement(VerticalNavigation.Link<typeof RouterLink>, valid)
  // @ts-expect-error The router destination remains required.
  const missingDestination: VerticalNavigationLinkProps<typeof RouterLink> = {
    as: RouterLink,
  }
  expectTypeOf(missingDestination).toExtend<{ to: string }>()
  expectTypeOf<VerticalNavigationLinkProps>().not.toHaveProperty("theme")
})
