import type { GetServerSideProps } from "next"
import {
  type EntityPageProps,
  resolveEntityPage,
} from "@/lib/routing/public-page"
import { StatusSurface } from "@/lib/routing/status-surface"

type Props = EntityPageProps<never>
export const getServerSideProps: GetServerSideProps<Props> = (context) =>
  resolveEntityPage(context, "campaign", async () => ({ type: "unavailable" }))
export default function EntityPage({ status }: Props) {
  return status ? <StatusSurface status={status} /> : null
}
