"use client"

export default function StorefrontError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="mx-auto flex min-h-[50dvh] w-full max-w-max-w flex-col items-center justify-center gap-300 p-500 text-center">
      <p className="font-semibold text-danger text-sm">500</p>
      <h1 className="font-bold text-3xl text-fg-primary">
        Stránku sa nepodarilo načítať
      </h1>
      <p className="max-w-prose text-fg-secondary">
        Skúste požiadavku zopakovať o chvíľu.
      </p>
      <button
        className="rounded-md bg-accent px-400 py-250 font-semibold text-on-accent"
        onClick={reset}
        type="button"
      >
        Skúsiť znova
      </button>
    </main>
  )
}
