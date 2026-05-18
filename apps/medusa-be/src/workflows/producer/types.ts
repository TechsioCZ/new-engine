export type ProducerAttributeInput = {
  name: string
  value: string
}

export type ProducerAttributeTypeInput = {
  name: string
}

export type ProducerInput = {
  title: string
  handle: string
  attributes?: ProducerAttributeInput[]
}

export type CreateProducersWorkflowInput = {
  producers: ProducerInput[]
}

export type UpdateProducersWorkflowInput = {
  selector: {
    id: string
  }
  update: Partial<ProducerInput>
}

export type DeleteProducersWorkflowInput = {
  ids: string[]
}

export type RestoreProducersWorkflowInput = {
  ids: string[]
}

export type SetProductProducersWorkflowInput = {
  product_id: string
  producer_ids: string[]
}

export type SetProducerProductsWorkflowInput = {
  producer_id: string
  product_ids: string[]
}

export type CreateProducerAttributeTypesWorkflowInput = {
  attribute_types: ProducerAttributeTypeInput[]
}

export type DeleteProducerAttributeTypesWorkflowInput = {
  ids: string[]
}

export type RestoreProducerAttributeTypesWorkflowInput = {
  ids: string[]
}
