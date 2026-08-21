import { runRomanianCatalogSourceCli } from "./cli"

runRomanianCatalogSourceCli()
  .then((authority) => {
    console.log(
      JSON.stringify({
        inventory: authority.inventory,
        manifestSha256: authority.manifestSha256,
        partitions: {
          brands: {
            excluded: authority.partitions.brands.excludedIds.length,
            published: authority.partitions.brands.publishedIds.length,
          },
          categories: {
            excluded: authority.partitions.categories.excludedIds.length,
            published: authority.partitions.categories.publishedIds.length,
          },
          products: {
            excluded: authority.partitions.products.excludedIds.length,
            published: authority.partitions.products.publishedIds.length,
          },
        },
        preimagesSha256: authority.preimagesSha256,
      })
    )
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
