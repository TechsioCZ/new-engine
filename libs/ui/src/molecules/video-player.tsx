/**
 * VideoPlayer — @techsio/ui-kit molecule.
 *
 * @component VideoPlayer
 * @componentVersion v1.0.0
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
    toolbar: "w-full justify-between",
    leading: "shrink-0",
    trailing: "shrink-0",
    timeline: "w-full",
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
      style={{ width, height, ...style }}
      src={src}
      poster={poster}
      viewType="video"
      onVolumeChange={
        onVolumeChange ? (detail) => onVolumeChange(detail.volume) : undefined
      }
    >
      <Player.Provider />
      <Player.Poster />
      {hasControls ? (
        <Player.Controls className={styles.controls()}>
          <Player.ControlGroup
            className={styles.layout()}
            padding="none"
          >
            {hasTimeControl ? (
              <Player.TimeSlider className={styles.timeline()} />
            ) : null}
            {hasPlaybackControls || hasSecondaryControls ? (
              <Player.Control className={styles.toolbar()}>
                {hasPlaybackControls ? (
                  <Player.Control className={styles.leading()}>
                    {hasPlayControl ? <Player.PlayButton /> : null}
                    {hasTimeControl ? (
                      <>
                        <Player.SeekButton
                          direction="backward"
                          seconds={seekTime}
                        />
                        <Player.SeekButton
                          direction="forward"
                          seconds={seekTime}
                        />
                        <Player.Time type="current" />
                        <span aria-hidden="true">/</span>
                        <Player.Time type="duration" />
                      </>
                    ) : null}
                  </Player.Control>
                ) : null}
                {hasSecondaryControls ? (
                  <Player.Control className={styles.trailing()}>
                    {hasVolumeControl ? (
                      <>
                        <Player.MuteButton />
                        <Player.VolumeSlider
                          className={styles.volumeSlider()}
                        />
                      </>
                    ) : null}
                    {hasFullscreenControl ? <Player.FullscreenButton /> : null}
                  </Player.Control>
                ) : null}
              </Player.Control>
            ) : null}
          </Player.ControlGroup>
        </Player.Controls>
      ) : null}
    </Player>
  )
}
