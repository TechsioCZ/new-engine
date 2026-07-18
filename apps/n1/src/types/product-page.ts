export type ProducerEntity = {
  name: string
  address: string
  taxId?: string | undefined
  email?: string | undefined
  phone?: string | undefined
}

export type ParsedProducerInfo = {
  sizingGuideUrl?: string | undefined
  manufacturer?: ProducerEntity | undefined
  responsiblePerson?: ProducerEntity | undefined
  distributor?: string | undefined
}
