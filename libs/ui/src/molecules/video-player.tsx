/**
 * VideoPlayer — @techsio/ui-kit molecule.
 *
 * @component VideoPlayer
 * @componentVersion v1.1.0
 * @skill video-player-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the video-player-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { CSSProperties } from "react"
import { tv } from "../utils"
import {
  Player,
  type PlayerPresetSlots,
  type PlayerProps,
  type PlayerTextTrack,
} from "./player"

const videoPlayerStyles = tv({
  slots: {
    root: "player-video aspect-video w-full bg-player-video-bg",
    controls:
      "player-overlay player-video-controls absolute inset-x-0 bottom-0 z-player-controls transition-opacity duration-200",
    layout:
      "flex-col items-stretch gap-player-video-control p-player-video-control",
    toolbar: "w-full flex-wrap justify-between gap-player-video-control",
    leading: "min-w-0 flex-wrap gap-player-video-control",
    trailing: "ms-auto shrink-0 gap-player-video-control",
    timeline: "player-video-timeline flex-none self-stretch",
    seek: "player-video-seek",
    volumeSlider: "player-responsive-volume",
  },
})

export type VideoPlayerControls =
  | "play"
  | "time"
  | "volume"
  | "fullscreen"
  | "captions"

export type VideoPlayerProps = Omit<
  PlayerProps,
  "children" | "src" | "onVolumeChange" | "viewType" | "className" | "style"
> & {
  tracks?: readonly PlayerTextTrack[]
  slots?: PlayerPresetSlots
  src: string
  poster?: string
  seekTime?: number
  controlsList?: readonly VideoPlayerControls[]
  width?: CSSProperties["width"]
  height?: CSSProperties["height"]
  className?: string
  style?: CSSProperties
  onVolumeChange?: (volume: number) => void
}

const DEFAULT_CONTROLS: readonly VideoPlayerControls[] = [
  "play",
  "time",
  "volume",
  "fullscreen",
  "captions",
]

function PlaybackControls({
  play,
  time,
  seekTime,
}: {
  play: boolean
  time: boolean
  seekTime: number
}) {
  return (
    <Player.Control className={videoPlayerStyles().leading()}>
      {play ? <Player.PlayButton /> : null}
      {time ? (
        <>
          <span className={videoPlayerStyles().seek()}>
            <Player.SeekButton direction="backward" seconds={seekTime} />
            <Player.SeekButton direction="forward" seconds={seekTime} />
          </span>
          <Player.Time type="current" />
          <span aria-hidden="true">/</span>
          <Player.Time type="duration" />
        </>
      ) : null}
    </Player.Control>
  )
}

function DefaultControls({
  controlsList,
  seekTime,
}: {
  controlsList: readonly VideoPlayerControls[]
  seekTime: number
}) {
  const styles = videoPlayerStyles()
  const hasPlayControl = controlsList.includes("play")
  const hasTimeControl = controlsList.includes("time")
  const hasVolumeControl = controlsList.includes("volume")
  const hasCaptionsControl = controlsList.includes("captions")
  const hasFullscreenControl = controlsList.includes("fullscreen")
  const hasPlaybackControls = hasPlayControl || hasTimeControl
  const hasSecondaryControls =
    hasVolumeControl || hasFullscreenControl || hasCaptionsControl
  const hasControls = hasPlaybackControls || hasSecondaryControls

  if (!hasControls) {
    return null
  }
  return (
    <Player.Controls className={styles.controls()}>
      <Player.ControlGroup className={styles.layout()} padding="none">
        {hasTimeControl ? (
          <Player.TimeSlider className={styles.timeline()} />
        ) : null}
        <Player.Control className={styles.toolbar()}>
          {hasPlaybackControls ? (
            <PlaybackControls
              play={hasPlayControl}
              seekTime={seekTime}
              time={hasTimeControl}
            />
          ) : null}
          {hasSecondaryControls ? (
            <Player.Control className={styles.trailing()}>
              {hasVolumeControl ? (
                <>
                  <Player.MuteButton />
                  <Player.VolumeSlider className={styles.volumeSlider()} />
                </>
              ) : null}
              {hasCaptionsControl ? <Player.CaptionButton /> : null}
              {hasFullscreenControl ? <Player.FullscreenButton /> : null}
            </Player.Control>
          ) : null}
        </Player.Control>
      </Player.ControlGroup>
    </Player.Controls>
  )
}

export function VideoPlayer({
  src,
  poster,
  playsInline = true,
  seekTime = 10,
  controlsList = DEFAULT_CONTROLS,
  width,
  height,
  className,
  style,
  onVolumeChange,
  tracks,
  slots,
  ...props
}: VideoPlayerProps) {
  const styles = videoPlayerStyles()

  return (
    <Player
      {...props}
      className={styles.root({ className })}
      onVolumeChange={
        onVolumeChange ? (detail) => onVolumeChange(detail.volume) : undefined
      }
      playsInline={playsInline}
      poster={poster}
      src={src}
      style={{ width, height, ...style }}
      viewType="video"
    >
      <Player.Provider tracks={tracks} />
      <Player.Announcer />
      {slots?.loading === null ? null : (
        <Player.Loading>{slots?.loading}</Player.Loading>
      )}
      {slots?.error === null ? null : (
        <Player.Error>{slots?.error}</Player.Error>
      )}
      <Player.Poster />
      <Player.Gestures />
      <Player.Captions />
      {slots?.overlay}
      {slots?.controls === undefined ? (
        <DefaultControls controlsList={controlsList} seekTime={seekTime} />
      ) : (
        slots.controls
      )}
    </Player>
  )
}
