import type { NextPageContext } from "next"
import Head from "next/head"
import { StandalonePagesError } from "@/lib/routing/pages/standalone-pages-error"

export default function ErrorPage({ statusCode }: { statusCode: number }) {
  return (
    <>
      <Head>
        <meta content="noindex, nofollow" name="robots" />
      </Head>
      <StandalonePagesError kind="unavailable" status={statusCode} />
    </>
  )
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  res?.setHeader(
    "Cache-Control",
    "private, no-store, max-age=0, must-revalidate"
  )
  res?.setHeader("X-Robots-Tag", "noindex, nofollow")
  return { statusCode: res?.statusCode ?? err?.statusCode ?? 500 }
}
