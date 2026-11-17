---
name: audio-player-usage
description: >
  Use after component-usage-ux when an app needs a ready-made audio player.
  AudioPlayer is an opinionated preset over Player with a Semi Design-shaped
  audioUrl prop (string or { src, title?, cover? }); v1 accepts a single source.
metadata:
  component_version: "1.2.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux player-usage app-token-overrides"
  resources: "references/ux.md ../../references/component-contracts.md ../../references/consumer_app_usage_rules.md"
  sources: "https://semi.design/en-US/plus/audioPlayer"
  contributor_sources: "libs/ui/src/molecules/audio-player.tsx libs/ui/stories/molecules/audio-player.stories.tsx"
  audience: "consumer"
---

> Portable scope: Use the installed package's exported types and bundled sibling skills. Repository source paths are optional contributor evidence, not consumer prerequisites; use the consuming app's own checks. Resolve ../../references/ paths from this skill's folder, not the app working directory.

# @techsio/ui-kit AudioPlayer Usage

`AudioPlayer` is the pre-assembled audio card. It places the optional cover and
title above a prominent play action and timeline, with readable current and
total time below the bar. It uses `Player`, with loading/error feedback and media
announcements. Use `slots` for local layout customization, or `Player` when
the whole composition should be app-owned.

## Setup

```tsx
import { AudioPlayer } from "@techsio/ui-kit/molecules/audio-player"

export function TrackPreview() {
  return <AudioPlayer audioUrl="https://example.com/track.mp3" />
}

export function TrackWithCover() {
  return (
    <AudioPlayer
      audioUrl={{
        src: "https://example.com/track.mp3",
        title: "Track title",
        cover: "https://example.com/cover.jpg",
      }}
    />
  )
}
```

## Props

- `audioUrl` — `string | AudioInfo`; one source with optional title and cover.
- `autoPlay` — request playback when ready; browser autoplay policy still applies.
- `muted`, `volume`, `loop` — playback settings.
- `onPlay`, `onPause`, `onEnded`, `onError` — playback events.
- `onVolumeChange` — callback receiving the numeric volume (0–1).
- `className`, `style` — visual overrides on the outer audio card.
- `ref` — the underlying Vidstack player instance.
- `controlsList` — the built-in groups to show: `"play"`, `"seek"`, `"time"`,
  `"volume"` and `"settings"`. Defaults to `["play", "time", "volume"]`.
  `"seek"` adds backward/forward buttons; `"settings"` adds playback speed and
  other options available from the provider. It selects groups in the preset
  layout; use `slots.controls` to reorder controls.
- `skipDuration` — seconds for the optional backward/forward seek buttons
  (default `10`). The visible skip amounts follow this value.
- `tracks` — optional text tracks; each requires a unique `id` and `kind`.
  Use `language`, `label` and `src` or inline `content` as appropriate.
- Other Vidstack `MediaPlayer` props are forwarded, including `preload`,
  `playbackRate`, `currentTime`, `crossOrigin` and media events. `children`
  stays internal to the preset; use the named slots instead.

## Podcast controls

Keep the default controls for a short preview. For spoken-word listening, opt
into skip buttons and settings so listeners can replay a passage or change
playback speed without replacing the preset:

```tsx
import { AudioPlayer } from "@techsio/ui-kit/molecules/audio-player"

<AudioPlayer
  audioUrl={{
    src: "https://example.com/episode.mp3",
    title: "Inside the workshop — Choosing a running shoe",
    cover: "/images/episode-cover.avif",
  }}
  controlsList={["play", "seek", "time", "volume", "settings"]}
  skipDuration={10}
/>
```

## Slots and feedback

`slots` accepts `loading`, `error`, `controls` and `overlay` React nodes.
Omit a slot to keep its default; set it to `null` to suppress that content.
Loading/error nodes are wrapped by the state-aware `Player.Loading` and
`Player.Error` parts. The default error view is localized and retries by
reloading the provider.

`slots.error` also accepts `({ error, retry }) => ReactNode` for custom error
copy and a UI-kit retry button. Keep a clear accessible error description and
call `retry()` when the user chooses to try again.

`slots.controls` replaces the entire default controls node. Compose
`Player.Controls` and `Player.ControlGroup` there; all slots remain inside
the media context, so `Player.*` controls use the same playback state.
`slots.overlay` adds content inside the media root.

```tsx
import { AudioPlayer } from "@techsio/ui-kit/molecules/audio-player"
import { Player } from "@techsio/ui-kit/molecules/player"

<AudioPlayer
  audioUrl="https://example.com/track.mp3"
  playbackRate={1.25}
  slots={{
    controls: (
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
    ),
  }}
/>
```

`Player` is the shared compound API for both audio and video. Neither preset
owns a separate family of control parts. Reuse `Player.*` inside their
`slots.controls`; preset `children` remain internal.

The default timeline, play and mute remain usable in a narrow container. The
auxiliary volume slider adapts to the audio card's available width rather than
the viewport alone. A narrow sidebar on desktop therefore uses the same compact
layout as a narrow mobile card. Preserve seeking and keyboard playback when
replacing the default controls.

## Common Mistakes

### HIGH Expecting playlist behaviour in v1

Wrong:

```tsx
<AudioPlayer audioUrl={[trackA, trackB]} /> // expects prev/next navigation
```

Correct: pass one string or AudioInfo object. Arrays are not accepted; playlist
navigation is outside v1.

Source: libs/ui/src/molecules/audio-player.tsx

Control labels follow `UiMessagesProvider.messages.player`; explicit control `aria-label` props take precedence.
