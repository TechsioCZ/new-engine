export type TrackingOrderIdentifierType = "display_id" | "order_id" | "erp_id"

export type TrackingItemInput = {
  sku: string
  quantity: number
}

export type TrackingShipmentInput = {
  identifier_type: TrackingOrderIdentifierType
  display_id?: string | undefined
  order_id?: string | undefined
  erp_id?: string | undefined
  tracking_number: string
  tracking_url?: string | undefined
  carrier?: string | undefined
  send_notification?: boolean | undefined
  items?: TrackingItemInput[] | undefined
}

export type AddTrackingBatchInput = {
  created_by?: string | undefined
  shipments: TrackingShipmentInput[]
}

export type AddTrackingBatchResult = {
  order_identifier: string
  status: "success" | "failed" | "not_found"
  order_id?: string
  fulfillment_id?: string
  shipment_id?: string
  notification_sent?: boolean
  error?: string
}

export type AddTrackingBatchOutput = {
  success: boolean
  processed: number
  failed: number
  results: AddTrackingBatchResult[]
}
