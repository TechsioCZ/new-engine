import { StorefrontLink } from "@/components/storefront-link"

export type RegistryIndexItem = {
  href: string
  id: string
  title: string
}

type RegistryIndexPageProps = {
  emptyLabel: string
  items: RegistryIndexItem[]
  title: string
}

export function RegistryIndexPage({
  emptyLabel,
  items,
  title,
}: RegistryIndexPageProps) {
  return (
    <main className="mx-auto flex min-h-[50dvh] w-full max-w-max-w flex-col gap-500 p-500">
      <h1 className="font-bold text-4xl text-fg-primary">{title}</h1>
      {items.length ? (
        <ul className="grid gap-300 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id}>
              <StorefrontLink
                className="block rounded-lg border border-border-secondary bg-base p-400 font-medium text-fg-primary hover:border-primary hover:text-primary"
                href={item.href}
              >
                {item.title}
              </StorefrontLink>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-fg-secondary">{emptyLabel}</p>
      )}
    </main>
  )
}
