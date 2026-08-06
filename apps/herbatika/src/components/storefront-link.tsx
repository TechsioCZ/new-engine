import type { AnchorHTMLAttributes, PropsWithChildren } from "react"

export type StorefrontLinkProps = PropsWithChildren<
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string }
>

/** Public Pages Router destinations deliberately use document navigation. */
export function StorefrontLink({ children, href, ...props }: StorefrontLinkProps) {
  return <a {...props} href={href}>{children}</a>
}
