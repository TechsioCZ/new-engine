import type { MouseEvent } from "react"

import type { ReviewTrustSource } from "@/components/reviews/reviews.types"

export const resolveReviewsHeading = (
  headingText: string | undefined,
  isHomepage: boolean,
  homepageTitle: string,
  productTitle: string,
) => headingText ?? (isHomepage ? homepageTitle : productTitle)

export const resolveReviewsLinkHref = (
  linkHref: string | null | undefined,
  isHomepage: boolean,
) => {
  if (linkHref !== undefined) {
    return linkHref
  }

  return isHomepage ? null : "#reviews"
}

export const resolveReviewsLinkLabel = (
  linkLabel: string | null | undefined,
  isHomepage: boolean,
  productLabel: string,
) => {
  if (linkLabel !== undefined) {
    return linkLabel
  }

  return isHomepage ? null : productLabel
}

export const resolveTrustSourceProps = (
  sources: readonly ReviewTrustSource[] | undefined,
) => (sources === undefined ? {} : { sources })

export const resolveLinkClickProps = (
  onClick: ((event: MouseEvent<HTMLAnchorElement>) => void) | undefined,
) => (onClick === undefined ? {} : { onClick })
