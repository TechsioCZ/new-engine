import { fetchCmsJson, rewriteCmsHtmlMediaUrls } from "./cms-client";
import type { CmsPage } from "./cms-types";

type CmsPageResponse = {
  page?: CmsPage | null;
};

export const fetchCmsPageBySlug = async (slug: string) => {
  const response = await fetchCmsJson<CmsPageResponse>(
    `pages/${encodeURIComponent(slug)}`,
  );
  const page = response?.page;

  if (!page?.slug || !page.title) {
    return null;
  }

  return {
    ...page,
    content: rewriteCmsHtmlMediaUrls(page.content ?? ""),
  };
};
