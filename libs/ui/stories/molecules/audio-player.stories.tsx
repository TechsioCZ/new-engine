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
  "controlsList",
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
          "An audio preset with an optional title and cover above a prominent play action and timeline. Choose its built-in control groups with controlsList, or replace slots.controls with a Player composition. Use VideoPlayer for video.",
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
    controlsList: {
      control: "inline-check",
      options: ["play", "seek", "time", "volume", "settings"],
      description:
        "Visible built-in control groups. Defaults to play, time and volume; seek and settings are opt-in. Use slots.controls to reorder the layout.",
      table: { defaultValue: { summary: '["play", "time", "volume"]' } },
    },
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
    controlsList: ["play", "time", "volume"],
    loop: false,
    preload: "metadata",
    onPlay: () => playSpy(),
    onPause: () => pauseSpy(),
  },
  render: (args) => (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-200">
      <p>
        Play the sample or choose a position on the timeline. Enable seek or
        settings in Controls for skip buttons or playback speed. Focus the
        player to use K for playback and M for mute.
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
  return <AudioPlayer audioUrl="https://files.vidstack.io/sprite-fight/audio.mp3" />
}`,
      },
      description: {
        story:
          "The default preset keeps play prominent, places readable current and total time below the timeline, and retains mute when a narrow container hides the volume slider.",
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
          <Player.ControlGroup
            className="flex-col items-stretch"
            padding="none"
          >
            <Player.TimeSlider />
            <Player.Control className="w-full justify-between">
              <Player.Control>
                <Player.MuteButton />
                <Player.SettingsMenu />
              </Player.Control>
              <Player.Control>
                <Player.Time type="current" />
                <span aria-hidden="true">/</span>
                <Player.Time type="duration" />
                <Player.PlayButton />
              </Player.Control>
            </Player.Control>
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
          <Player.ControlGroup className="flex-col items-stretch" padding="none">
            <Player.TimeSlider />
            <Player.Control className="w-full justify-between">
              <Player.Control>
                <Player.MuteButton />
                <Player.SettingsMenu />
              </Player.Control>
              <Player.Control>
                <Player.Time type="current" />
                <span aria-hidden="true">/</span>
                <Player.Time type="duration" />
                <Player.PlayButton />
              </Player.Control>
            </Player.Control>
          </Player.ControlGroup>
        </Player.Controls>
      ) }}
    />
  )
}`,
      },
      description: {
        story:
          "Replace the default controls with a full-width timeline, mute and settings on the left, and time and play on the right. Every Player part shares the preset media context; playback starts at 1.25× speed.",
      },
    },
  },
}

export const Podcast: Story = {
  args: {
    audioUrl: {
      src: AUDIO_SRC,
      title: "Inside the workshop — Choosing a running shoe",
      cover: COVER_SRC,
    },
    controlsList: ["play", "seek", "time", "volume", "settings"],
    skipDuration: 10,
  },
  parameters: {
    docs: {
      description: {
        story:
          "A wide podcast card keeps controls inline, while narrower containers reflow the layout. Visible skip amounts and a playback-speed menu support spoken-word listening; the recording uses the Playground sample media.",
      },
      source: {
        code: `import { AudioPlayer } from "@techsio/ui-kit/molecules/audio-player"

export function PodcastEpisode() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <AudioPlayer
        audioUrl={{
          src: "https://files.vidstack.io/sprite-fight/audio.mp3",
          title: "Inside the workshop — Choosing a running shoe",
          cover: "/images/episode-cover.avif", // Your application's cover image.
        }}
        controlsList={["play", "seek", "time", "volume", "settings"]}
        skipDuration={10}
      />
    </div>
  )
}`,
      },
    },
  },
  render: (args) => (
    <div className="mx-auto w-full max-w-3xl">
      <AudioPlayer {...args} />
    </div>
  ),
}

export const NarrowContainer: Story = {
  args: {
    audioUrl: {
      src: AUDIO_SRC,
      title: "A short guide to everyday shoe care",
      cover: COVER_SRC,
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "A token-sized narrow panel keeps play, timeline, readable time and mute usable even on a wide desktop viewport; responsive audio controls follow their container.",
      },
      source: {
        code: `import { AudioPlayer } from "@techsio/ui-kit/molecules/audio-player"

export function SidebarAudio() {
  return (
    <div className="w-full max-w-xs">
      <AudioPlayer audioUrl={{
        src: "https://files.vidstack.io/sprite-fight/audio.mp3",
        title: "A short guide to everyday shoe care",
        cover: "/images/episode-cover.avif", // Your application's cover image.
      }} />
    </div>
  )
}`,
      },
    },
  },
  render: (args) => (
    <div className="mx-auto w-full max-w-xs">
      <AudioPlayer {...args} />
    </div>
  ),
}
