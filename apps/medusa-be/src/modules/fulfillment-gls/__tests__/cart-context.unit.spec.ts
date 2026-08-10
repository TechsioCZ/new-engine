import { describe, expect, it, vi } from 'vitest'
import { resolveGLSCartContext } from '../helpers/cart-context'

describe('resolveGLSCartContext', () => {
	it('derives the carrier country and Sales Channel from the cart', async () => {
		const query = { graph: vi.fn().mockResolvedValue({ data: [{ id: 'cart_1', sales_channel_id: 'sc_sk', shipping_address: { country_code: 'sk' }, region: { countries: [{ iso_2: 'sk' }] } }] }) }

		await expect(resolveGLSCartContext(query, 'cart_1')).resolves.toEqual({ countryCode: 'SK', salesChannelId: 'sc_sk' })
	})

	it('rejects an address outside the cart Region', async () => {
		const query = { graph: vi.fn().mockResolvedValue({ data: [{ id: 'cart_1', sales_channel_id: 'sc_sk', shipping_address: { country_code: 'cz' }, region: { countries: [{ iso_2: 'sk' }] } }] }) }

		await expect(resolveGLSCartContext(query, 'cart_1')).rejects.toThrow('does not belong to its region')
	})

	it('fails closed when the cart has no exact Sales Channel', async () => {
		const query = { graph: vi.fn().mockResolvedValue({ data: [{ id: 'cart_1', shipping_address: { country_code: 'sk' }, region: { countries: [{ iso_2: 'sk' }] } }] }) }

		await expect(resolveGLSCartContext(query, 'cart_1')).rejects.toThrow('no Sales Channel')
	})

	it('rejects GLS account countries that are not supported storefront markets', async () => {
		const query = { graph: vi.fn().mockResolvedValue({ data: [{ id: 'cart_1', sales_channel_id: 'sc_hr', shipping_address: { country_code: 'hr' }, region: { countries: [{ iso_2: 'hr' }] } }] }) }

		await expect(resolveGLSCartContext(query, 'cart_1')).rejects.toThrow('unavailable for this cart country')
	})
})
