import Link from "next/link"

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-400 py-700">
      <article className="space-y-400">
        <h1 className="relative font-bold text-2xl after:absolute after:bottom-0 after:left-0 after:h-800 after:w-heading-accent after:bg-primary">
          Stránka nenalezena (404)
        </h1>
        <p className="text-fg-secondary">
          Omlouváme se, ale tato stránka neexistuje. Zkuste se vrátit na hlavní
          stránku a pokračovat v nákupu.
        </p>
        <Link
          className="inline-flex items-center text-primary underline"
          href="/"
        >
          Zpět na hlavní stránku
        </Link>
      </article>
    </main>
  )
}
