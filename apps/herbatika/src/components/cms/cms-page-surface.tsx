import { CategoryRichText } from "@/components/category/category-rich-text";
import {
  HerbatikaBreadcrumb,
  type HerbatikaBreadcrumbItem,
} from "@/components/herbatika-breadcrumb";
import type { CmsPage } from "@/lib/storefront/cms";

type CmsPageSurfaceProps = {
  page: CmsPage;
};

export function CmsPageSurface({ page }: CmsPageSurfaceProps) {
  const pageContent = typeof page.content === "string" ? page.content : null;
  const breadcrumbItems: HerbatikaBreadcrumbItem[] = [
    {
      label: "Informácie",
      href: "/",
      icon: "token-icon-home",
    },
    {
      label: page.title ?? "Stránka",
    },
  ];

  return (
    <main className="w-full bg-base font-rubik">
      <div className="mx-auto flex w-full max-w-max-w flex-col gap-500 p-about-page 2xl:p-about-page-lg">
        <HerbatikaBreadcrumb items={breadcrumbItems} />

        <article className="space-y-500 rounded-2xl border border-border-secondary bg-surface p-400 md:p-600">
          <header className="space-y-200">
            {page.category?.title ? (
              <p className="text-sm leading-normal font-semibold text-primary">
                {page.category.title}
              </p>
            ) : null}
            <h1 className="text-4xl leading-tight font-bold text-fg-primary">
              {page.title}
            </h1>
          </header>

          <CategoryRichText
            className="max-w-4xl text-md [&_p+p]:mt-300"
            html={pageContent}
          />
        </article>
      </div>
    </main>
  );
}
