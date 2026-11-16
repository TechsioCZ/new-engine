/**
 * AudioPlayer — @techsio/ui-kit molecule.
 *
 * @component AudioPlayer
 * @componentVersion v1.0.1
 * @skill audio-player-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the audio-player-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { CSSProperties } from "react"
import { Image } from "../atoms/image"
import { tv } from "../utils"
import { Player, type PlayerProps } from "./player"

const audioPlayerStyles = tv({
  slots: {
    root: "border-(length:--border-width-player) flex items-center gap-player-control rounded-player border-player-border bg-player-bg p-player-root",
    cover: "size-player-cover shrink-0 rounded-player object-cover",
    body: "flex min-w-0 flex-1 flex-col gap-player-control",
    title: "truncate font-player-title text-player-fg text-player-title",
    controls: "flex-col items-stretch",
    timeline: "w-full",
    toolbar: "w-full justify-between",
    volumeSlider: "player-responsive-volume",
  },
})

export type AudioInfo = {
  src: string
  title?: string
  cover?: string
}

export type AudioPlayerProps = Pick<
  PlayerProps,
  | "autoPlay"
  | "loop"
  | "muted"
  | "volume"
  | "onPlay"
  | "onPause"
  | "onEnded"
  | "onError"
  | "ref"
> & {
  audioUrl: string | AudioInfo
  skipDuration?: number
  className?: string
  style?: CSSProperties
  onVolumeChange?: (volume: number) => void
}

export function AudioPlayer({
  audioUrl,
  skipDuration = 10,
  className,
  style,
  onVolumeChange,
  ...props
}: AudioPlayerProps) {
  const { src, title, cover } =
    typeof audioUrl === "string" ? { src: audioUrl } : audioUrl
  const styles = audioPlayerStyles()

  return (
    <div className={styles.root({ className })} style={style}>
      {cover ? (
        <Image alt="" className={styles.cover()} size="custom" src={cover} />
      ) : null}
      <div className={styles.body()}>
        {title ? <p className={styles.title()}>{title}</p> : null}
        <Player
          {...props}
          onVolumeChange={
            onVolumeChange
              ? (detail) => onVolumeChange(detail.volume)
              : undefined
          }
          src={src}
          title={title}
          viewType="audio"
        >
          <Player.Provider />
          <Player.Controls>
            <Player.ControlGroup className={styles.controls()} padding="none">
              <Player.Control className={styles.timeline()}>
                <Player.TimeSlider />
                <Player.Time type="current" />
                <span aria-hidden="true">/</span>
                <Player.Time type="duration" />
              </Player.Control>
              <Player.Control className={styles.toolbar()}>
                <Player.Control>
                  <Player.PlayButton />
                  <Player.SeekButton
                    direction="backward"
                    seconds={skipDuration}
                  />
                  <Player.SeekButton
                    direction="forward"
                    seconds={skipDuration}
                  />
                </Player.Control>
                <Player.Control>
                  <Player.MuteButton />
                  <Player.VolumeSlider className={styles.volumeSlider()} />
                </Player.Control>
              </Player.Control>
            </Player.ControlGroup>
          </Player.Controls>
        </Player>
      </div>
    </div>
  )
}
