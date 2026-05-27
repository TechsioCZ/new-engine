export type TrackingOrderIdentifierType = "display_id" | "order_id" | "erp_id"

export type TrackingItemInput = {
  sku: string
  quantity: number
}

export type TrackingShipmentInput = {
  identifier_type: TrackingOrderIdentifierType
  display_id?: string
  order_id?: string
  erp_id?: string
  tracking_number: string
  tracking_url?: string
  carrier?: string
  send_notification?: boolean
  items?: TrackingItemInput[]
}

export type AddTrackingBatchInput = {
  created_by?: string
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
