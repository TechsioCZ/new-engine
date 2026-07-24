import type { BrandAttributeInput as ModuleBrandAttributeInput } from "../../modules/brand/service"

export type BrandAttributeInput = ModuleBrandAttributeInput

export type BrandAttributeTypeInput = {
  name: string
}

export type BrandInput = {
  title: string
  handle?: string | undefined
  attributes?: BrandAttributeInput[] | undefined
  gpsr_contact_email?: string | null | undefined
  gpsr_european_reseller_contact_email?: string | null | undefined
  gpsr_european_reseller_manufacturing_company_name?: string | null | undefined
  gpsr_european_reseller_postal_address?: string | null | undefined
  gpsr_manufactured_outside_eu?: boolean | undefined
  gpsr_manufacturing_company_name?: string | null | undefined
  gpsr_postal_address?: string | null | undefined
}

export type CreateBrandsWorkflowInput = {
  brands: BrandInput[]
}

export type UpdateBrandsWorkflowInput = {
  selector: {
    id: string
  }
  update: {
    [Key in keyof BrandInput]?: BrandInput[Key] | undefined
  }
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
