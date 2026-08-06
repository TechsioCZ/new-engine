import type { NextPageContext } from "next"

type ErrorPageProps = { statusCode: number }

export default function ErrorPage({ statusCode }: ErrorPageProps) {
  return (
    <main>
      <h1>{statusCode}</h1>
      <p>Storefront request failed.</p>
    </main>
  )
}

ErrorPage.getInitialProps = ({
  err,
  res,
}: NextPageContext): ErrorPageProps => ({
  statusCode: res?.statusCode ?? err?.statusCode ?? 500,
})
