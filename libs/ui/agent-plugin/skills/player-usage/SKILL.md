---
component_version: "1.0.0"
name: player-usage
description: >
  Use after component-usage-ux when an app needs a token-driven media player.
  Player is a headless compound molecule over Vidstack (@vidstack/react); apps
  compose Player.Provider, Player.Poster, Player.Controls and the control parts
  to build their own audio/video UI, themed through --color-player-* tokens.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/player.tsx"
  - "libs/ui/src/tokens/components/molecules/_player.css"
  - "libs/ui/stories/molecules/player.stories.tsx"
  - "https://vidstack.io/docs/player/getting-started/installation/react"
---

# @techsio/ui-kit Player Usage

`Player` is the low-level media player compound. It wraps Vidstack's engine
headlessly and exposes control parts; apps decide the layout. Use `AudioPlayer`
or `VideoPlayer` for a pre-assembled preset.

## Setup

```tsx
import { Player } from "@techsio/ui-kit/molecules/player"

<Player src="https://example.com/media.mp4" poster="https://example.com/poster.jpg">
  <Player.Provider />
  <Player.Poster />
  <Player.Controls className="player-overlay absolute inset-x-0 bottom-0 z-player-controls">
    <Player.ControlGroup>
      <Player.PlayButton />
      <Player.TimeSlider />
      <Player.Time type="current" />
      <Player.Time type="duration" />
      <Player.MuteButton />
      <Player.VolumeSlider />
      <Player.FullscreenButton />
    </Player.ControlGroup>
  </Player.Controls>
</Player>
```

The engine handles loading, keyboard shortcuts and state. `Player.Controls`
and `Player.ControlGroup` wrap Vidstack's controls primitives, while buttons
reuse the UI kit's `ActionIcon` through `asChild`.
Toggle buttons expose aria-pressed and accept aria-label for localization.
`Player.Poster` is treated as decorative by default (`aria-hidden="true"`);
pass a non-empty `alt` when the poster conveys information that is not already
covered by the player title.
The sliders are horizontal and own their track and thumb markup.

## Core Patterns

### Keep controls inside Player.Root

Every control part reads media state from the surrounding `Player`, so it must
be rendered inside `Player.Root` (`<Player>…</Player>`).

### Group controls through Player.Controls

`Player.ControlGroup` is a single flex row with token-based padding and gaps.
Nest it in `Player.Controls` so Vidstack owns control visibility. For video,
overlay `Player.Controls` with `player-overlay`; for audio, leave it inline.
Padding defaults to the component token; pass `padding="none"` when the surrounding
layout already provides the spacing (as `AudioPlayer` does).

### Reuse the preset tokens

Visual overrides belong in `--color-player-*` / `--*-player-*` tokens, not in
inline styles. The slider internals are bridged to Vidstack's `--media-*`
variables in `_player.css`.

## Common Mistakes

### HIGH Control part outside Player.Root

Wrong:

```tsx
<Player.ControlGroup>…</Player.ControlGroup>
```

Correct:

```tsx
<Player src="…">
  <Player.Controls>
    <Player.ControlGroup>…</Player.ControlGroup>
  </Player.Controls>
</Player>
```

Source: libs/ui/src/molecules/player.tsx

### HIGH Hardcoding control colors

Wrong:

```tsx
<Player.Controls className="bg-black/60 text-white">…</Player.Controls>
```

Correct:

```tsx
<Player.Controls className="player-overlay z-player-controls">…</Player.Controls>
```

Source: libs/ui/src/tokens/components/molecules/_player.css
