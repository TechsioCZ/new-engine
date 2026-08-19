import "server-only"

import type { CmsLocale } from "./cms-locale"
import type { CmsFooterNavigation } from "./cms-types"
import { storefrontSdk } from "./sdk"

type CmsFooterNavigationResponse = {
  footerNavigation?: CmsFooterNavigation | null
}

const EMPTY_FOOTER_NAVIGATION: CmsFooterNavigation = { columns: [] }

export const fetchCmsFooterNavigation = async (locale: CmsLocale) => {
  try {
    const response =
      await storefrontSdk.client.fetch<CmsFooterNavigationResponse>(
        "/store/cms/navigation/footer",
        {
          cache: "no-store",
          query: {
            locale,
          },
        }
      )

    return response.footerNavigation ?? EMPTY_FOOTER_NAVIGATION
  } catch (error) {
    console.error("Failed to fetch CMS footer navigation", error)
    return EMPTY_FOOTER_NAVIGATION
  }
}
