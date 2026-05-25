export {}

/**
 * @schema SymmyValidationErrorResponse
 * type: object
 * required:
 *   - error
 * properties:
 *   error:
 *     type: object
 *     required:
 *       - code
 *       - message
 *       - details
 *     properties:
 *       code:
 *         type: string
 *         enum:
 *           - VALIDATION_ERROR
 *       message:
 *         type: string
 *         enum:
 *           - Invalid request parameters
 *       details:
 *         type: object
 *         required:
 *           - message
 *         properties:
 *           message:
 *             type: string
 */

/**
 * @schema SymmyPriceListsQueryValidationErrorResponse
 * type: object
 * required:
 *   - error
 * properties:
 *   error:
 *     type: object
 *     required:
 *       - code
 *       - message
 *     properties:
 *       code:
 *         type: string
 *         enum:
 *           - VALIDATION_ERROR
 *       message:
 *         type: string
 *         enum:
 *           - limit and offset must be numeric
 */

/**
 * @schema SymmyUnauthorizedErrorResponse
 * type: object
 * required:
 *   - error
 * properties:
 *   error:
 *     type: object
 *     required:
 *       - code
 *       - message
 *     properties:
 *       code:
 *         type: string
 *         enum:
 *           - UNAUTHORIZED
 *       message:
 *         type: string
 *         enum:
 *           - Missing or invalid authentication token
 */

/**
 * @schema SymmyNotFoundErrorResponse
 * type: object
 * required:
 *   - error
 * properties:
 *   error:
 *     type: object
 *     required:
 *       - code
 *       - message
 *       - details
 *     properties:
 *       code:
 *         type: string
 *         enum:
 *           - NOT_FOUND
 *       message:
 *         type: string
 *         enum:
 *           - Resource not found
 *       details:
 *         type: object
 *         required:
 *           - message
 *         properties:
 *           message:
 *             type: string
 */

/**
 * @schema SymmyInternalErrorResponse
 * type: object
 * required:
 *   - error
 * properties:
 *   error:
 *     type: object
 *     required:
 *       - code
 *       - message
 *     properties:
 *       code:
 *         type: string
 *         enum:
 *           - INTERNAL_ERROR
 *       message:
 *         type: string
 *         enum:
 *           - An unexpected error occurred
 */

/**
 * @schema SymmyQueuedJobResponse
 * type: object
 * required:
 *   - job_id
 *   - status
 *   - status_url
 * properties:
 *   job_id:
 *     type: string
 *   status:
 *     type: string
 *     enum:
 *       - queued
 *       - running
 *       - completed
 *       - failed
 *   status_url:
 *     type: string
 */

/**
 * @schema SymmyWebhookEndpoint
 * type: object
 * required:
 *   - url
 * properties:
 *   url:
 *     type: string
 *     format: uri
 *   enabled:
 *     type: boolean
 *     default: true
 */

/**
 * @schema SymmyWebhookConfig
 * type: object
 * required:
 *   - id
 *   - is_enabled
 *   - endpoints
 * properties:
 *   id:
 *     type: string
 *   is_enabled:
 *     type: boolean
 *   endpoints:
 *     type: array
 *     items:
 *       $ref: "#/components/schemas/SymmyWebhookEndpoint"
 *   created_at:
 *     type: string
 *     format: date-time
 *   updated_at:
 *     type: string
 *     format: date-time
 */

/**
 * @schema SymmyWebhookConfigResponse
 * type: object
 * required:
 *   - config
 * properties:
 *   config:
 *     $ref: "#/components/schemas/SymmyWebhookConfig"
 */

/**
 * @schema SymmyUpdateWebhookConfigRequest
 * type: object
 * properties:
 *   is_enabled:
 *     type: boolean
 *   endpoints:
 *     type: array
 *     items:
 *       $ref: "#/components/schemas/SymmyWebhookEndpoint"
 */

