import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { buildInventoryItemsInput } from "../helpers/build-inventory-items-input"
// biome-ignore lint/performance/noNamespaceImport: Supplemental import composes existing seed steps through their barrel.
import * as Steps from "../steps"

export type ImportHerbaticaSupplementalProductsWorkflowInput = {
  productCategories: Steps.CreateProductCategoriesStepInput
  products: Steps.CreateProductsStepInput
  stockLocations: Steps.CreateInventoryLevelsStepInput["stockLocations"]
  taxRates: Omit<Steps.CreateTaxRatesStepInput, "enabled" | "productIds">
}

const importHerbaticaSupplementalProductsWorkflow = createWorkflow(
  "import-herbatica-supplemental-products",
  (input: ImportHerbaticaSupplementalProductsWorkflowInput) => {
    const categoryResult = Steps.createProductCategoriesStep(
      input.productCategories
    )
    const productSeedInput: Steps.CreateProductsStepInput = transform(
      { categoryResult, input },
      (data) => data.input.products
    )
    const eanResult = Steps.reconcileProductVariantEansStep(productSeedInput)
    const reconciledProducts: Steps.CreateProductsStepInput = transform(
      { eanResult },
      (data) => data.eanResult.products
    )
    const productResult = Steps.createProductsStep(reconciledProducts)
    const inventoryInput: Steps.CreateInventoryLevelsStepInput = transform(
      { input, productResult },
      (data) => ({
        inventoryItems: buildInventoryItemsInput(data.input.products),
        stockLocations: data.input.stockLocations,
      })
    )
    const inventoryResult = Steps.createInventoryLevelsStep(inventoryInput)
    const taxRateInput: Steps.CreateTaxRatesStepInput = transform(
      { input, productResult },
      (data) => ({
        ...data.input.taxRates,
        enabled: true,
        productIds: data.productResult.result,
      })
    )
    const taxRateResult = Steps.createTaxRatesStep(taxRateInput)

    return new WorkflowResponse({
      categoryResult,
      eanResult,
      inventoryResult,
      productResult,
      taxRateResult,
    })
  }
)

export default importHerbaticaSupplementalProductsWorkflow
