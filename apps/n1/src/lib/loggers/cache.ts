/**
 * Cache Logger Utility
 * Simplified logging for React Query cache operations
 */

type LogLevel = "info" | "success" | "warning" | "error"
type CacheStatus = "fresh" | "stale" | "miss"

type LogOptions = {
  level?: LogLevel
  group?: boolean
  trace?: boolean
}

const STATUS_INDICATORS: Record<CacheStatus, string> = {
  fresh: "🟢",
  stale: "🟡",
  miss: "🔵",
}

const LEVEL_STYLES: Record<LogLevel, string> = {
  info: "color: #3b82f6; font-weight: bold",
  success: "color: #10b981; font-weight: bold",
  warning: "color: #f59e0b; font-weight: bold",
  error: "color: #ef4444; font-weight: bold",
}

class CacheLogger {
  private readonly enabled: boolean

  constructor() {
    this.enabled = process.env["NODE_ENV"] === "development"
  }

  /**
   * Log cache operation with status indicator
   */
  cache(
    status: CacheStatus,
    operation: string,
    details?: Record<string, unknown>,
    options: LogOptions = {}
  ) {
    if (!this.enabled) {
      return
    }

    const indicator = STATUS_INDICATORS[status]
    const level = options.level || "info"

    if (options.group) {
      console.group(`%c${indicator} [Cache] ${operation}`, LEVEL_STYLES[level])
      if (details) {
        for (const [key, value] of Object.entries(details)) {
          console.log(`   ${key}:`, value)
        }
      }
      if (options.trace) {
        console.trace("Call stack")
      }
      console.groupEnd()
    } else {
      const detailsStr = details
        ? Object.entries(details)
            .map(([k, v]) => `${k}:${v}`)
            .join(" | ")
        : ""

      console.log(
        `%c${indicator} [Cache] ${operation}%c ${detailsStr}`,
        LEVEL_STYLES[level],
        "color: #6b7280"
      )
    }
  }

  /**
   * Log React Query cache status (simplified format)
   */
  query(
    operation: string,
    _queryKey: readonly unknown[],
    status: {
      isLoading?: boolean
      isFetching?: boolean
      isSuccess?: boolean
      isError?: boolean
      dataUpdatedAt?: number
    }
  ) {
    if (!this.enabled) {
      return
    }

    const cacheAge = status.dataUpdatedAt
      ? Date.now() - status.dataUpdatedAt
      : 0
    const ageSeconds = Math.round(cacheAge / 1000)

    // Determine status and indicator
    let indicator = "🔍"
    let statusText = "unknown"

    if (status.isError) {
      indicator = "❌"
      statusText = "error"
    } else if (status.isLoading) {
      indicator = "⏳"
      statusText = "loading"
    } else if (status.isFetching) {
      indicator = "🔄"
      statusText = "fetching"
    } else if (status.isSuccess && cacheAge < 3_600_000) {
      indicator = "🟢"
      statusText = `fresh (${ageSeconds}s)`
    } else if (status.isSuccess) {
      indicator = "🟡"
      statusText = `stale (${ageSeconds}s)`
    }

    console.log(`${indicator} [Cache] ${operation} ${statusText}`)
  }

  /**
   * Log error with stack trace
   */
  error(operation: string, error: unknown) {
    if (!this.enabled) {
      return
    }

    console.group(`%c❌ [Error] ${operation}`, LEVEL_STYLES.error)
    console.error(error)
    console.trace("Error stack")
    console.groupEnd()
  }
}

// Singleton instance
const cacheLogger = new CacheLogger()

// Convenience exports
export const logQuery = cacheLogger.query.bind(cacheLogger)
