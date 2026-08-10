import { describe, expect, it } from 'vitest'
import { getFulfillmentErrorMessage } from './fulfillment-errors'

describe('getFulfillmentErrorMessage', () => {
	it('returns the backend Medusa error message', () => {
		expect(getFulfillmentErrorMessage({ response: { data: { message: 'No stock reservation found' } } }, 'Fallback')).toBe('No stock reservation found')
	})

	it('returns an Error message', () => {
		expect(getFulfillmentErrorMessage(new Error('Carrier configuration is missing'), 'Fallback')).toBe('Carrier configuration is missing')
	})

	it('uses the fallback for an empty or cyclic error payload', () => {
		const cyclicError: Record<string, unknown> = {}

		cyclicError.cause = cyclicError

		expect(getFulfillmentErrorMessage(cyclicError, 'Fallback')).toBe('Fallback')
	})
})
