import type { MedusaResponse, MedusaStoreRequest } from '@medusajs/framework/http'
import type { IPromotionModuleService, Query } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, MedusaError, Modules, ProductStatus, QueryContext } from '@medusajs/framework/utils'
import { normalizeProductSalesChannelFilter } from '../../utils/product-filters'
import { resolveApplicableVolumeDiscountTiers, resolveExactSalesChannelId, type VolumeDiscountPromotionRecord, type VolumeDiscountTier } from './helpers'
import type { StoreVolumeDiscountsQuery } from './validators'

type ProductRecord = {
	id: string
	collection_id?: string | null
	discountable?: boolean | null
	type_id?: string | null
	tags?: Array<{ id: string }> | null
	categories?: Array<{ id: string }> | null
	variants?: Array<{
		id: string
		calculated_price?: {
			calculated_amount?: number | null
		} | null
	}> | null
}

type RegionRecord = {
	id: string
	currency_code?: string | null
	countries?: Array<{ iso_2?: string | null }> | null
}

type CustomerRecord = {
	id: string
	email?: string | null
	groups?: Array<{ id: string }> | null
}

const PROMOTION_FIELDS = [
	'id',
	'code',
	'application_method.type',
	'application_method.target_type',
	'application_method.allocation',
	'application_method.value',
	'application_method.target_rules.attribute',
	'application_method.target_rules.operator',
	'application_method.target_rules.values.value'
]

const resolveCustomerContext = async (request: MedusaStoreRequest<unknown, StoreVolumeDiscountsQuery>, query: Query) => {
	const customerId = request.auth_context?.actor_id

	if (!customerId) {
		return
	}

	const { data } = await query.graph({ entity: 'customer', fields: ['id', 'email', 'groups.id'], filters: { id: customerId }, pagination: { take: 1 } })
	const customer = (data as CustomerRecord[])[0]

	return customer ? { customer: { id: customer.id, groups: customer.groups ?? [] }, email: customer.email ?? undefined } : undefined
}

const resolveRegion = async (query: Query, regionId: string): Promise<RegionRecord> => {
	const { data } = await query.graph({
		entity: 'region',
		fields: ['id', 'currency_code', 'countries.iso_2'],
		filters: { id: regionId },
		pagination: { take: 1 }
	})
	const region = (data as RegionRecord[])[0]

	if (!region?.currency_code) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, 'The requested market region was not found')
	}

	return region
}

const resolveProduct = async (
	request: MedusaStoreRequest<unknown, StoreVolumeDiscountsQuery>,
	query: Query,
	variantId: string,
	salesChannelId: string
): Promise<ProductRecord> => {
	const remoteQuery = request.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
	const productFilters = await normalizeProductSalesChannelFilter(query, remoteQuery, {
		variants: { id: variantId },
		sales_channel_id: salesChannelId,
		status: ProductStatus.PUBLISHED
	})
	const pricingContext = request.pricingContext ? QueryContext(request.pricingContext) : undefined
	const { data } = await query.graph({
		entity: 'product',
		fields: ['id', 'collection_id', 'discountable', 'type_id', 'tags.id', 'categories.id', 'variants.id', 'variants.calculated_price.calculated_amount'],
		filters: productFilters,
		pagination: { take: 1 },
		...(pricingContext ? { context: { variants: { calculated_price: pricingContext } } } : {})
	})
	const product = (data as ProductRecord[])[0]
	const variant = product?.variants?.find((candidate) => candidate.id === variantId)

	if (!product) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, 'The requested product variant was not found in this market')
	}

	if (!variant) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, 'The requested product variant was not found in this market')
	}

	if (typeof variant.calculated_price?.calculated_amount !== 'number') {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, 'The requested product variant was not found in this market')
	}

	return product
}

export async function GET(
	request: MedusaStoreRequest<unknown, StoreVolumeDiscountsQuery>,
	response: MedusaResponse<{ volume_discount_tiers: VolumeDiscountTier[] }>
) {
	const query = request.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
	const promotionService = request.scope.resolve<IPromotionModuleService>(Modules.PROMOTION)
	const { region_id: regionId, variant_id: variantId } = request.validatedQuery
	const salesChannelId = resolveExactSalesChannelId(request.filterableFields?.sales_channel_id)
	const [region, product, customerContext] = await Promise.all([
		resolveRegion(query, regionId),
		resolveProduct(request, query, variantId, salesChannelId),
		resolveCustomerContext(request, query)
	])
	const selectedVariant = product.variants?.find((variant) => variant.id === variantId)
	const { data } = await query.graph({
		entity: 'promotion',
		fields: PROMOTION_FIELDS,
		filters: { is_automatic: true, status: 'active' },
		pagination: { take: 1000 }
	})
	const countryCode = region.countries?.map((country) => country.iso_2?.trim().toLowerCase()).find(Boolean)
	const tiers = await resolveApplicableVolumeDiscountTiers(promotionService, data as VolumeDiscountPromotionRecord[], {
		currency_code: region.currency_code?.toLowerCase() ?? '',
		region: { id: region.id },
		...(countryCode ? { shipping_address: { country_code: countryCode } } : {}),
		sales_channel_id: salesChannelId,
		...(customerContext ? { customer: customerContext.customer } : {}),
		...(customerContext?.email ? { email: customerContext.email } : {}),
		item: {
			id: ['volume-discount-preview-', variantId].join(''),
			quantity: 1,
			subtotal: selectedVariant?.calculated_price?.calculated_amount ?? 0,
			original_total: selectedVariant?.calculated_price?.calculated_amount ?? 0,
			is_discountable: product.discountable !== false,
			variant_id: variantId,
			product_id: product.id,
			product: {
				id: product.id,
				...(product.collection_id ? { collection_id: product.collection_id } : {}),
				...(product.type_id ? { type_id: product.type_id } : {}),
				tags: product.tags ?? [],
				categories: product.categories ?? []
			}
		},
		unitAmount: selectedVariant?.calculated_price?.calculated_amount ?? 0
	})

	response.json({ volume_discount_tiers: tiers })
}
