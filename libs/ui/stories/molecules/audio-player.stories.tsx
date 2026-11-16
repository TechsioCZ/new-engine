import type { Meta, StoryObj } from "@storybook/react"
import { fn } from "storybook/test"
import { AudioPlayer } from "../../src/molecules/audio-player"
import { Player } from "../../src/molecules/player"

const AUDIO_SRC = "https://files.vidstack.io/sprite-fight/audio.mp3"
const COVER_SRC = new URL("../../assets/gallery/shoes-1.avif", import.meta.url)
  .href

// SDK events expose state proxies; record calls without serializing the event.
const playSpy = fn().mockName("onPlay")
const pauseSpy = fn().mockName("onPause")

const meta: Meta<typeof AudioPlayer> = {
  title: "Molecules/AudioPlayer",
  component: AudioPlayer,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "An audio preset with an optional title and cover, playback controls, loading/error feedback and content slots. Use Player for a fully custom composition or VideoPlayer for video.",
      },
    },
  },
  argTypes: {
    muted: { control: "boolean" },
    volume: { control: { type: "range", min: 0, max: 1, step: 0.1 } },
    skipDuration: { control: { type: "number", min: 1, max: 60 } },
    playbackRate: { control: { type: "range", min: 0.5, max: 2, step: 0.25 } },
    slots: { control: false },
    tracks: { control: false },
  },
  args: {
    audioUrl: AUDIO_SRC,
    skipDuration: 10,
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
      description: {
        story:
          "The audio preset provides seeking, playback and mute at every width, with the volume slider hidden below the small breakpoint.",
      },
    },
  },
}

export const WithTitleAndCover: Story = {
  parameters: {
    docs: {
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
      description: {
        story:
          "A compact controls slot uses the preset media context; playbackRate is forwarded to the engine and starts this example at 1.25× speed.",
      },
    },
  },
}
