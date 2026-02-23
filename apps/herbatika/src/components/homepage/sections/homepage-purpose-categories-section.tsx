import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Link } from "@techsio/ui-kit/atoms/link";
import NextLink from "next/link";
import type { PurposeCategoryItem } from "@/components/homepage/homepage.data";

type HomepagePurposeCategoriesSectionProps = {
  categories: PurposeCategoryItem[];
};

export function HomepagePurposeCategoriesSection({
  categories,
}: HomepagePurposeCategoriesSectionProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="space-y-350" id="purpose-categories">
      <div className="flex items-center justify-between gap-300">
        <h2 className="text-3xl leading-snug font-bold text-fg-primary lg:text-4xl">
          Čo vás trápi? Nakupujte podľa účelu
        </h2>
        <Link
          as={NextLink}
          className="shrink-0 text-sm leading-snug text-fg-primary underline underline-offset-2 hover:text-primary"
          href="/c/trapi-ma"
        >
          Zobraziť všetky
        </Link>
      </div>

      <div className="relative">
        <ul className="flex gap-250 overflow-x-auto pb-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((category) => (
            <li className="home-purpose-item w-full flex-1" key={category.id}>
              <Link
                as={NextLink}
                className="home-purpose-card group flex flex-col items-center justify-center gap-200 rounded-md border border-border-secondary bg-surface px-250 py-250 text-center transition-colors hover:border-primary/30 hover:bg-highlight"
                href={category.href}
              >
                <span className="flex h-700 w-700 items-center justify-center rounded-full bg-highlight text-primary transition-colors group-hover:bg-primary/10">
                  <Icon className="text-3xl" icon={category.icon} />
                </span>
                <span className="text-md leading-snug font-semibold text-fg-primary">
                  {category.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Link
          aria-label="Zobraziť všetky kategórie Trápi ma"
          as={NextLink}
          className="-translate-y-1/2 absolute top-1/2 right-100 hidden h-750 w-750 items-center justify-center rounded-full border border-border-secondary bg-surface text-2xl text-primary shadow-sm transition-colors hover:bg-highlight xl:inline-flex"
          href="/c/trapi-ma"
        >
          <Icon icon="icon-[mdi--chevron-right]" />
        </Link>
      </div>
    </section>
  );
}
