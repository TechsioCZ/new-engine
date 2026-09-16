import type { Meta, StoryObj } from "@storybook/react"
import type { ComponentProps } from "react"
import { fn } from "storybook/test"
import { VideoPlayer } from "../../src/molecules/video-player"

const POSTER_SRC = new URL("../../assets/gallery/shoes-1.avif", import.meta.url)
  .href

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
  parameters: { layout: "padded" },
  argTypes: {
    muted: { control: "boolean" },
    volume: { control: { type: "range", min: 0, max: 1, step: 0.1 } },
    seekTime: { control: { type: "number", min: 1, max: 60 } },
    controlsList: {
      control: "check",
      options: ["play", "time", "volume", "fullscreen"],
    },
    height: { control: { type: "number", min: 200, max: 800 } },
  },
  args: {
    src: "https://files.vidstack.io/sprite-fight/480p.mp4",
    poster: POSTER_SRC,
    title: "Sample video",
    controlsList: ["play", "time", "volume", "fullscreen"],
    onPlay: fn(),
    onPause: fn(),
    onVolumeChange: fn(),
  },
}

export default meta
type Story = StoryObj<typeof VideoPlayer>

export const Playground: Story = {
  render: (args) => (
    <VideoPlayerStory
      {...args}
      description="Full controls: playback, seeking, time, volume, and fullscreen. Focus the player to use K for playback and M for mute."
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
