"use client"

import Link from "next/link"
import { Heading } from "@/components/heading"
import { useSuspenseCategoryRegistry } from "@/hooks/use-category-registry"

export default function CategoryNotFound() {
  const { rootCategories } = useSuspenseCategoryRegistry()

  return (
    <main className="mx-auto grid w-max-w max-w-screen">
      <article className="mt-900 space-y-400 px-500">
        <Heading>Kategorie nenalezena - 404</Heading>
        <p className="text-fg-secondary">
          Omlouváme se, ale tato kategorie neexistuje nebo byla odstraněna.
        </p>
        <nav className="space-y-300">
          <h2 className="font-semibold text-lg">
            Prohlédněte si naše kategorie:
          </h2>
          <ul className="flex flex-wrap gap-200">
            {rootCategories.map((category) => (
              <li key={category.id}>
                <Link
                  className="inline-block bg-surface px-400 py-200 text-fg-primary transition-colors hover:bg-primary"
                  href={`/kategorie/${category.handle}`}
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-fg-tertiary text-sm">
          Nebo se vraťte na{" "}
          <Link
            className="text-fg-primary underline hover:no-underline"
            href="/"
          >
            hlavní stránku
          </Link>
          .
        </p>
      </article>
    </main>
  )
}
