import type { Meta, StoryObj } from "@storybook/react"
import { type ComponentProps, useState } from "react"
import { fn } from "storybook/test"
import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { Player } from "../../src/molecules/player"
import { VideoPlayer } from "../../src/molecules/video-player"

const POSTER_SRC = new URL("../../assets/gallery/shoes-1.avif", import.meta.url)
  .href

// SDK events expose state proxies; record calls without serializing the event.
const playSpy = fn().mockName("onPlay")
const pauseSpy = fn().mockName("onPause")

type VideoPlayerStoryProps = ComponentProps<typeof VideoPlayer> & {
  description: string
}

function VideoPlayerStory({ description, ...props }: VideoPlayerStoryProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-200">
      <p>{description}</p>
      <VideoPlayer {...props} />
    </div>
  )
}

const meta: Meta<typeof VideoPlayer> = {
  title: "Molecules/VideoPlayer",
  component: VideoPlayer,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "A video preset with keyboard and surface playback, captions, loading/error feedback and configurable content slots. Use Player for a fully custom composition or AudioPlayer for audio.",
      },
    },
  },
  argTypes: {
    muted: { control: "boolean" },
    volume: { control: { type: "range", min: 0, max: 1, step: 0.1 } },
    playsInline: { control: "boolean" },
    playbackRate: { control: { type: "range", min: 0.5, max: 2, step: 0.25 } },
    tracks: { control: false },
    slots: { control: false },
    seekTime: { control: { type: "number", min: 1, max: 60 } },
    controlsList: {
      control: "check",
      options: ["play", "time", "volume", "captions", "fullscreen"],
    },
    height: { control: { type: "number", min: 200, max: 800 } },
  },
  args: {
    src: "https://files.vidstack.io/sprite-fight/480p.mp4",
    poster: POSTER_SRC,
    title: "Sample video",
    controlsList: ["play", "time", "volume", "captions", "fullscreen"],
    playsInline: true,
    onPlay: () => playSpy(),
    onPause: () => pauseSpy(),
    onVolumeChange: fn(),
  },
}

export default meta
type Story = StoryObj<typeof VideoPlayer>

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The full preset keeps a timeline and mute on mobile while hiding skip buttons and the volume slider; click or tap the video surface to toggle playback.",
      },
    },
  },
  render: (args) => (
    <VideoPlayerStory
      {...args}
      description="Click or tap the video surface to play or pause. On mobile, use the timeline to seek; skip buttons and the volume slider are hidden. Focus the player for K (playback) and M (mute)."
    />
  ),
}

export const CustomControls: Story = {
  args: { controlsList: ["play", "time"] },
  render: (args) => (
    <VideoPlayerStory
      {...args}
      description="Playback and timeline controls only; volume and fullscreen are intentionally omitted."
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Only playback and seeking are shown. Volume and fullscreen are omitted using controlsList.",
      },
    },
  },
}

export const FixedHeight: Story = {
  args: { height: 320 },
  render: (args) => (
    <VideoPlayerStory
      {...args}
      description="A fixed 320 px player height with controls anchored to the bottom."
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          "The player is 320 px tall. The video keeps its aspect ratio inside that space; controls stay attached to the bottom.",
      },
    },
  },
}

export const Captioned: Story = {
  args: {
    tracks: [
      {
        id: "sample-english",
        kind: "subtitles",
        language: "en",
        label: "English",
        default: true,
        content:
          "WEBVTT\n\n00:00.000 --> 00:30.000\nThe sample includes English subtitles. Use the captions button to hide or show them.\n",
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          "An inline WebVTT track enables subtitles by default and makes the captions toggle available without another network request.",
      },
    },
  },
  render: (args) => (
    <VideoPlayerStory
      {...args}
      description="Play the video to read the English subtitles. Toggle captions to hide or show them; caption controls appear only when a supported text track is available."
    />
  ),
}

function TranscriptVideo(args: ComponentProps<typeof VideoPlayer>) {
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-200">
      <p>
        This preset keeps the provider, feedback and gestures while replacing
        its controls and overlay. Open the transcript without leaving the page.
      </p>
      <VideoPlayer
        {...args}
        slots={{
          controls: (
            <Player.Controls className="player-overlay absolute inset-x-0 bottom-0 z-player-controls">
              <Player.ControlGroup className="flex-col items-stretch">
                <Player.TimeSlider className="player-video-timeline w-full flex-none self-stretch" />
                <Player.Control className="justify-between">
                  <Player.PlayButton />
                  <Player.Time type="current" />
                  <Button
                    appearance="solid"
                    aria-expanded={transcriptOpen}
                    onClick={() => setTranscriptOpen((open) => !open)}
                    severity="secondary"
                    size="sm"
                    type="button"
                  >
                    {transcriptOpen ? "Hide transcript" : "Show transcript"}
                  </Button>
                </Player.Control>
              </Player.ControlGroup>
            </Player.Controls>
          ),
          overlay: (
            <div className="pointer-events-none absolute top-0 start-0 z-player-captions p-200">
              <Badge severity="info">Product film</Badge>
            </div>
          ),
        }}
      />
      {transcriptOpen ? (
        <p role="region" aria-label="Video transcript">
          Sample product film. The visual demonstration is accompanied by a
          written description here.
        </p>
      ) : null}
    </div>
  )
}

export const CustomContent: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Replace controls inside the media context and add an overlay badge; a UI-kit Button reveals a local transcript while playback stays available.",
      },
      source: {
        code: `import { useState } from "react"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Player } from "@techsio/ui-kit/molecules/player"
import { VideoPlayer } from "@techsio/ui-kit/molecules/video-player"

export function TranscriptVideo() {
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  return (
    <div>
      <VideoPlayer
        src="https://files.vidstack.io/sprite-fight/480p.mp4"
        title="Product film"
        slots={{
          controls: (
            <Player.Controls className="player-overlay absolute inset-x-0 bottom-0 z-player-controls">
              <Player.ControlGroup className="flex-col items-stretch">
                <Player.TimeSlider className="player-video-timeline w-full flex-none self-stretch" />
                <Player.Control className="justify-between">
                  <Player.PlayButton />
                  <Player.Time type="current" />
                  <Button
                    appearance="solid"
                    aria-expanded={transcriptOpen}
                    onClick={() => setTranscriptOpen((open) => !open)}
                    severity="secondary"
                    size="sm"
                    type="button"
                  >
                    {transcriptOpen ? "Hide transcript" : "Show transcript"}
                  </Button>
                </Player.Control>
              </Player.ControlGroup>
            </Player.Controls>
          ),
          overlay: (
            <div className="pointer-events-none absolute top-0 start-0 z-player-captions p-200">
              <Badge severity="info">Product film</Badge>
            </div>
          ),
        }}
      />
      {transcriptOpen ? (
        <p role="region" aria-label="Video transcript">
          Sample product film. The visual demonstration is accompanied by a
          written description here.
        </p>
      ) : null}
    </div>
  )
}`,
      },
    },
  },
  render: (args) => <TranscriptVideo {...args} />,
}
