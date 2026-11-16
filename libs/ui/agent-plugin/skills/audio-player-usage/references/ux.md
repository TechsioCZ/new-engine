<!-- Source: libs/ui/src/molecules/audio-player.tsx and the supported AudioPlayer API in PR #622. -->

# AudioPlayer: UX guidelines

Use `AudioPlayer` for one audio source with playback, seeking, time and mute.
Use `Player` when the control layout needs to be customized.

- Pass a string `audioUrl` or one `{ src, title?, cover? }` object. Arrays and
  playlist navigation are not supported.
- Prefer a meaningful title. The cover repeats the track identity and is
  decorative, so its image has empty alt text.
- The time slider stays available on mobile. The volume slider is hidden below
  the `sm` viewport breakpoint; mute remains available.
- Localize controls with `UiMessagesProvider.messages.player`.
- Let the user start playback. Browser autoplay policies may reject autoplay.
- Provide a transcript when the audio carries information needed for the task.
- Handle source errors through `onError` in the consuming app.
