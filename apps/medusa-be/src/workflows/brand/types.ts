import type { BrandAttributeInput as ModuleBrandAttributeInput } from "../../modules/brand/service"

export type BrandAttributeInput = ModuleBrandAttributeInput

export type BrandAttributeTypeInput = {
  name: string
}

export type BrandInput = {
  title: string
  handle?: string
  attributes?: BrandAttributeInput[]
  gpsr_contact_email?: string | null
  gpsr_european_reseller_contact_email?: string | null
  gpsr_european_reseller_manufacturing_company_name?: string | null
  gpsr_european_reseller_postal_address?: string | null
  gpsr_manufactured_outside_eu?: boolean
  gpsr_manufacturing_company_name?: string | null
  gpsr_postal_address?: string | null
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
  fail_on_conflict?: boolean
}

export type BatchLinkProductsToBrandWorkflowInput = {
  add: string[]
  brand_id: string
  remove: string[]
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
