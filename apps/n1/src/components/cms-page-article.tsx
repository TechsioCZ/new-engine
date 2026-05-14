import { Heading } from "@/components/heading"
import type { CmsPage } from "@/services/cms-service"

type CmsPageArticleProps = {
  page: CmsPage
}

export function CmsPageArticle({ page }: CmsPageArticleProps) {
  const htmlContent = typeof page.content === "string" ? page.content : ""

  return (
    <article className="space-y-600">
      <Heading>{page.title}</Heading>
      {htmlContent ? (
        <div
          className="space-y-400 text-fg-secondary [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_h2]:font-semibold [&_h2]:text-xl [&_h3]:font-medium [&_h3]:text-lg [&_li]:my-100 [&_ol]:ml-400 [&_ol]:list-decimal [&_p]:text-fg-secondary [&_strong]:font-semibold [&_ul]:ml-400 [&_ul]:list-disc"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Payload generates this HTML from Lexical rich text and Medusa only exposes published CMS content.
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      ) : null}
    </article>
  )
}
