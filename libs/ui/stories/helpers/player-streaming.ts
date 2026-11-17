import { isDASHProvider, isHLSProvider } from "@vidstack/react"
import Hls from "hls.js"
import type { PlayerProps } from "../../src/molecules/player"

/** Bundle the real streaming engines locally instead of using the SDK CDN. */
export const configurePlayerStreaming: NonNullable<
  PlayerProps["onProviderChange"]
> = (provider) => {
  if (isHLSProvider(provider)) {
    // The pinned SDK can preload native HLS before a dynamic import resolves,
    // then skip its quality-list setup. Supply the constructor before loading.
    provider.library = Hls
    // These finite demo streams contain 30 seconds; buffer the entire recording.
    provider.config = { maxBufferLength: 30, maxMaxBufferLength: 30 }
  }
  if (isDASHProvider(provider)) {
    provider.library = async () => {
      // dash.all scans mounted video sources at import time. Vidstack must own
      // the only engine; disable the declarative factory before loading it.
      Object.assign(window, {
        dashjs: { ...Reflect.get(window, "dashjs"), skipAutoCreate: true },
      })
      const { default: dashjs } = await import("dashjs")
      // The pinned SDK checks the browser namespace even for dynamic imports.
      Object.assign(window, { dashjs })
      return { default: dashjs }
    }
    provider.config = {
      streaming: {
        buffer: {
          stableBufferTime: 30,
          bufferTimeAtTopQuality: 30,
          bufferTimeAtTopQualityLongForm: 30,
        },
      },
    }
  }
}
