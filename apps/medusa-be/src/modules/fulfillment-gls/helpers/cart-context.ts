import { MedusaError } from '@medusajs/framework/utils'
import { GLS_COUNTRY_CODES, type GLSCountryCode } from '../../gls-client/types'
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
	countryCode: GLSCountryCode
	salesChannelId: string
}

const isGLSCountryCode = (value: string): value is GLSCountryCode => GLS_COUNTRY_CODES.includes(value as GLSCountryCode)

export async function resolveGLSCartContext(query: QueryService, cartId: string): Promise<GLSCartContext> {
	const { data } = await query.graph({
		entity: 'cart',
		fields: ['id', 'sales_channel_id', 'shipping_address.country_code', 'region.countries.iso_2'],
		filters: { id: cartId },
		pagination: { take: 1 }
	})
	const cart = data[0] as CartContextRecord | undefined

	if (!cart) {
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

	if (!countryCode || !isGLSCountryCode(countryCode)) {
		throw new MedusaError(MedusaError.Types.NOT_ALLOWED, 'GLS is unavailable for this cart country')
	}

	if (addressCountryCode && !regionCountryCodes.includes(addressCountryCode)) {
		throw new MedusaError(MedusaError.Types.INVALID_DATA, 'Cart address country does not belong to its region')
	}

	return { countryCode, salesChannelId }
}
