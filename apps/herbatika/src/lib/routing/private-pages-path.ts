const INTERNAL_PREFIX = /^\/~sf(?:\/|$)/i
const INTERNAL_DATA_PREFIX = /^\/_next\/data\/[^/]+\/~sf(?:\/|$)/i

export const isPrivatePagesPath = (pathname: string) => {
  let candidate = pathname

  for (let decodeCount = 0; decodeCount <= 2; decodeCount += 1) {
    if (
      INTERNAL_PREFIX.test(candidate) ||
      INTERNAL_DATA_PREFIX.test(candidate)
    ) {
      return true
    }

    try {
      const decoded = decodeURIComponent(candidate)
      if (decoded === candidate) {
        return false
      }
      candidate = decoded
    } catch {
      return false
    }
  }

  return false
}
