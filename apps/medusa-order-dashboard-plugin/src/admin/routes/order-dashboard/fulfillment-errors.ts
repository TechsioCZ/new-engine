export function getFulfillmentErrorMessage(error: unknown, fallback: string): string {
	return findFulfillmentErrorMessage(error, new Set()) ?? fallback
}

function findFulfillmentErrorMessage(error: unknown, visited: Set<object>): string | null {
	if (typeof error === 'string' && error.trim()) {
		return error.trim()
	}

	if (!error || typeof error !== 'object' || visited.has(error)) {
		return null
	}

	visited.add(error)

	const errorRecord = error as Record<string, unknown>

	for (const key of ['message', 'error', 'detail', 'cause'] as const) {
		const message = findFulfillmentErrorMessage(errorRecord[key], visited)

		if (message) {
			return message
		}
	}

	const response = errorRecord.response

	if (response && typeof response === 'object') {
		return findFulfillmentErrorMessage((response as Record<string, unknown>).data, visited)
	}

	return null
}
