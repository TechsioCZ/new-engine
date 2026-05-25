export {}

/**
 * @schema SymmyValidationErrorResponse
 * type: object
 * description: Validation error returned when a Symmy API request fails schema validation.
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
 * description: Validation error returned when Symmy price-list pagination parameters are invalid.
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
 * description: Authentication error returned when Symmy API credentials are missing or invalid.
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
 * description: Error returned when a requested Symmy resource cannot be found.
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
 * description: Error returned when an unexpected Symmy API failure occurs.
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
 * description: A queued Symmy import job response.
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
 * description: A webhook endpoint that receives Symmy import job notifications.
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
 * description: The Symmy webhook notification configuration.
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
 * description: Response containing the Symmy webhook configuration.
 * required:
 *   - config
 * properties:
 *   config:
 *     $ref: "#/components/schemas/SymmyWebhookConfig"
 */

/**
 * @schema SymmyUpdateWebhookConfigRequest
 * type: object
 * description: Request body used to update Symmy webhook configuration.
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
 * description: A Symmy import job and its processing status.
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
 * description: Response containing a Symmy import job.
 * required:
 *   - job
 * properties:
 *   job:
 *     $ref: "#/components/schemas/SymmyImportJob"
 */

/**
 * @schema SymmyPrice
 * type: object
 * description: A money amount in a specific currency.
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
 * description: Product variant data accepted by Symmy product imports.
 * required:
 *   - identifier_type
 *   - title
 * oneOf:
 *   - required:
 *       - sku
 *     properties:
 *       identifier_type:
 *         enum:
 *           - sku
 *   - required:
 *       - ean
 *     properties:
 *       identifier_type:
 *         enum:
 *           - ean
 *   - required:
 *       - variant_id
 *     properties:
 *       identifier_type:
 *         enum:
 *           - variant_id
 * properties:
 *   identifier_type:
 *     type: string
 *     enum:
 *       - sku
 *       - ean
 *       - variant_id
 *   sku:
 *     type: string
 *     minLength: 1
 *   ean:
 *     type: string
 *     minLength: 1
 *   variant_id:
 *     type: string
 *     minLength: 1
 *   title:
 *     type: string
 *     minLength: 1
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
 * description: Product data accepted by Symmy product imports.
 * required:
 *   - identifier_type
 *   - title
 * oneOf:
 *   - required:
 *       - sku
 *     properties:
 *       identifier_type:
 *         enum:
 *           - sku
 *   - required:
 *       - ean
 *     properties:
 *       identifier_type:
 *         enum:
 *           - ean
 *   - required:
 *       - erp_id
 *     properties:
 *       identifier_type:
 *         enum:
 *           - erp_id
 * properties:
 *   identifier_type:
 *     type: string
 *     enum:
 *       - sku
 *       - ean
 *       - erp_id
 *   sku:
 *     type: string
 *     minLength: 1
 *   ean:
 *     type: string
 *     minLength: 1
 *   erp_id:
 *     type: string
 *     minLength: 1
 *   title:
 *     type: string
 *     minLength: 1
 *   subtitle:
 *     type: string
 *   description:
 *     type: string
 *   handle:
 *     type: string
 *     minLength: 1
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
 *       anyOf:
 *         - required:
 *             - handle
 *         - required:
 *             - name
 *       properties:
 *         handle:
 *           type: string
 *           minLength: 1
 *         name:
 *           type: string
 *           minLength: 1
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
 * description: Request body used to queue product upserts in batch.
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
 * description: Customer address data accepted by Symmy customer imports.
 * required:
 *   - address_1
 *   - city
 *   - postal_code
 *   - country_code
 * properties:
 *   address_id:
 *     type: string
 *     minLength: 1
 *   first_name:
 *     type: string
 *   last_name:
 *     type: string
 *   company:
 *     type: string
 *   address_1:
 *     type: string
 *     minLength: 1
 *   address_2:
 *     type: string
 *   city:
 *     type: string
 *     minLength: 1
 *   postal_code:
 *     type: string
 *     minLength: 1
 *   country_code:
 *     type: string
 *     minLength: 1
 *   phone:
 *     type: string
 */

