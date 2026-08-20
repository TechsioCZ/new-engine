// Pages Router callers import this module exclusively through getServerSideProps.
// Do not add the App-Router-only `server-only` marker here.

import { fetchCmsJsonOrThrow } from "./cms-client"
import type { CmsFooterNavigation } from "./cms-types"
import type { HerbatikaLocale } from "./market-context"
import { getRoDemoFooterNavigation } from "./ro-demo-static-pages"

type CmsFooterNavigationResponse = {
  footerNavigation?: CmsFooterNavigation | null
}

const EMPTY_FOOTER_NAVIGATION: CmsFooterNavigation = { columns: [] }

export const fetchCmsFooterNavigation = async (locale: HerbatikaLocale) => {
  const fallback = getRoDemoFooterNavigation(locale) ?? EMPTY_FOOTER_NAVIGATION
  try {
    const response = await fetchCmsJsonOrThrow<CmsFooterNavigationResponse>(
      "navigation/footer",
      { locale }
    )

    const navigation = response.footerNavigation
    return navigation?.columns.length ? navigation : fallback
  } catch (error) {
    console.error("Failed to fetch CMS footer navigation", error)
    return fallback
  }
}