/**
 * @schema SymmyImportJob
 * type: object
 * required:
 *   - id
 *   - type
 *   - status
 *   - total
 *   - processed
 *   - failed
 *   - attempts
 *   - result
 *   - error
 *   - started_at
 *   - finished_at
 * properties:
 *   id:
 *     type: string
 *   type:
 *     type: string
 *   status:
 *     type: string
 *     enum:
 *       - queued
 *       - running
 *       - completed
 *       - failed
 *   total:
 *     type: number
 *   processed:
 *     type: number
 *   failed:
 *     type: number
 *   attempts:
 *     type: number
 *   result:
 *     type: object
 *     nullable: true
 *     additionalProperties: true
 *   error:
 *     type: string
 *     nullable: true
 *   created_at:
 *     type: string
 *     format: date-time
 *   updated_at:
 *     type: string
 *     format: date-time
 *   started_at:
 *     type: string
 *     format: date-time
 *     nullable: true
 *   finished_at:
 *     type: string
 *     format: date-time
 *     nullable: true
 */

/**
 * @schema SymmyImportJobResponse
 * type: object
 * required:
 *   - job
 * properties:
 *   job:
 *     $ref: "#/components/schemas/SymmyImportJob"
 */

/**
 * @schema SymmyPrice
 * type: object
 * required:
 *   - currency_code
 *   - amount
 * properties:
 *   currency_code:
 *     type: string
 *     minLength: 3
 *     maxLength: 3
 *   amount:
 *     type: number
 *     minimum: 0
 */

/**
 * @schema SymmyProductVariantInput
 * type: object
 * required:
 *   - identifier_type
 *   - title
 * properties:
 *   identifier_type:
 *     type: string
 *     enum:
 *       - sku
 *       - ean
 *       - variant_id
 *   sku:
 *     type: string
 *   ean:
 *     type: string
 *   variant_id:
 *     type: string
 *   title:
 *     type: string
 *   manage_inventory:
 *     type: boolean
 *     default: true
 *   vat_rate:
 *     type: number
 *     minimum: 0
 *   prices:
 *     type: array
 *     maxItems: 50
 *     items:
 *       $ref: "#/components/schemas/SymmyPrice"
 *   options:
 *     type: object
 *     additionalProperties:
 *       oneOf:
 *         - type: string
 *         - type: number
 *   metadata:
 *     type: object
 *     additionalProperties: true
 */

/**
 * @schema SymmyProductInput
 * type: object
 * required:
 *   - identifier_type
 *   - title
 * properties:
 *   identifier_type:
 *     type: string
 *     enum:
 *       - sku
 *       - ean
 *       - erp_id
 *   sku:
 *     type: string
 *   ean:
 *     type: string
 *   erp_id:
 *     type: string
 *   title:
 *     type: string
 *   subtitle:
 *     type: string
 *   description:
 *     type: string
 *   handle:
 *     type: string
 *   status:
 *     type: string
 *     enum:
 *       - published
 *       - draft
 *     default: published
 *   discountable:
 *     type: boolean
 *     default: true
 *   weight:
 *     type: integer
 *     minimum: 0
 *   hs_code:
 *     type: string
 *   categories:
 *     type: array
 *     maxItems: 50
 *     items:
 *       type: object
 *       properties:
 *         handle:
 *           type: string
 *         name:
 *           type: string
 *   images:
 *     type: array
 *     maxItems: 50
 *     items:
 *       type: object
 *       required:
 *         - url
 *       properties:
 *         url:
 *           type: string
 *           format: uri
 *   base_prices:
 *     type: array
 *     maxItems: 50
 *     items:
 *       $ref: "#/components/schemas/SymmyPrice"
 *   variants:
 *     type: array
 *     maxItems: 100
 *     items:
 *       $ref: "#/components/schemas/SymmyProductVariantInput"
 *   metadata:
 *     type: object
 *     additionalProperties: true
 */

/**
 * @schema SymmyUpsertProductsBatchRequest
 * type: object
 * required:
 *   - products
 * properties:
 *   products:
 *     type: array
 *     minItems: 1
 *     maxItems: 500
 *     items:
 *       $ref: "#/components/schemas/SymmyProductInput"
 */

