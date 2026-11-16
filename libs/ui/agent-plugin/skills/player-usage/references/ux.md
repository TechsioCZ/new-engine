<!-- Source: libs/ui/src/molecules/player.tsx and the supported Player API in PR #622. -->

# Player: UX guidelines

Use `Player` when an app needs a custom arrangement of audio or video controls.
Use `AudioPlayer` or `VideoPlayer` for the ready-made layout.

- Keep every control inside the same `Player` root as its media provider.
- Give the media a meaningful `title`; the poster is decorative unless its `alt`
  explains information the title does not already convey.
- Keep playback, seeking and mute available by keyboard and pointer. Focus the
  root for K (play/pause) and M (mute); sliders support arrow keys.
- Localize control names through `UiMessagesProvider.messages.player`. An
  explicit `aria-label` on a control wins over the catalog. The play, mute and
  fullscreen names follow their current state.
- Keep controls inside the player at narrow widths. Video toolbars can wrap;
  the preset volume slider is hidden below the `sm` viewport breakpoint, while
  mute remains available.
- Do not autoplay audible content without the user's intent. Handle `onError`
  in the consuming app when it needs a retry or alternate source.
- This version does not include a captions toggle or playlist navigation.
  Supply a transcript or accessible alternative when the content requires it.

The current engine is `@vidstack/react` 1.15.6. Upstream has deprecated Vidstack
in favor of Video.js 10; a future engine migration is separate from this API.
