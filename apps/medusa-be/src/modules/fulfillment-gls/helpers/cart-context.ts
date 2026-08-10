import { MedusaError } from '@medusajs/framework/utils'
import { GLS_STOREFRONT_COUNTRY_CODES, type GLSStorefrontCountryCode } from '../../gls-client/types'
import type { QueryService } from './packet-attributes'

type CartContextRecord = {
	id: string
	region?: {
		countries?: Array<{ iso_2?: string | null }> | null
	} | null
	sales_channel_id?: string | null
	shipping_address?: {
		country_code?: string | null
	} | null
}

export type GLSCartContext = {
	countryCode: GLSStorefrontCountryCode
	salesChannelId: string
}

const STOREFRONT_COUNTRY_CODE_SET: ReadonlySet<string> = new Set(GLS_STOREFRONT_COUNTRY_CODES)

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const isOptionalString = (value: unknown): value is string | null | undefined => value === undefined || value === null || typeof value === 'string'

const isCountryRecord = (value: unknown): value is { iso_2?: string | null } => isRecord(value) && isOptionalString(value.iso_2)

const isCountryRecordArray = (value: unknown): value is Array<{ iso_2?: string | null }> => Array.isArray(value) && value.every(isCountryRecord)

const isShippingAddressRecord = (value: unknown): value is { country_code?: string | null } => isRecord(value) && isOptionalString(value.country_code)

const isCartContextRecord = (value: unknown): value is CartContextRecord => {
	if (!isRecord(value) || typeof value.id !== 'string' || !isOptionalString(value.sales_channel_id)) {
		return false
	}

	if (value.shipping_address !== undefined && value.shipping_address !== null && !isShippingAddressRecord(value.shipping_address)) {
		return false
	}

	if (value.region !== undefined && value.region !== null) {
		if (!isRecord(value.region)) {
			return false
		}

		const countries: unknown = value.region.countries
		if (countries !== undefined && countries !== null && !isCountryRecordArray(countries)) {
			return false
		}
	}

	return true
}

const isGLSStorefrontCountryCode = (value: string): value is GLSStorefrontCountryCode => STOREFRONT_COUNTRY_CODE_SET.has(value)

export async function resolveGLSCartContext(query: QueryService, cartId: string): Promise<GLSCartContext> {
	const { data } = await query.graph({
		entity: 'cart',
		fields: ['id', 'sales_channel_id', 'shipping_address.country_code', 'region.countries.iso_2'],
		filters: { id: cartId },
		pagination: { take: 1 }
	})
	const cart: unknown = data[0]

	if (!isCartContextRecord(cart)) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Cart was not found')
	}

	const salesChannelId = cart.sales_channel_id?.trim()
	if (!salesChannelId) {
		throw new MedusaError(MedusaError.Types.INVALID_DATA, 'Cart has no Sales Channel')
	}

	const regionCountryCodes = (cart.region?.countries ?? [])
		.map((country) => country.iso_2?.trim().toUpperCase())
		.filter((candidateCountryCode): candidateCountryCode is string => Boolean(candidateCountryCode))
	const addressCountryCode = cart.shipping_address?.country_code?.trim().toUpperCase()
	const countryCode = addressCountryCode ?? (regionCountryCodes.length === 1 ? regionCountryCodes[0] : undefined)

	if (!countryCode) {
		throw new MedusaError(MedusaError.Types.NOT_ALLOWED, 'GLS is unavailable for this cart country')
	}
	if (!isGLSStorefrontCountryCode(countryCode)) {
		throw new MedusaError(MedusaError.Types.NOT_ALLOWED, 'GLS is unavailable for this cart country')
	}

	if (addressCountryCode && !regionCountryCodes.includes(addressCountryCode)) {
		throw new MedusaError(MedusaError.Types.INVALID_DATA, 'Cart address country does not belong to its region')
	}

	return { countryCode, salesChannelId }
}
