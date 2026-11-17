import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { UiMessagesProvider } from "../src/messages/ui-messages-provider"
import { AudioPlayer } from "../src/molecules/audio-player"
import { Player } from "../src/molecules/player"
import { VideoPlayer } from "../src/molecules/video-player"

describe("player messages", () => {
  it("keeps settings opt-in and names its trigger from the catalog", () => {
    const preset = renderToStaticMarkup(<VideoPlayer src="sample.mp4" />)
    expect(preset).not.toContain('aria-label="Playback settings"')
    const settings = renderToStaticMarkup(
      <UiMessagesProvider
        messages={{ player: { settings: "Nastavení přehrávání" } }}
      >
        <VideoPlayer controlsList={["settings"]} src="sample.mp4" />
      </UiMessagesProvider>
    )
    expect(settings).toContain('aria-label="Nastavení přehrávání"')
    expect(settings).toContain('aria-haspopup="menu"')
    expect(settings).not.toContain("controlsList=")
  })

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

  it("lets video presets compose custom controls inside the player context", () => {
    const html = renderToStaticMarkup(
      <VideoPlayer
        slots={{
          controls: <Player.PlayButton aria-label="Preview video" />,
          overlay: <span>Video description</span>,
        }}
        src="sample.mp4"
      />
    )
    expect(html).toContain('aria-label="Preview video"')
    expect(html).toContain("Video description")
    expect(html).not.toContain('aria-label="Seek forward 10 seconds"')
  })

  it("lets audio presets replace controls and explicitly remove them", () => {
    const html = renderToStaticMarkup(
      <AudioPlayer
        audioUrl="sample.mp3"
        slots={{ controls: <Player.PlayButton aria-label="Preview audio" /> }}
      />
    )
    expect(html).toContain('aria-label="Preview audio"')
    const withoutControls = renderToStaticMarkup(
      <AudioPlayer audioUrl="sample.mp3" slots={{ controls: null }} />
    )
    expect(withoutControls).not.toContain('role="button"')
    expect(withoutControls).not.toContain("slots=")
  })
})

describe("audio preset title", () => {
  it("uses an explicit title for the accessible player name", () => {
    const html = renderToStaticMarkup(
      <AudioPlayer audioUrl="sample.mp3" title="Podcast" />
    )
    expect(html).toContain('aria-label="Podcast"')
    const override = renderToStaticMarkup(
      <AudioPlayer
        audioUrl={{ src: "sample.mp3", title: "Old title" }}
        title="New title"
      />
    )
    expect(override).toContain('aria-label="New title"')
  })
})
