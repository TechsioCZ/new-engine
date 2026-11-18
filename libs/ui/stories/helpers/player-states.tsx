import { type ReactNode, useState } from "react"
import { expect, waitFor, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { AudioPlayer } from "../../src/molecules/audio-player"
import {
  Player,
  type PlayerErrorContentProps,
} from "../../src/molecules/player"
import { VideoPlayer } from "../../src/molecules/video-player"

type PlayerKind = "audio" | "video" | "compound"

const BROKEN_SOURCE = "data:audio/wav;base64,bm90IGEgbWVkaWEgZmlsZQ=="

export async function playerStatesPlay({
  canvasElement,
}: {
  canvasElement: HTMLElement
}) {
  const canvas = within(canvasElement)
  await waitFor(
    () => {
      const ready = canvas.getByRole("region", { name: "Ready" })
      expect(ready).toHaveAttribute("data-can-play", "")
      const media = ready.querySelector<HTMLMediaElement>("audio,video")
      expect(Number.isFinite(media?.duration)).toBe(true)
      expect(media?.duration).toBeGreaterThan(0)
    },
    { timeout: 10_000 }
  )
  const recovery = within(canvas.getByRole("region", { name: "Recovery demo" }))
  await expect(
    await recovery.findByRole("alert", {}, { timeout: 10_000 })
  ).toHaveTextContent("This media could not be loaded.")
  await expect(
    recovery.getByRole("button", { name: "Try again" })
  ).toBeVisible()
}

function StatePlayer({
  kind,
  source,
  label,
  error,
}: {
  kind: PlayerKind
  source: string
  label: string
  error?: (props: PlayerErrorContentProps) => ReactNode
}) {
  // The intentionally invalid data URL needs an extension for provider selection.
  const src =
    source === BROKEN_SOURCE
      ? `${source}#sample.${kind === "video" ? "mp4" : "wav"}`
      : source
  if (kind === "audio") {
    return (
      <AudioPlayer
        aria-label={label}
        audioUrl={src}
        preload="auto"
        slots={{ error }}
      />
    )
  }
  if (kind === "video") {
    return (
      <VideoPlayer
        aria-label={label}
        preload="auto"
        slots={{ error }}
        src={src}
      />
    )
  }
  return (
    <Player aria-label={label} preload="auto" src={src} viewType="audio">
      <Player.Provider />
      <Player.Announcer />
      <Player.Loading />
      <Player.Error>{error}</Player.Error>
      <Player.Controls>
        <Player.ControlGroup className="flex-wrap">
          <Player.PlayButton />
          <Player.TimeSlider />
          <Player.Time type="current" />
          <Player.MuteButton />
        </Player.ControlGroup>
      </Player.Controls>
    </Player>
  )
}

export function PlayerStates({ kind }: { kind: PlayerKind }) {
  const [recovered, setRecovered] = useState(false)
  const readySource =
    kind === "video"
      ? "https://files.vidstack.io/sprite-fight/480p.mp4"
      : "https://files.vidstack.io/sprite-fight/audio.mp3"
  return (
    <div className="mx-auto w-full max-w-xl">
      <VariantContainer>
        <VariantGroup fullWidth title="Ready">
          <p>
            Play the sample media, seek on its timeline or adjust the sound.
          </p>
          <StatePlayer kind={kind} label="Ready" source={readySource} />
        </VariantGroup>
        <VariantGroup fullWidth title="Error and recovery">
          <p>
            This invalid media file triggers a real decoding error. Try again
            selects the sample media and resets the player through its public
            retry callback.
          </p>
          <StatePlayer
            error={({ retry }) => (
              <>
                <span>This media could not be loaded.</span>
                <Button
                  onClick={() => {
                    setRecovered(true)
                    retry()
                  }}
                  type="button"
                >
                  Try again
                </Button>
              </>
            )}
            kind={kind}
            label="Recovery demo"
            source={recovered ? readySource : BROKEN_SOURCE}
          />
          {recovered ? (
            <Button
              appearance="outline"
              onClick={() => setRecovered(false)}
              type="button"
            >
              Show error again
            </Button>
          ) : null}
        </VariantGroup>
        <VariantGroup fullWidth title="Loading and buffering">
          <p>
            Loading feedback follows real media loading and buffering. To
            inspect it, open Playground, select a slow network profile in
            browser developer tools, disable the cache and reload. With
            preload="none", loading begins after Play.
          </p>
        </VariantGroup>
      </VariantContainer>
    </div>
  )
}

/** Copyable application example: its URLs are application-owned media assets. */
export function playerStatesSource(kind: PlayerKind) {
  const component = {
    audio: "AudioPlayer",
    video: "VideoPlayer",
    compound: "Player",
  }[kind]
  const importStatement = {
    audio:
      'import { AudioPlayer } from "@techsio/ui-kit/molecules/audio-player"',
    video:
      'import { VideoPlayer } from "@techsio/ui-kit/molecules/video-player"',
    compound: 'import { Player } from "@techsio/ui-kit/molecules/player"',
  }[kind]
  const error = `({ retry }) => (
        <>
          <span>This media could not be loaded.</span>
          <Button type="button" onClick={() => {
            setSource("/media/recovered.${kind === "video" ? "mp4" : "mp3"}")
            retry()
          }}>Try again</Button>
        </>
      )`
  const content =
    kind === "compound"
      ? `<Player aria-label="Recovery demo" src={source} viewType="audio">
      <Player.Provider />
      <Player.Announcer />
      <Player.Loading />
      <Player.Error>{${error}}</Player.Error>
      <Player.Controls>
        <Player.ControlGroup>
          <Player.PlayButton />
          <Player.TimeSlider />
          <Player.Time type="current" />
          <Player.MuteButton />
        </Player.ControlGroup>
      </Player.Controls>
    </Player>`
      : `<${component}
      aria-label="Recovery demo"
      ${kind === "audio" ? "audioUrl" : "src"}={source}
      slots={{ error: ${error} }}
    />`
  return `import { useState } from "react"
import { Button } from "@techsio/ui-kit/atoms/button"
${importStatement}

// Replace these paths with your application's unavailable and replacement assets.
export function RecoverablePlayer() {
  const [source, setSource] = useState("/media/unavailable.${kind === "video" ? "mp4" : "mp3"}")
  return (
    ${content}
  )
}`
}
