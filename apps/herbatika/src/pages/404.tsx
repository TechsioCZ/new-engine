import Head from "next/head"

export default function NotFoundPage() {
  return (
    <>
      <Head>
        <meta content="noindex, nofollow" name="robots" />
      </Head>
      <main className="mx-auto min-h-dvh w-full max-w-max-w p-500">
        <h1 className="font-bold text-3xl">404</h1>
        <p>Page not found.</p>
      </main>
    </>
  )
}
