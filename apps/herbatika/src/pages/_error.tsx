import type { NextPageContext } from "next"
import Head from "next/head"

export default function ErrorPage({ statusCode }: { statusCode: number }) {
  return (
    <>
      <Head>
        <meta content="noindex, nofollow" name="robots" />
      </Head>
      <main className="mx-auto min-h-dvh w-full max-w-max-w p-500">
        <h1 className="font-bold text-3xl">{statusCode}</h1>
        <p>The storefront is temporarily unavailable.</p>
      </main>
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
