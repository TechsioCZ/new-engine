import type { AnchorHTMLAttributes, Ref } from "react"

export type StorefrontLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> &
  Readonly<{
    href: string
    ref?: Ref<HTMLAnchorElement>
  }>

/**
 * Public storefront navigation deliberately uses full document requests.
 * That keeps hard HTTP status handling in the Pages SSR boundary and prevents
 * Next client prefetch/RSC requests from becoming a second routing protocol.
 */
export function StorefrontLink({ href, ref, ...props }: StorefrontLinkProps) {
  return <a {...props} href={href} ref={ref} />
}
