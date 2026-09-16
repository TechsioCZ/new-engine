---
component_version: "1.0.0"
name: audio-player-usage
description: >
  Use after component-usage-ux when an app needs a ready-made audio player.
  AudioPlayer is an opinionated preset over Player with a Semi Design-shaped
  audioUrl prop (string or { src, title?, cover? }); v1 accepts a single source.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - player-usage
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/audio-player.tsx"
  - "libs/ui/stories/molecules/audio-player.stories.tsx"
  - "https://semi.design/en-US/plus/audioPlayer"
---

# @techsio/ui-kit AudioPlayer Usage

`AudioPlayer` is the pre-assembled audio card. It renders cover + title +
playback controls over `Player`.

## Setup

```tsx
import { AudioPlayer } from "@techsio/ui-kit/molecules/audio-player"

<AudioPlayer audioUrl="https://example.com/track.mp3" />
<AudioPlayer
  audioUrl={{
    src: "https://example.com/track.mp3",
    title: "Track title",
    cover: "https://example.com/cover.jpg",
  }}
/>
```

## Props

- `audioUrl` — `string | AudioInfo`; one source with optional title and cover.
- `autoPlay` — request playback when ready; browser autoplay policy still applies.
- `muted`, `volume`, `loop` — playback settings.
- `onPlay`, `onPause`, `onEnded`, `onError` — playback events.
- `onVolumeChange` — callback receiving the numeric volume (0–1).
- `className`, `style` — visual overrides on the outer audio card.
- `ref` — the underlying Vidstack player instance.
- `skipDuration` — seconds for the backward/forward seek buttons (default `10`).

## Common Mistakes

### HIGH Expecting playlist behaviour in v1

Wrong:

```tsx
<AudioPlayer audioUrl={[trackA, trackB]} /> // expects prev/next navigation
```

Correct: pass one string or AudioInfo object. Arrays are not accepted; playlist
navigation is outside v1.

Source: libs/ui/src/molecules/audio-player.tsx
