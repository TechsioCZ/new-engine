import type { BrandAttributeInput as ModuleBrandAttributeInput } from "../../modules/brand/service"

export type BrandAttributeInput = ModuleBrandAttributeInput

export interface BrandAttributeTypeInput {
  name: string
}

export interface BrandInput {
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

export interface CreateBrandsWorkflowInput {
  brands: BrandInput[]
}

export interface UpdateBrandsWorkflowInput {
  selector: {
    id: string
  }
  update: {
    [Key in keyof BrandInput]?: BrandInput[Key] | undefined
  }
}

export interface DeleteBrandsWorkflowInput {
  ids: string[]
}

export interface RestoreBrandsWorkflowInput {
  ids: string[]
}

export interface SetProductBrandsWorkflowInput {
  product_id: string
  brand_ids: string[]
  dismiss_inactive?: boolean
  fail_on_conflict?: boolean
}

export interface BatchLinkProductsToBrandWorkflowInput {
  add: string[]
  brand_id: string
  remove: string[]
}

export interface CreateBrandAttributeTypesWorkflowInput {
  attribute_types: BrandAttributeTypeInput[]
}

export interface DeleteBrandAttributeTypesWorkflowInput {
  ids: string[]
}

export interface RestoreBrandAttributeTypesWorkflowInput {
  ids: string[]
}
