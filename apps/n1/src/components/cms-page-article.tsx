import { SafeHtml } from "@techsio/ui-kit/atoms/safe-html"
import type { SafeHtmlPolicy } from "@techsio/ui-kit/atoms/safe-html"

import { Heading } from "@/components/heading"
import type { CmsPage } from "@/services/cms-service"

interface CmsPageArticleProps {
  page: CmsPage
}

const CMS_PAGE_POLICY: SafeHtmlPolicy = {
  allowedAttributes: {
    a: ["href", "rel", "target", "title"],
    img: ["alt", "decoding", "height", "loading", "src", "title", "width"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
  },
  allowedTags: [
    "a",
    "blockquote",
    "br",
    "code",
    "em",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "img",
    "li",
    "ol",
    "p",
    "pre",
    "strong",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "u",
    "ul",
  ],
}

export const CmsPageArticle = ({ page }: CmsPageArticleProps) => {
  const htmlContent = typeof page.content === "string" ? page.content : ""

  return (
    <article className="space-y-600">
      <Heading>{page.title}</Heading>
      {htmlContent === "" ? null : (
        <div className="space-y-400 text-fg-secondary [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_h2]:font-semibold [&_h2]:text-xl [&_h3]:font-medium [&_h3]:text-lg [&_li]:my-100 [&_ol]:ml-400 [&_ol]:list-decimal [&_p]:text-fg-secondary [&_strong]:font-semibold [&_ul]:ml-400 [&_ul]:list-disc">
          <SafeHtml html={htmlContent} policy={CMS_PAGE_POLICY} />
        </div>
      )}
    </article>
  )
}
