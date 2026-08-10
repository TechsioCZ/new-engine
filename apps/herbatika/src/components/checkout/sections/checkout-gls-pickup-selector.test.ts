import { describe, expect, it } from 'vitest'
import { isGLSBranchesResponse } from './checkout-gls-pickup-selector'

describe('isGLSBranchesResponse', () => {
	it('accepts the canonical Store response', () => {
		expect(isGLSBranchesResponse({ branches: [{ id: 'point_1', name: 'Point', nameStreet: 'Point, Street 1', street: 'Street 1', city: 'City', zip: '01001', country: 'SK' }] })).toBe(true)
	})

	it('rejects incomplete carrier records', () => {
		expect(isGLSBranchesResponse({ branches: [{ id: 'point_1', name: 'Point' }] })).toBe(false)
		expect(isGLSBranchesResponse({ branches: 'invalid' })).toBe(false)
	})
})
