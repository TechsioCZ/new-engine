import type { Meta, StoryObj } from "@storybook/react"
import { type ComponentProps, useRef, useState } from "react"
import { fn } from "storybook/test"
import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { Player, type PlayerTextTrack } from "../../src/molecules/player"
import { VideoPlayer } from "../../src/molecules/video-player"
import {
  PlayerStates,
  playerStatesPlay,
  playerStatesSource,
} from "../helpers/player-states"
import { configurePlayerStreaming } from "../helpers/player-streaming"

const POSTER_SRC = new URL("../../assets/gallery/shoes-1.avif", import.meta.url)
  .href
const LANGUAGE_TRACKS: readonly PlayerTextTrack[] = [
  {
    id: "settings-english",
    kind: "subtitles",
    language: "en",
    label: "English",
    default: true,
    content:
      "WEBVTT\n\n00:00.000 --> 00:30.000\nChoose English or Czech subtitles in Settings.\n",
  },
  {
    id: "settings-czech",
    kind: "subtitles",
    language: "cs",
    label: "Čeština",
    content:
      "WEBVTT\n\n00:00.000 --> 00:30.000\nV Nastavení si vyberte české nebo anglické titulky.\n",
  },
]
const LANGUAGE_TRACKS_SOURCE = `const tracks: readonly PlayerTextTrack[] = ${JSON.stringify(LANGUAGE_TRACKS, null, 2)}`

// SDK events expose state proxies; record calls without serializing the event.
const playSpy = fn().mockName("onPlay")
const pauseSpy = fn().mockName("onPause")
const controls = [
  "src",
  "poster",
  "title",
  "muted",
  "volume",
  "playbackRate",
  "playsInline",
  "loop",
  "preload",
  "load",
  "posterLoad",
  "chapters",
  "seekTime",
  "controlsList",
  "height",
]
const publicProps = [
  ...controls,
  "tracks",
  "thumbnails",
  "slots",
  "storage",
  "onPlay",
  "onPause",
  "onEnded",
  "onError",
  "onVolumeChange",
]

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
    controls: { include: publicProps },
    docs: {
      controls: { include: publicProps },
      argTypes: { include: publicProps },
      description: {
        component:
          "A video preset with captions, chapter and thumbnail timelines, adaptive-quality settings, optional picture-in-picture, visible loading and configurable content slots. Use Player for a fully custom composition or AudioPlayer for audio.",
      },
    },
  },
  argTypes: {
    src: { control: "text" },
    poster: { control: "text" },
    title: { control: "text" },
    loop: { control: "boolean" },
    preload: { control: "select", options: ["none", "metadata", "auto"] },
    load: {
      control: "select",
      options: ["eager", "idle", "visible", "play", "custom"],
      description:
        "When the media provider may load. Visible defers media requests until the player enters the viewport; preload controls what loads afterward.",
    },
    posterLoad: {
      control: "select",
      options: ["eager", "idle", "visible", "custom"],
      description: "Poster loading is independent of media loading.",
    },
    chapters: {
      control: "boolean",
      description:
        "Split the timeline using a chapters text track. Settings also lists available chapter titles.",
    },
    thumbnails: {
      control: false,
      description:
        "Timeline preview images supplied as a WebVTT URL or timestamped image objects. See ChaptersAndPreviews.",
    },
    muted: { control: "boolean" },
    volume: { control: { type: "range", min: 0, max: 1, step: 0.1 } },
    playsInline: { control: "boolean" },
    playbackRate: { control: { type: "range", min: 0.5, max: 2, step: 0.25 } },
    tracks: {
      control: false,
      description:
        "Caption/subtitle tracks with a stable id, kind, language and label, using src or inline content. See Captioned.",
    },
    slots: {
      control: false,
      description:
        "Replace loading, error, controls or overlay inside the media context. Set a slot to null to remove it.",
    },
    storage: {
      control: false,
      description:
        "Opt-in Vidstack preference storage. A string names the shared preference key; playback position is stored per media. See RememberPreferences.",
    },
    seekTime: { control: { type: "number", min: 1, max: 60 } },
    controlsList: {
      control: "check",
      options: [
        "play",
        "time",
        "volume",
        "captions",
        "fullscreen",
        "settings",
        "pip",
      ],
    },
    height: { control: { type: "number", min: 200, max: 800 } },
  },
  args: {
    src: "https://files.vidstack.io/sprite-fight/480p.mp4",
    poster: POSTER_SRC,
    title: "Sample video",
    controlsList: ["play", "time", "volume", "captions", "fullscreen"],
    playsInline: true,
    muted: false,
    volume: 1,
    playbackRate: 1,
    loop: false,
    preload: "metadata",
    seekTime: 10,
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
      source: {
        code: `import { VideoPlayer } from "@techsio/ui-kit/molecules/video-player"

export function FilmPreview() {
  return <VideoPlayer src="https://files.vidstack.io/sprite-fight/480p.mp4" title="Sample video" playsInline />
}`,
      },
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

export const States: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare ready video with a real decoding error; retry selects the sample media and resets the player through its public API.",
      },
      source: { code: playerStatesSource("video") },
    },
  },
  render: () => <PlayerStates kind="video" />,
  play: playerStatesPlay,
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
      source: {
        code: `import { VideoPlayer } from "@techsio/ui-kit/molecules/video-player"

export function PlaybackOnlyVideo() {
  return <VideoPlayer src="https://files.vidstack.io/sprite-fight/480p.mp4" title="Sample video" controlsList={["play", "time"]} />
}`,
      },
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
      source: {
        code: `import { VideoPlayer } from "@techsio/ui-kit/molecules/video-player"

export function FixedHeightVideo() {
  return <VideoPlayer src="https://files.vidstack.io/sprite-fight/480p.mp4" title="Sample video" height={320} />
}`,
      },
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
      source: {
        code: `import { VideoPlayer } from "@techsio/ui-kit/molecules/video-player"

export function CaptionedVideo() {
  return (
    <VideoPlayer
      src="https://files.vidstack.io/sprite-fight/480p.mp4"
      title="Sample video"
      tracks={[{
        id: "sample-english",
        kind: "subtitles",
        language: "en",
        label: "English",
        default: true,
        content: "WEBVTT\\n\\n00:00.000 --> 00:30.000\\nThe sample includes English subtitles. Use the captions button to hide or show them.\\n",
      }]}
    />
  )
}`,
      },
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

