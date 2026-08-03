import { sanitizeBlogHtml } from "@/components/product-detail/utils/html-sanitizer"

type BlogRichTextProps = {
  className?: string
  html: string | null | undefined
}

const BLOG_RICH_TEXT_CLASS = `max-w-none font-rubik text-md leading-relaxed text-fg-primary
  [&>:first-child]:mt-0
  [&_a]:font-bold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
  [&_blockquote]:my-400 [&_blockquote]:border-primary [&_blockquote]:border-l-4 [&_blockquote]:pl-400 [&_blockquote]:text-fg-secondary
  [&_code]:rounded-xs [&_code]:bg-bg-secondary [&_code]:px-100 [&_code]:font-mono
  [&_em]:italic [&_strong]:font-bold
  [&_h1]:mt-600 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:leading-tight
  [&_h2]:mt-500 [&_h2]:text-xl [&_h2]:font-medium [&_h2]:leading-tight
  [&_h3]:mt-400 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:leading-tight
  [&_h4]:mt-300 [&_h4]:text-md [&_h4]:font-medium [&_h4]:leading-tight
  [&_h5]:mt-300 [&_h5]:text-base [&_h5]:font-medium [&_h5]:leading-tight
  [&_h6]:mt-250 [&_h6]:text-sm [&_h6]:font-medium [&_h6]:leading-tight
  [&_hr]:my-500 [&_hr]:border-border-primary
  [&_img]:mx-auto [&_img]:mt-400 [&_img]:block [&_img]:h-auto [&_img]:w-auto [&_img]:max-w-full [&_img]:rounded-sm
  [&_li]:ml-350 [&_li]:list-disc [&_li]:marker:text-primary [&_li+li]:mt-100
  [&_ol]:mt-250 [&_ol>li]:list-decimal [&_p+p]:mt-250 [&_ul]:mt-250
  [&_p:has(img)+p]:mx-auto [&_p:has(img)+p]:mt-100 [&_p:has(img)+p]:w-full [&_p:has(img)+p]:max-w-4xl [&_p:has(img)+p]:text-xs [&_p:has(img)+p]:text-fg-secondary
  [&_table]:block [&_table]:w-full [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse
  [&_td]:border [&_td]:border-border-secondary [&_td]:p-200
  [&_th]:border [&_th]:border-border-secondary [&_th]:bg-surface-secondary [&_th]:p-200 [&_th]:text-left`

export function BlogRichText({ className, html }: BlogRichTextProps) {
  const sanitizedHtml = html ? sanitizeBlogHtml(html) : ""

  if (!sanitizedHtml) {
    return null
  }

  return (
    <div
      className={[BLOG_RICH_TEXT_CLASS, className].filter(Boolean).join(" ")}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Imported article HTML is sanitized before rendering.
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}
