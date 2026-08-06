import type { GetServerSideProps } from "next"
import { AboutPage } from "@/components/about/about-page"
import { FaqPage } from "@/components/faq/faq-page"
import { type FlowPageProps, resolveFlowPage } from "@/lib/routing/public-page"
import { StatusSurface } from "@/lib/routing/status-surface"

type PageKey = "about" | "faq"
type Props = FlowPageProps<{ pageKey: PageKey }>
export const getServerSideProps: GetServerSideProps<Props> = (context) => {
  const pageKey = context.params?.pageKey
  return pageKey === "about" || pageKey === "faq"
    ? resolveFlowPage(context, async () => ({
        type: "found",
        value: { pageKey },
      }))
    : Promise.resolve({ notFound: true })
}
export default function StaticPage({ source, status }: Props) {
  if (status) {
    return <StatusSurface status={status} />
  }
  if (source?.pageKey === "about") {
    return <AboutPage />
  }
  if (source?.pageKey === "faq") {
    return <FaqPage />
  }
  return null
}