export const Settings: Story = {
  args: {
    controlsList: ["play", "time", "volume", "fullscreen", "settings"],
  },
  parameters: {
    docs: {
      description: {
        story:
          "Opt into Settings to choose a playback speed from the SDK options; media without subtitle tracks has no captions submenu.",
      },
      source: {
        code: `import { VideoPlayer } from "@techsio/ui-kit/molecules/video-player"

export function VideoWithSettings() {
  return (
    <VideoPlayer
      src="https://files.vidstack.io/sprite-fight/480p.mp4"
      title="Sample video"
      controlsList={["play", "time", "volume", "fullscreen", "settings"]}
    />
  )
}`,
      },
    },
  },
  render: (args) => (
    <VideoPlayerStory
      {...args}
      description="Open Settings and choose Playback speed. The preset keeps its usual controls; Settings is added only when controlsList includes it."
    />
  ),
}

export const MultipleLanguages: Story = {
  args: {
    controlsList: [
      "play",
      "time",
      "volume",
      "captions",
      "fullscreen",
      "settings",
    ],
    tracks: LANGUAGE_TRACKS,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Choose English or Czech subtitles in Settings, or use the captions button to turn the selected language off and on.",
      },
      source: {
        code: `import type { PlayerTextTrack } from "@techsio/ui-kit/molecules/player"
import { VideoPlayer } from "@techsio/ui-kit/molecules/video-player"

${LANGUAGE_TRACKS_SOURCE}

export function MultilingualVideo() {
  return (
    <VideoPlayer
      src="https://files.vidstack.io/sprite-fight/480p.mp4"
      title="Sample video"
      tracks={tracks}
      controlsList={["play", "time", "volume", "captions", "fullscreen", "settings"]}
    />
  )
}`,
      },
    },
  },
  render: (args) => (
    <VideoPlayerStory
      {...args}
      description="Play the sample, then open Settings → Subtitles to select English or Čeština. English is the default; the captions button toggles the selected language."
    />
  ),
}

