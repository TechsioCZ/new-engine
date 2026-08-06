import type { GetServerSideProps } from "next"
import {
  type IndexPageProps,
  resolveIndexPage,
} from "@/lib/routing/public-page"
import { StatusSurface } from "@/lib/routing/status-surface"

type Props = IndexPageProps<{ title: string }>
export const getServerSideProps: GetServerSideProps<Props> = (context) =>
  resolveIndexPage(context, "product", async () => ({
    type: "found",
    value: { title: "Products" },
  }))
export default function IndexPage({ source, status }: Props) {
  if (status) {
    return <StatusSurface status={status} />
  }
  return (
    <main>
      <h1>{source?.title}</h1>
    </main>
  )
}