/**
 * @schema SymmyCustomerInput
 * type: object
 * description: Customer data accepted by Symmy customer imports.
 * required:
 *   - identifier_type
 *   - first_name
 *   - last_name
 * oneOf:
 *   - required:
 *       - email
 *     properties:
 *       identifier_type:
 *         enum:
 *           - email
 *   - required:
 *       - metadata
 *     properties:
 *       identifier_type:
 *         enum:
 *           - erp_id
 *       metadata:
 *         required:
 *           - erp_id
 *   - required:
 *       - customer_id
 *     properties:
 *       identifier_type:
 *         enum:
 *           - customer_id
 *   - required:
 *       - metadata
 *     properties:
 *       identifier_type:
 *         enum:
 *           - vat_id
 *       metadata:
 *         required:
 *           - vat_id
 *   - required:
 *       - metadata
 *     properties:
 *       identifier_type:
 *         enum:
 *           - company_registration_number
 *       metadata:
 *         required:
 *           - company_registration_number
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
 *     minLength: 1
 *   first_name:
 *     type: string
 *     minLength: 1
 *   last_name:
 *     type: string
 *     minLength: 1
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
 *       minLength: 1
 *   metadata:
 *     type: object
 *     properties:
 *       erp_id:
 *         type: string
 *         minLength: 1
 *       vat_id:
 *         type: string
 *         minLength: 1
 *       company_registration_number:
 *         type: string
 *         minLength: 1
 *     additionalProperties: true
 */

/**
 * @schema SymmyUpsertCustomersBatchRequest
 * type: object
 * description: Request body used to queue customer upserts in batch.
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
 * description: Customer group data accepted by Symmy customer group imports.
 * required:
 *   - identifier_type
 *   - name
 * oneOf:
 *   - properties:
 *       identifier_type:
 *         enum:
 *           - name
 *   - required:
 *       - customer_group_id
 *     properties:
 *       identifier_type:
 *         enum:
 *           - customer_group_id
 *   - required:
 *       - code
 *     properties:
 *       identifier_type:
 *         enum:
 *           - code
 *   - required:
 *       - erp_code
 *     properties:
 *       identifier_type:
 *         enum:
 *           - erp_code
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
 *     minLength: 1
 *   name:
 *     type: string
 *     minLength: 1
 *   code:
 *     type: string
 *     minLength: 1
 *   erp_code:
 *     type: string
 *     minLength: 1
 *   metadata:
 *     type: object
 *     additionalProperties: true
 */

/**
 * @schema SymmyUpsertCustomerGroupsBatchRequest
 * type: object
 * description: Request body used to upsert customer groups in batch.
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
 * description: Per-customer-group results returned after a batch upsert.
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
 * description: A customer identifier used to assign customers to a customer group.
 * required:
 *   - identifier_type
 * oneOf:
 *   - required:
 *       - email
 *     properties:
 *       identifier_type:
 *         enum:
 *           - email
 *   - required:
 *       - customer_id
 *     properties:
 *       identifier_type:
 *         enum:
 *           - customer_id
 *   - required:
 *       - erp_id
 *     properties:
 *       identifier_type:
 *         enum:
 *           - erp_id
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
 *     minLength: 1
 *   erp_id:
 *     type: string
 *     minLength: 1
 */

/**
 * @schema SymmyAssignCustomersToGroupBatchRequest
 * type: object
 * description: Request body used to queue customer assignments to a customer group.
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
 * description: Inventory stock update data accepted by Symmy stock imports.
 * required:
 *   - identifier_type
 *   - stocked_quantity
 * oneOf:
 *   - required:
 *       - sku
 *     properties:
 *       identifier_type:
 *         enum:
 *           - sku
 *   - required:
 *       - ean
 *     properties:
 *       identifier_type:
 *         enum:
 *           - ean
 *   - required:
 *       - variant_id
 *     properties:
 *       identifier_type:
 *         enum:
 *           - variant_id
 *   - required:
 *       - inventory_item_id
 *     properties:
 *       identifier_type:
 *         enum:
 *           - inventory_item_id
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
 *     minLength: 1
 *   ean:
 *     type: string
 *     minLength: 1
 *   variant_id:
 *     type: string
 *     minLength: 1
 *   inventory_item_id:
 *     type: string
 *     minLength: 1
 *   location_id:
 *     type: string
 *     minLength: 1
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
 * description: Request body used to update inventory stock in batch.
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
 * description: Per-stock-update results returned after a batch update.
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
 * description: Invoice data accepted by Symmy invoice attachment imports.
 * required:
 *   - identifier_type
 *   - invoice_number
 * oneOf:
 *   - required:
 *       - display_id
 *     properties:
 *       identifier_type:
 *         enum:
 *           - display_id
 *   - required:
 *       - order_id
 *     properties:
 *       identifier_type:
 *         enum:
 *           - order_id
 *   - required:
 *       - erp_id
 *     properties:
 *       identifier_type:
 *         enum:
 *           - erp_id
 * anyOf:
 *   - required:
 *       - url
 *   - required:
 *       - data
 * properties:
 *   identifier_type:
 *     type: string
 *     enum:
 *       - display_id
 *       - order_id
 *       - erp_id
 *   display_id:
 *     type: string
 *     minLength: 1
 *   order_id:
 *     type: string
 *     minLength: 1
 *   erp_id:
 *     type: string
 *     minLength: 1
 *   invoice_number:
 *     type: string
 *     minLength: 1
 *   invoice_date:
 *     type: string
 *     format: date
 *   url:
 *     type: string
 *     format: uri
 *   data:
 *     type: string
 *     minLength: 1
 */

