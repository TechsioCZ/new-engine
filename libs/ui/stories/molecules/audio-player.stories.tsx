import type { Meta, StoryObj } from "@storybook/react"
import { fn } from "storybook/test"
import { AudioPlayer } from "../../src/molecules/audio-player"
import { Player } from "../../src/molecules/player"
import {
  PlayerStates,
  playerStatesPlay,
  playerStatesSource,
} from "../helpers/player-states"

const AUDIO_SRC = "https://files.vidstack.io/sprite-fight/audio.mp3"
const COVER_SRC = new URL("../../assets/gallery/shoes-1.avif", import.meta.url)
  .href

// SDK events expose state proxies; record calls without serializing the event.
const playSpy = fn().mockName("onPlay")
const pauseSpy = fn().mockName("onPause")
const controls = [
  "title",
  "muted",
  "volume",
  "playbackRate",
  "skipDuration",
  "loop",
  "preload",
]
const publicProps = [
  ...controls,
  "audioUrl",
  "tracks",
  "slots",
  "onPlay",
  "onPause",
  "onEnded",
  "onError",
  "onVolumeChange",
]

const meta: Meta<typeof AudioPlayer> = {
  title: "Molecules/AudioPlayer",
  component: AudioPlayer,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    controls: { include: publicProps },
    docs: {
      controls: { include: publicProps },
      argTypes: { include: publicProps },
      description: {
        component:
          "An audio preset with an optional title and cover, playback controls, loading/error feedback and content slots. Use Player for a fully custom composition or VideoPlayer for video.",
      },
    },
  },
  argTypes: {
    audioUrl: {
      control: false,
      description:
        "Audio URL or { src, title, cover }. See WithTitleAndCover for the object form.",
    },
    title: { control: "text" },
    loop: { control: "boolean" },
    preload: { control: "select", options: ["none", "metadata", "auto"] },
    muted: { control: "boolean" },
    volume: { control: { type: "range", min: 0, max: 1, step: 0.1 } },
    skipDuration: { control: { type: "number", min: 1, max: 60 } },
    playbackRate: { control: { type: "range", min: 0.5, max: 2, step: 0.25 } },
    slots: {
      control: false,
      description:
        "Replace loading, error, controls or overlay inside the media context. Set a slot to null to remove it.",
    },
    tracks: {
      control: false,
      description:
        "Text tracks for custom compositions. Use Player.Captions and Player.CaptionButton in slots to expose them.",
    },
  },
  args: {
    audioUrl: AUDIO_SRC,
    skipDuration: 10,
    muted: false,
    volume: 1,
    playbackRate: 1,
    loop: false,
    preload: "metadata",
    onPlay: () => playSpy(),
    onPause: () => pauseSpy(),
  },
  render: (args) => (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-200">
      <p>
        Play the sample, seek by {args.skipDuration} seconds, or adjust the
        timeline and volume. Focus the player to use K for playback and M for
        mute.
      </p>
      <AudioPlayer {...args} />
    </div>
  ),
}

export default meta
type Story = StoryObj<typeof AudioPlayer>

export const Playground: Story = {
  parameters: {
    docs: {
      source: {
        code: `import { AudioPlayer } from "@techsio/ui-kit/molecules/audio-player"

export function TrackPreview() {
  return <AudioPlayer audioUrl="https://files.vidstack.io/sprite-fight/audio.mp3" skipDuration={10} />
}`,
      },
      description: {
        story:
          "The audio preset provides seeking, playback and mute at every width, with the volume slider hidden below the small breakpoint.",
      },
    },
  },
}

export const States: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare ready media with a real decoding error, recover through the public error slot and retry callback, and learn how to inspect loading with network throttling.",
      },
      source: { code: playerStatesSource("audio") },
    },
  },
  render: () => <PlayerStates kind="audio" />,
  play: playerStatesPlay,
}

export const WithTitleAndCover: Story = {
  parameters: {
    docs: {
      source: {
        code: `import { AudioPlayer } from "@techsio/ui-kit/molecules/audio-player"

export function TrackWithCover() {
  return (
    <AudioPlayer audioUrl={{
      src: "https://files.vidstack.io/sprite-fight/audio.mp3",
      title: "Sample track",
      cover: "/images/track-cover.avif", // Your application's cover image.
    }} />
  )
}`,
      },
      description: {
        story:
          "A title and decorative cover identify the track while preserving space for its timeline and keyboard controls.",
      },
    },
  },
  args: {
    audioUrl: {
      src: AUDIO_SRC,
      title: "Sample track",
      cover: COVER_SRC,
    },
  },
}

export const CustomControls: Story = {
  args: {
    playbackRate: 1.25,
    preload: "none",
    slots: {
      controls: (
        <Player.Controls>
          <Player.ControlGroup className="flex-wrap" padding="none">
            <Player.PlayButton />
            <Player.TimeSlider />
            <Player.Time type="current" />
            <Player.MuteButton />
          </Player.ControlGroup>
        </Player.Controls>
      ),
    },
  },
  parameters: {
    docs: {
      source: {
        code: `import { AudioPlayer } from "@techsio/ui-kit/molecules/audio-player"
import { Player } from "@techsio/ui-kit/molecules/player"

export function CompactAudio() {
  return (
    <AudioPlayer
      audioUrl="https://files.vidstack.io/sprite-fight/audio.mp3"
      playbackRate={1.25}
      preload="none"
      slots={{ controls: (
        <Player.Controls>
          <Player.ControlGroup className="flex-wrap" padding="none">
            <Player.PlayButton />
            <Player.TimeSlider />
            <Player.Time type="current" />
            <Player.MuteButton />
          </Player.ControlGroup>
        </Player.Controls>
      ) }}
    />
  )
}`,
      },
      description: {
        story:
          "A compact controls slot uses the preset media context; playbackRate is forwarded to the engine and starts this example at 1.25× speed.",
      },
    },
  },
}
