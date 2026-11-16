<!-- Source: libs/ui/src/molecules/video-player.tsx and the supported VideoPlayer API in PR #622. -->

# VideoPlayer: UX guidelines

Use `VideoPlayer` for a single video with an overlaid control bar. Use `Player`
for a custom control layout or additional media features.

- Set `title` to describe the video. The poster is decorative by default.
- `controlsList` supports `play`, `time`, `volume` and `fullscreen`. Keep the
  controls needed to complete the task; their order follows the preset layout.
- The toolbar wraps inside narrow containers so its buttons remain reachable.
- Localize controls with `UiMessagesProvider.messages.player`. Names describe
  the action available in the current playback or mute state.
- `width`, `height` and `style` size the player itself. Verify fixed heights
  with the full control set at the narrowest supported width.
- This preset has no captions toggle. Provide an accessible alternative, or
  compose a custom player when the content requires caption controls.
- Handle playback errors through `onError`; do not leave a failed video as the
  only way to obtain essential information.