function RememberPreferencesVideo({
  src,
  poster,
  title,
}: Pick<ComponentProps<typeof VideoPlayer>, "src" | "poster" | "title">) {
  const [attempt, setAttempt] = useState(0)
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-200">
      <p>
        Choose a speed and subtitle language in Settings, then select Reload
        player. Vidstack restores preferences from this demo's storage key.
        Volume, mute, speed and captions are shared preferences; playback
        position belongs to the individual media source.
      </p>
      <VideoPlayer
        controlsList={[
          "play",
          "time",
          "volume",
          "captions",
          "fullscreen",
          "settings",
        ]}
        key={attempt}
        poster={poster}
        src={src}
        storage="ui-kit-player-preferences-demo-v1"
        title={title}
        tracks={LANGUAGE_TRACKS}
      />
      <Button
        appearance="outline"
        onClick={() => setAttempt((value) => value + 1)}
        type="button"
      >
        Reload player
      </Button>
    </div>
  )
}

export const RememberPreferences: Story = {
  parameters: {
    controls: { include: ["src", "poster", "title"] },
    docs: {
      description: {
        story:
          "Opt into SDK storage and remount the player to restore its preferences; this example passes no initial speed, volume or mute props that would compete with restoration.",
      },
      source: {
        code: `import { useState } from "react"
import { Button } from "@techsio/ui-kit/atoms/button"
import type { PlayerTextTrack } from "@techsio/ui-kit/molecules/player"
import { VideoPlayer } from "@techsio/ui-kit/molecules/video-player"

${LANGUAGE_TRACKS_SOURCE}

export function RememberVideoPreferences() {
  const [attempt, setAttempt] = useState(0)
  return (
    <div>
      <VideoPlayer
        key={attempt}
        src="https://files.vidstack.io/sprite-fight/480p.mp4"
        title="Sample video"
        tracks={tracks}
        controlsList={["play", "time", "volume", "captions", "fullscreen", "settings"]}
        storage="ui-kit-player-preferences-demo-v1"
      />
      <Button appearance="outline" type="button" onClick={() => setAttempt((value) => value + 1)}>
        Reload player
      </Button>
    </div>
  )
}`,
      },
    },
  },
  render: ({ src, poster, title }) => (
    <RememberPreferencesVideo poster={poster} src={src} title={title} />
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
            <Player.Controls
              className="player-overlay absolute inset-x-0 bottom-0 z-player-controls"
              reserveCaptionSpace
            >
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
            <Player.Controls className="player-overlay absolute inset-x-0 bottom-0 z-player-controls" reserveCaptionSpace>
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

const CHAPTER_TRACKS: readonly PlayerTextTrack[] = [
  {
    id: "sample-chapters",
    kind: "chapters",
    language: "en",
    label: "Chapters",
    default: true,
    content:
      "WEBVTT\n\n00:00.000 --> 00:10.000\nIntroduction\n\n00:10.000 --> 00:20.000\nDetails\n\n00:20.000 --> 00:30.000\nSummary\n",
  },
]
const PREVIEW_IMAGES = [
  { url: "/player-media/thumbnail-0.png", startTime: 0 },
  { url: "/player-media/thumbnail-10.png", startTime: 10 },
  { url: "/player-media/thumbnail-20.png", startTime: 20 },
]

export const ChaptersAndPreviews: Story = {
  args: {
    src: "/player-media/sample.mp4",
    poster: "/player-media/poster.png",
    tracks: CHAPTER_TRACKS,
    chapters: true,
    thumbnails: PREVIEW_IMAGES,
    controlsList: ["play", "time", "volume", "fullscreen", "settings"],
  },
  parameters: {
    docs: {
      description: {
        story:
          "A real 30-second recording with three chapters and local timeline thumbnails. Hover or drag the timeline to preview a frame; choose Settings → Chapters to jump to a chapter.",
      },
      source: {
        code: `import type { PlayerTextTrack } from "@techsio/ui-kit/molecules/player"
import { VideoPlayer } from "@techsio/ui-kit/molecules/video-player"

const tracks: readonly PlayerTextTrack[] = ${JSON.stringify(CHAPTER_TRACKS, null, 2)}
const thumbnails = ${JSON.stringify(PREVIEW_IMAGES, null, 2)}

export function ChapterVideo() {
  return (
    <VideoPlayer
      src="/player-media/sample.mp4"
      poster="/player-media/poster.png"
      title="Chaptered product film"
      tracks={tracks}
      chapters
      thumbnails={thumbnails}
      controlsList={["play", "time", "volume", "fullscreen", "settings"]}
    />
  )
}`,
      },
    },
  },
  render: (args) => (
    <VideoPlayerStory
      {...args}
      description="Preview the timeline, or open Settings → Chapters to jump between Introduction, Details and Summary. Each chapter has its own preview image."
    />
  ),
}

function LazyVideo(args: ComponentProps<typeof VideoPlayer>) {
  const videoRef = useRef<HTMLDivElement>(null)
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-200">
      <div className="flex min-h-screen flex-col items-start gap-200">
        <p>
          The video starts below the viewport. Show video scrolls to it;
          Vidstack starts loading media when the player becomes visible. Its
          poster may load earlier.
        </p>
        <Button
          appearance="outline"
          onClick={() => videoRef.current?.scrollIntoView({ block: "start" })}
          type="button"
        >
          Show video
        </Button>
      </div>
      <div ref={videoRef}>
        <VideoPlayer {...args} />
      </div>
    </div>
  )
}

export const LazyLoading: Story = {
  args: {
    src: "/player-media/sample.mp4",
    poster: "/player-media/poster.png",
    load: "visible",
    posterLoad: "eager",
    preload: "metadata",
  },
  parameters: {
    docs: {
      description: {
        story:
          "The player is mounted below the viewport with load=visible. Show video reveals it without mounting a replacement; posterLoad=eager remains independent of media requests.",
      },
      source: {
        code: `import { useRef } from "react"
import { Button } from "@techsio/ui-kit/atoms/button"
import { VideoPlayer } from "@techsio/ui-kit/molecules/video-player"

export function DeferredVideo() {
  const videoRef = useRef<HTMLDivElement>(null)
  return (
    <div className="flex flex-col gap-200">
      <div className="flex min-h-screen flex-col items-start gap-200">
        <p>The video loads when it enters the viewport.</p>
        <Button appearance="outline" type="button"
          onClick={() => videoRef.current?.scrollIntoView({ block: "start" })}>
          Show video
        </Button>
      </div>
      <div ref={videoRef}>
        <VideoPlayer
          src="/player-media/sample.mp4"
          poster="/player-media/poster.png"
          title="Deferred product film"
          load="visible"
          posterLoad="eager"
          preload="metadata"
        />
      </div>
    </div>
  )
}`,
      },
    },
  },
  render: (args) => <LazyVideo {...args} />,
}

export const PictureInPicture: Story = {
  args: {
    src: "/player-media/sample.mp4",
    poster: "/player-media/poster.png",
    controlsList: ["play", "time", "volume", "pip", "fullscreen"],
  },
  parameters: {
    docs: {
      description: {
        story:
          "Opt into the native picture-in-picture action with pip. The control is available when the browser and current provider support it; the SDK owns entry, exit and pressed state.",
      },
      source: {
        code: `import { VideoPlayer } from "@techsio/ui-kit/molecules/video-player"

export function FloatingVideo() {
  return (
    <VideoPlayer
      src="/player-media/sample.mp4"
      poster="/player-media/poster.png"
      title="Picture-in-picture product film"
      controlsList={["play", "time", "volume", "pip", "fullscreen"]}
    />
  )
}`,
      },
    },
  },
  render: (args) => (
    <VideoPlayerStory
      {...args}
      description="Play the video, then use Picture in picture to keep watching in a floating window when your browser supports it. Use the same action to return."
    />
  ),
}

export const AdaptiveHLS: Story = {
  args: {
    src: { src: "/player-media/master.m3u8", type: "application/x-mpegurl" },
    poster: "/player-media/poster.png",
    onProviderChange: configurePlayerStreaming,
    controlsList: ["play", "time", "volume", "fullscreen", "settings"],
  },
  argTypes: { src: { control: false } },
  parameters: {
    docs: {
      description: {
        story:
          "A real local HLS stream with 180p and 360p renditions. Install hls.js in the consuming app and supply it through onProviderChange. Settings → Video quality offers Auto and supported renditions; browsers using native HLS may manage quality themselves.",
      },
      source: {
        code: `import { isHLSProvider, type MediaProviderAdapter } from "@vidstack/react"
import { VideoPlayer } from "@techsio/ui-kit/molecules/video-player"
import Hls from "hls.js"

// Install hls.js@^1 in the app that owns this provider configuration.
function configureHLS(provider: MediaProviderAdapter | null) {
  if (isHLSProvider(provider)) {
    provider.library = Hls
  }
}

export function AdaptiveVideo() {
  return (
    <VideoPlayer
      src={{ src: "/player-media/master.m3u8", type: "application/x-mpegurl" }}
      poster="/player-media/poster.png"
      title="Adaptive HLS product film"
      onProviderChange={configureHLS}
      controlsList={["play", "time", "volume", "fullscreen", "settings"]}
    />
  )
}`,
      },
    },
  },
  render: (args) => (
    <VideoPlayerStory
      {...args}
      description="This HLS recording has 180p and 360p renditions. Play it, then open Settings → Video quality to choose a supported rendition or return to Auto."
    />
  ),
}

export const AdaptiveDASH: Story = {
  args: {
    src: { src: "/player-media/stream.mpd", type: "application/dash+xml" },
    poster: "/player-media/poster.png",
    onProviderChange: configurePlayerStreaming,
    controlsList: ["play", "time", "volume", "fullscreen", "settings"],
  },
  argTypes: { src: { control: false } },
  parameters: {
    docs: {
      description: {
        story:
          "A real local MPEG-DASH stream with 180p and 360p renditions. The pinned Vidstack provider supports dashjs 4.x; install that version in the consuming app. Settings → Video quality uses the provider's actual rendition list.",
      },
      source: {
        code: `import { isDASHProvider, type MediaProviderAdapter } from "@vidstack/react"
import { VideoPlayer } from "@techsio/ui-kit/molecules/video-player"

// Install dashjs@^4 for the pinned Vidstack provider.
function configureDASH(provider: MediaProviderAdapter | null) {
  if (isDASHProvider(provider)) {
    provider.library = async () => {
      // Prevent dash.all from creating a second player for the same video.
      Object.assign(window, {
        dashjs: { ...Reflect.get(window, "dashjs"), skipAutoCreate: true },
      })
      const { default: dashjs } = await import("dashjs")
      // This SDK version also reads the browser namespace after importing.
      Object.assign(window, { dashjs })
      return { default: dashjs }
    }
  }
}

export function AdaptiveVideo() {
  return (
    <VideoPlayer
      src={{ src: "/player-media/stream.mpd", type: "application/dash+xml" }}
      poster="/player-media/poster.png"
      title="Adaptive DASH product film"
      onProviderChange={configureDASH}
      controlsList={["play", "time", "volume", "fullscreen", "settings"]}
    />
  )
}`,
      },
    },
  },
  render: (args) => (
    <VideoPlayerStory
      {...args}
      description="This MPEG-DASH recording has 180p and 360p renditions. Open Settings → Video quality to compare a manual quality choice with Auto while the real stream plays."
    />
  ),
}
