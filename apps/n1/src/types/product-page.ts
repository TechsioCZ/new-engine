export interface BrandEntity {
  name: string
  address: string
  taxId?: string | undefined
  email?: string | undefined
  phone?: string | undefined
}

export interface ParsedBrandInfo {
  sizingGuideUrl?: string | undefined
  manufacturer?: BrandEntity | undefined
  responsiblePerson?: BrandEntity | undefined
  distributor?: string | undefined
}
