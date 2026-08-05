export type TrackingOrderIdentifierType = "display_id" | "order_id" | "erp_id"

export interface TrackingItemInput {
  sku: string
  quantity: number
}

export interface TrackingShipmentInput {
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

export interface AddTrackingBatchInput {
  created_by?: string | undefined
  shipments: TrackingShipmentInput[]
}

export interface AddTrackingBatchResult {
  order_identifier: string
  status: "success" | "failed" | "not_found"
  order_id?: string
  fulfillment_id?: string
  shipment_id?: string
  notification_sent?: boolean
  error?: string
}

export interface AddTrackingBatchOutput {
  success: boolean
  processed: number
  failed: number
  results: AddTrackingBatchResult[]
}