/**
 * @schema SymmyAttachInvoicesBatchRequest
 * type: object
 * description: Request body used to attach invoices to orders in batch.
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
 * description: Per-invoice results returned after attaching invoices to orders.
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
 * description: Price data accepted by Symmy price list imports.
 * required:
 *   - identifier_type
 *   - currency_code
 *   - amount
 * oneOf:
 *   - required:
 *       - sku
 *     properties:
 *       identifier_type:
 *         enum:
 *           - sku
 *   - required:
 *       - ean
 *     properties:
 *       identifier_type:
 *         enum:
 *           - ean
 *   - required:
 *       - variant_id
 *     properties:
 *       identifier_type:
 *         enum:
 *           - variant_id
 * properties:
 *   identifier_type:
 *     type: string
 *     enum:
 *       - sku
 *       - ean
 *       - variant_id
 *   sku:
 *     type: string
 *     minLength: 1
 *   ean:
 *     type: string
 *     minLength: 1
 *   variant_id:
 *     type: string
 *     minLength: 1
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
 * description: Price list data accepted by Symmy price list imports.
 * required:
 *   - code
 *   - name
 * properties:
 *   code:
 *     type: string
 *     minLength: 1
 *   name:
 *     type: string
 *     minLength: 1
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
 *     minLength: 1
 *   prices:
 *     type: array
 *     maxItems: 500
 *     items:
 *       $ref: "#/components/schemas/SymmyPriceListPriceInput"
 */

/**
 * @schema SymmyUpsertPriceListsBatchRequest
 * type: object
 * description: Request body used to queue price list upserts in batch.
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
 * description: Request body used to queue price updates for a Symmy price list.
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
 * description: Paginated response containing price lists linked to Symmy codes.
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
 * description: Shipment item data accepted by Symmy tracking imports.
 * required:
 *   - sku
 *   - quantity
 * properties:
 *   sku:
 *     type: string
 *     minLength: 1
 *   quantity:
 *     type: integer
 *     minimum: 1
 */

/**
 * @schema SymmyTrackingShipmentInput
 * type: object
 * description: Shipment tracking data accepted by Symmy tracking imports.
 * required:
 *   - identifier_type
 *   - tracking_number
 * oneOf:
 *   - required:
 *       - display_id
 *     properties:
 *       identifier_type:
 *         enum:
 *           - display_id
 *   - required:
 *       - order_id
 *     properties:
 *       identifier_type:
 *         enum:
 *           - order_id
 *   - required:
 *       - erp_id
 *     properties:
 *       identifier_type:
 *         enum:
 *           - erp_id
 * properties:
 *   identifier_type:
 *     type: string
 *     enum:
 *       - display_id
 *       - order_id
 *       - erp_id
 *   display_id:
 *     type: string
 *     minLength: 1
 *   order_id:
 *     type: string
 *     minLength: 1
 *   erp_id:
 *     type: string
 *     minLength: 1
 *   tracking_number:
 *     type: string
 *     minLength: 1
 *   tracking_url:
 *     type: string
 *     format: uri
 *   carrier:
 *     type: string
 *     minLength: 1
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
 * description: Request body used to add tracking to orders in batch.
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
 * description: Per-shipment results returned after adding tracking to orders.
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