/**
 * @schema SymmyCustomerAddressInput
 * type: object
 * required:
 *   - address_1
 *   - city
 *   - postal_code
 *   - country_code
 * properties:
 *   address_id:
 *     type: string
 *   first_name:
 *     type: string
 *   last_name:
 *     type: string
 *   company:
 *     type: string
 *   address_1:
 *     type: string
 *   address_2:
 *     type: string
 *   city:
 *     type: string
 *   postal_code:
 *     type: string
 *   country_code:
 *     type: string
 *   phone:
 *     type: string
 */

/**
 * @schema SymmyCustomerInput
 * type: object
 * required:
 *   - identifier_type
 *   - first_name
 *   - last_name
 * properties:
 *   identifier_type:
 *     type: string
 *     enum:
 *       - email
 *       - erp_id
 *       - customer_id
 *       - vat_id
 *       - company_registration_number
 *   email:
 *     type: string
 *     format: email
 *   customer_id:
 *     type: string
 *   first_name:
 *     type: string
 *   last_name:
 *     type: string
 *   phone:
 *     type: string
 *   company_name:
 *     type: string
 *   addresses:
 *     type: array
 *     maxItems: 50
 *     items:
 *       $ref: "#/components/schemas/SymmyCustomerAddressInput"
 *   customer_group_codes:
 *     type: array
 *     maxItems: 100
 *     items:
 *       type: string
 *   metadata:
 *     type: object
 *     additionalProperties: true
 */

/**
 * @schema SymmyUpsertCustomersBatchRequest
 * type: object
 * required:
 *   - customers
 * properties:
 *   customers:
 *     type: array
 *     minItems: 1
 *     maxItems: 500
 *     items:
 *       $ref: "#/components/schemas/SymmyCustomerInput"
 */

/**
 * @schema SymmyCustomerGroupInput
 * type: object
 * required:
 *   - identifier_type
 *   - name
 * properties:
 *   identifier_type:
 *     type: string
 *     enum:
 *       - customer_group_id
 *       - name
 *       - code
 *       - erp_code
 *   customer_group_id:
 *     type: string
 *   name:
 *     type: string
 *   code:
 *     type: string
 *   erp_code:
 *     type: string
 *   metadata:
 *     type: object
 *     additionalProperties: true
 */

/**
 * @schema SymmyUpsertCustomerGroupsBatchRequest
 * type: object
 * required:
 *   - customer_groups
 * properties:
 *   customer_groups:
 *     type: array
 *     minItems: 1
 *     maxItems: 500
 *     items:
 *       $ref: "#/components/schemas/SymmyCustomerGroupInput"
 */

/**
 * @schema SymmyUpsertCustomerGroupsBatchResponse
 * type: object
 * required:
 *   - success
 *   - processed
 *   - failed
 *   - results
 * properties:
 *   success:
 *     type: boolean
 *   processed:
 *     type: number
 *   failed:
 *     type: number
 *   results:
 *     type: array
 *     items:
 *       type: object
 *       required:
 *         - identifier_type
 *         - status
 *       properties:
 *         identifier_type:
 *           type: string
 *           enum:
 *             - customer_group_id
 *             - name
 *             - code
 *             - erp_code
 *         customer_group_id:
 *           type: string
 *         name:
 *           type: string
 *         code:
 *           type: string
 *         erp_code:
 *           type: string
 *         status:
 *           type: string
 *           enum:
 *             - created
 *             - updated
 *             - failed
 *         error:
 *           type: string
 */

/**
 * @schema SymmyCustomerIdentifier
 * type: object
 * required:
 *   - identifier_type
 * properties:
 *   identifier_type:
 *     type: string
 *     enum:
 *       - email
 *       - customer_id
 *       - erp_id
 *   email:
 *     type: string
 *     format: email
 *   customer_id:
 *     type: string
 *   erp_id:
 *     type: string
 */

/**
 * @schema SymmyAssignCustomersToGroupBatchRequest
 * type: object
 * required:
 *   - customer_identifiers
 * properties:
 *   customer_identifiers:
 *     type: array
 *     minItems: 1
 *     maxItems: 500
 *     items:
 *       $ref: "#/components/schemas/SymmyCustomerIdentifier"
 */

