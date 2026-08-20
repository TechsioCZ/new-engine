import { StorefrontLink } from "@/components/storefront-link"

export type EntityIndexItem = Readonly<{
  href: string
  id: string
  label: string
}>

export function EntityIndexPage({
  items,
  title,
}: Readonly<{ items: readonly EntityIndexItem[]; title: string }>) {
  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-500 p-500 font-rubik 2xl:p-700">
      <h1 className="font-bold text-4xl text-fg-primary leading-snug">
        {title}
      </h1>
      <ul className="grid gap-250 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <li key={item.id}>
            <StorefrontLink
              className="block rounded-sm border border-border-secondary bg-surface p-350 font-semibold text-primary hover:border-primary hover:underline"
              href={item.href}
            >
              {item.label}
            </StorefrontLink>
          </li>
        ))}
      </ul>
    </main>
  )
}
