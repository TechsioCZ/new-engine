import type { StatusPage } from "./public-page"

export function StatusSurface({ status }: { status: StatusPage }) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-max-w px-400 py-700">
      <h1>{status.code}</h1>
      <p>{status.message}</p>
    </main>
  )
}
