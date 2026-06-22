import type { BrandAttributeInput as ModuleBrandAttributeInput } from "../../modules/brand/service"

export type BrandAttributeInput = ModuleBrandAttributeInput

export type BrandAttributeTypeInput = {
  name: string
}

export type BrandInput = {
  title: string
  handle: string
  attributes?: BrandAttributeInput[]
}

export type CreateBrandsWorkflowInput = {
  brands: BrandInput[]
}

export type UpdateBrandsWorkflowInput = {
  selector: {
    id: string
  }
  update: Partial<BrandInput>
}

export type DeleteBrandsWorkflowInput = {
  ids: string[]
}

export type RestoreBrandsWorkflowInput = {
  ids: string[]
}

export type SetProductBrandsWorkflowInput = {
  product_id: string
  brand_ids: string[]
}

export type SetBrandProductsWorkflowInput = {
  brand_id: string
  product_ids: string[]
}

export type CreateBrandAttributeTypesWorkflowInput = {
  attribute_types: BrandAttributeTypeInput[]
}

export type DeleteBrandAttributeTypesWorkflowInput = {
  ids: string[]
}

export type RestoreBrandAttributeTypesWorkflowInput = {
  ids: string[]
}
