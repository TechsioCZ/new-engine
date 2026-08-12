export type BrandEntity = {
  name: string
  address: string
  taxId?: string
  email?: string
  phone?: string
}

export type ParsedBrandInfo = {
  sizingGuideUrl?: string
  manufacturer?: BrandEntity
  responsiblePerson?: BrandEntity
  distributor?: string
}
