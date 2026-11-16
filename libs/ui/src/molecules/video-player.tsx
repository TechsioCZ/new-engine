/**
 * VideoPlayer — @techsio/ui-kit molecule.
 *
 * @component VideoPlayer
 * @componentVersion v1.0.1
 * @skill video-player-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the video-player-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { CSSProperties } from "react"
import { tv } from "../utils"
import { Player, type PlayerProps } from "./player"

const videoPlayerStyles = tv({
  slots: {
    root: "aspect-video w-full bg-player-video-bg",
    controls:
      "player-overlay player-video-controls absolute inset-x-0 bottom-0 z-player-controls transition-opacity duration-200",
    layout:
      "flex-col items-stretch gap-player-video-control p-player-video-control",
    toolbar: "w-full flex-wrap justify-between",
    leading: "min-w-0 flex-wrap",
    trailing: "ms-auto shrink-0",
    timeline: "player-video-timeline flex-none self-stretch",
    volumeSlider: "player-responsive-volume",
  },
})

export type VideoPlayerControls = "play" | "time" | "volume" | "fullscreen"

export type VideoPlayerProps = Pick<
  PlayerProps,
  | "autoPlay"
  | "loop"
  | "muted"
  | "volume"
  | "onPlay"
  | "onPause"
  | "onEnded"
  | "onError"
  | "title"
  | "ref"
> & {
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
          <Player.SeekButton direction="backward" seconds={seekTime} />
          <Player.SeekButton direction="forward" seconds={seekTime} />
          <Player.Time type="current" />
          <span aria-hidden="true">/</span>
          <Player.Time type="duration" />
        </>
      ) : null}
    </Player.Control>
  )
}

export function VideoPlayer({
  src,
  poster,
  seekTime = 10,
  controlsList = DEFAULT_CONTROLS,
  width,
  height,
  className,
  style,
  onVolumeChange,
  ...props
}: VideoPlayerProps) {
  const styles = videoPlayerStyles()
  const hasPlayControl = controlsList.includes("play")
  const hasTimeControl = controlsList.includes("time")
  const hasVolumeControl = controlsList.includes("volume")
  const hasFullscreenControl = controlsList.includes("fullscreen")
  const hasPlaybackControls = hasPlayControl || hasTimeControl
  const hasSecondaryControls = hasVolumeControl || hasFullscreenControl
  const hasControls = hasPlaybackControls || hasSecondaryControls

  return (
    <Player
      {...props}
      className={styles.root({ className })}
      onVolumeChange={
        onVolumeChange ? (detail) => onVolumeChange(detail.volume) : undefined
      }
      poster={poster}
      src={src}
      style={{ width, height, ...style }}
      viewType="video"
    >
      <Player.Provider />
      <Player.Poster />
      {hasControls ? (
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
                  {hasFullscreenControl ? <Player.FullscreenButton /> : null}
                </Player.Control>
              ) : null}
            </Player.Control>
          </Player.ControlGroup>
        </Player.Controls>
      ) : null}
    </Player>
  )
}
