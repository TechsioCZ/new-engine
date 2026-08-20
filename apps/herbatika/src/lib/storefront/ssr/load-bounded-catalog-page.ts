type CatalogPage = Readonly<{ totalPages: number }>

type LoadBoundedCatalogPageInput<Page extends CatalogPage> = Readonly<{
  loadPage: (page: number) => Promise<Page>
  requestedPage: number
}>

export const loadBoundedCatalogPage = async <Page extends CatalogPage>({
  loadPage,
  requestedPage,
}: LoadBoundedCatalogPageInput<Page>): Promise<Page> => {
  if (requestedPage <= 1) {
    return loadPage(1)
  }

  const firstPage = await loadPage(1)
  return requestedPage > firstPage.totalPages
    ? firstPage
    : loadPage(requestedPage)
}
