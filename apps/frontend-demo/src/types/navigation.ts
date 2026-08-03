import type { Route } from "next"

interface NavLink {
  href: Route
  label: string
}

export interface NavSection {
  title: string
  links: NavLink[]
}