/**
 * @schema SymmyStockUpdateInput
 * type: object
 * required:
 *   - identifier_type
 *   - stocked_quantity
 * properties:
 *   identifier_type:
 *     type: string
 *     enum:
 *       - sku
 *       - ean
 *       - variant_id
 *       - inventory_item_id
 *   sku:
 *     type: string
 *   ean:
 *     type: string
 *   variant_id:
 *     type: string
 *   inventory_item_id:
 *     type: string
 *   location_id:
 *     type: string
 *   stocked_quantity:
 *     type: integer
 *     minimum: 0
 *   reserved_quantity:
 *     type: integer
 *     minimum: 0
 */

/**
 * @schema SymmyUpdateStockBatchRequest
 * type: object
 * required:
 *   - updates
 * properties:
 *   updates:
 *     type: array
 *     minItems: 1
 *     maxItems: 500
 *     items:
 *       $ref: "#/components/schemas/SymmyStockUpdateInput"
 */

/**
 * @schema SymmyUpdateStockBatchResponse
 * type: object
 * required:
 *   - success
 *   - updated
 *   - failed
 *   - results
 * properties:
 *   success:
 *     type: boolean
 *   updated:
 *     type: number
 *   failed:
 *     type: number
 *   results:
 *     type: array
 *     items:
 *       type: object
 *       required:
 *         - identifier_type
 *         - identifier
 *         - status
 *       properties:
 *         identifier_type:
 *           type: string
 *           enum:
 *             - sku
 *             - ean
 *             - variant_id
 *             - inventory_item_id
 *         identifier:
 *           type: string
 *         status:
 *           type: string
 *           enum:
 *             - updated
 *             - failed
 *             - not_found
 *         inventory_item_id:
 *           type: string
 *         stocked_quantity:
 *           type: number
 *         available_quantity:
 *           type: number
 *         error:
 *           type: string
 */

/**
 * @schema SymmyInvoiceInput
 * type: object
 * required:
 *   - identifier_type
 *   - invoice_number
 * properties:
 *   identifier_type:
 *     type: string
 *     enum:
 *       - display_id
 *       - order_id
 *       - erp_id
 *   display_id:
 *     type: string
 *   order_id:
 *     type: string
 *   erp_id:
 *     type: string
 *   invoice_number:
 *     type: string
 *   invoice_date:
 *     type: string
 *     format: date
 *   url:
 *     type: string
 *     format: uri
 *   data:
 *     type: string
 */

/**
 * @schema SymmyAttachInvoicesBatchRequest
 * type: object
 * required:
 *   - invoices
 * properties:
 *   invoices:
 *     type: array
 *     minItems: 1
 *     maxItems: 500
 *     items:
 *       $ref: "#/components/schemas/SymmyInvoiceInput"
 */

/**
 * @schema SymmyAttachInvoicesBatchResponse
 * type: object
 * required:
 *   - success
 *   - processed
 *   - failed
 *   - results
 * properties:
 *   success:
 *     type: boolean
 *   processed:
 *     type: number
 *   failed:
 *     type: number
 *   results:
 *     type: array
 *     items:
 *       type: object
 *       required:
 *         - order_identifier
 *         - status
 *         - invoice_number
 *       properties:
 *         order_identifier:
 *           type: string
 *         status:
 *           type: string
 *           enum:
 *             - success
 *             - failed
 *             - not_found
 *         order_id:
 *           type: string
 *         invoice_number:
 *           type: string
 *         invoice_url:
 *           type: string
 *         error:
 *           type: string
 */

/**
 * @schema SymmyPriceListPriceInput
 * type: object
 * required:
 *   - identifier_type
 *   - currency_code
 *   - amount
 * properties:
 *   identifier_type:
 *     type: string
 *     enum:
 *       - sku
 *       - ean
 *       - variant_id
 *   sku:
 *     type: string
 *   ean:
 *     type: string
 *   variant_id:
 *     type: string
 *   currency_code:
 *     type: string
 *     minLength: 3
 *     maxLength: 3
 *   amount:
 *     type: number
 *     minimum: 0
 *   min_quantity:
 *     type: integer
 *     minimum: 1
 *     default: 1
 */

