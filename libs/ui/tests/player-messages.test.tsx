import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { UiMessagesProvider } from "../src/messages/ui-messages-provider"
import { Player } from "../src/molecules/player"

describe("player messages", () => {
  it("reads control names from the app catalog", () => {
    const html = renderToStaticMarkup(
      <UiMessagesProvider
        messages={{
          player: {
            label: "Prehravac",
            play: "Spustit",
            mute: "Ztlumit",
            enterFullscreen: "Cela obrazovka",
            seekForward: (seconds) => `Dopredu o ${seconds}`,
            seek: "Pozice",
            volume: "Hlasitost",
          },
        }}
      >
        <Player src="sample.mp4">
          <Player.Provider />
          <Player.Controls>
            <Player.PlayButton />
            <Player.MuteButton />
            <Player.FullscreenButton />
            <Player.SeekButton direction="forward" seconds={15} />
            <Player.TimeSlider />
            <Player.VolumeSlider />
          </Player.Controls>
        </Player>
      </UiMessagesProvider>
    )
    for (const label of [
      "Prehravac",
      "Spustit",
      "Ztlumit",
      "Cela obrazovka",
      "Dopredu o 15",
      "Pozice",
      "Hlasitost",
    ]) {
      expect(html).toContain(`aria-label="${label}"`)
    }
  })

  it("keeps an explicit control label ahead of the catalog", () => {
    const html = renderToStaticMarkup(
      <UiMessagesProvider messages={{ player: { play: "Spustit" } }}>
        <Player src="sample.mp3">
          <Player.PlayButton aria-label="Preview track" />
        </Player>
      </UiMessagesProvider>
    )
    expect(html).toContain('aria-label="Preview track"')
    expect(html).not.toContain('aria-label="Spustit"')
  })
})
