import type { GetStaticProps } from "next"
import Head from "next/head"
import { getConfiguredMarketRoutingRuntime } from "@/lib/market/market-runtime.server"
import {
  createStandalonePagesLocaleBootstrap,
  StandalonePagesError,
  type StandalonePagesHostLocales,
} from "@/lib/routing/pages/standalone-pages-error"
import { getHerbatikaMarketContext } from "@/lib/storefront/market-context"

type Props = Readonly<{ hostLocales: StandalonePagesHostLocales }>

export const getStaticProps = (() => {
  const runtime = getConfiguredMarketRoutingRuntime()
  const hostLocales = Object.fromEntries(
    Object.entries(runtime.marketByHost).map(([host, market]) => [
      host,
      getHerbatikaMarketContext(market).htmlLang,
    ])
  )
  return Promise.resolve({ props: { hostLocales } })
}) satisfies GetStaticProps<Props>

export default function NotFoundPage({ hostLocales }: Props) {
  return (
    <>
      <Head>
        <meta content="noindex, nofollow" name="robots" />
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Hostnames and locales come from validated market bindings and `<` is escaped by the serializer.
          dangerouslySetInnerHTML={{
            __html: createStandalonePagesLocaleBootstrap(hostLocales),
          }}
        />
      </Head>
      <StandalonePagesError kind="not_found" status={404} />
    </>
  )
}