/**
 * @schema SymmyPriceListInput
 * type: object
 * required:
 *   - code
 *   - name
 * properties:
 *   code:
 *     type: string
 *   name:
 *     type: string
 *   description:
 *     type: string
 *   type:
 *     type: string
 *     enum:
 *       - sale
 *       - override
 *     default: sale
 *   status:
 *     type: string
 *     enum:
 *       - active
 *       - draft
 *     default: active
 *   starts_at:
 *     type: string
 *     format: date-time
 *   ends_at:
 *     type: string
 *     format: date-time
 *   customer_group_code:
 *     type: string
 *   prices:
 *     type: array
 *     maxItems: 500
 *     items:
 *       $ref: "#/components/schemas/SymmyPriceListPriceInput"
 */

/**
 * @schema SymmyUpsertPriceListsBatchRequest
 * type: object
 * required:
 *   - price_lists
 * properties:
 *   price_lists:
 *     type: array
 *     minItems: 1
 *     maxItems: 500
 *     items:
 *       $ref: "#/components/schemas/SymmyPriceListInput"
 */

/**
 * @schema SymmyUpdatePriceListPricesBatchRequest
 * type: object
 * required:
 *   - prices
 * properties:
 *   prices:
 *     type: array
 *     minItems: 1
 *     maxItems: 500
 *     items:
 *       $ref: "#/components/schemas/SymmyPriceListPriceInput"
 */

/**
 * @schema SymmyListPriceListsResponse
 * type: object
 * required:
 *   - price_lists
 *   - count
 *   - offset
 *   - limit
 * properties:
 *   price_lists:
 *     type: array
 *     items:
 *       type: object
 *       required:
 *         - id
 *         - code
 *         - name
 *       properties:
 *         id:
 *           type: string
 *         code:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         starts_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         ends_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *   count:
 *     type: number
 *   offset:
 *     type: number
 *   limit:
 *     type: number
 */

/**
 * @schema SymmyTrackingItemInput
 * type: object
 * required:
 *   - sku
 *   - quantity
 * properties:
 *   sku:
 *     type: string
 *   quantity:
 *     type: integer
 *     minimum: 1
 */

/**
 * @schema SymmyTrackingShipmentInput
 * type: object
 * required:
 *   - identifier_type
 *   - tracking_number
 * properties:
 *   identifier_type:
 *     type: string
 *     enum:
 *       - display_id
 *       - order_id
 *       - erp_id
 *   display_id:
 *     type: string
 *   order_id:
 *     type: string
 *   erp_id:
 *     type: string
 *   tracking_number:
 *     type: string
 *   tracking_url:
 *     type: string
 *     format: uri
 *   carrier:
 *     type: string
 *   send_notification:
 *     type: boolean
 *     default: true
 *   items:
 *     type: array
 *     items:
 *       $ref: "#/components/schemas/SymmyTrackingItemInput"
 */

/**
 * @schema SymmyAddTrackingBatchRequest
 * type: object
 * required:
 *   - shipments
 * properties:
 *   shipments:
 *     type: array
 *     minItems: 1
 *     maxItems: 500
 *     items:
 *       $ref: "#/components/schemas/SymmyTrackingShipmentInput"
 */

/**
 * @schema SymmyAddTrackingBatchResponse
 * type: object
 * required:
 *   - success
 *   - processed
 *   - failed
 *   - results
 * properties:
 *   success:
 *     type: boolean
 *   processed:
 *     type: number
 *   failed:
 *     type: number
 *   results:
 *     type: array
 *     items:
 *       type: object
 *       required:
 *         - order_identifier
 *         - status
 *       properties:
 *         order_identifier:
 *           type: string
 *         status:
 *           type: string
 *           enum:
 *             - success
 *             - failed
 *             - not_found
 *         order_id:
 *           type: string
 *         fulfillment_id:
 *           type: string
 *         shipment_id:
 *           type: string
 *         notification_sent:
 *           type: boolean
 *         error:
 *           type: string
 */
