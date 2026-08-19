// Pages Router callers import this module exclusively through getServerSideProps.
// Do not add the App-Router-only `server-only` marker here.

import { fetchCmsJsonOrThrow } from "./cms-client"
import type { CmsFooterNavigation } from "./cms-types"
import type { HerbatikaLocale } from "./market-context"

type CmsFooterNavigationResponse = {
  footerNavigation?: CmsFooterNavigation | null
}

const EMPTY_FOOTER_NAVIGATION: CmsFooterNavigation = { columns: [] }

export const fetchCmsFooterNavigation = async (locale: HerbatikaLocale) => {
  try {
    const response = await fetchCmsJsonOrThrow<CmsFooterNavigationResponse>(
      "navigation/footer",
      { locale }
    )

    return response.footerNavigation ?? EMPTY_FOOTER_NAVIGATION
  } catch (error) {
    console.error("Failed to fetch CMS footer navigation", error)
    return EMPTY_FOOTER_NAVIGATION
  }
}
