import type { Meta, StoryObj } from "@storybook/react"
import { fn } from "storybook/test"
import { AudioPlayer } from "../../src/molecules/audio-player"

const AUDIO_SRC = "https://files.vidstack.io/sprite-fight/audio.mp3"
const COVER_SRC = new URL("../../assets/gallery/shoes-1.avif", import.meta.url)
  .href

const meta: Meta<typeof AudioPlayer> = {
  title: "Molecules/AudioPlayer",
  component: AudioPlayer,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  argTypes: {
    muted: { control: "boolean" },
    volume: { control: { type: "range", min: 0, max: 1, step: 0.1 } },
    skipDuration: { control: { type: "number", min: 1, max: 60 } },
  },
  args: { audioUrl: AUDIO_SRC, skipDuration: 10, onPlay: fn(), onPause: fn() },
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

export const Playground: Story = {}

export const WithTitleAndCover: Story = {
  args: {
    audioUrl: {
      src: AUDIO_SRC,
      title: "Sample track",
      cover: COVER_SRC,
    },
  },
}
