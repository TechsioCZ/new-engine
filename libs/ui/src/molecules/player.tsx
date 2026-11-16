/**
 * Player — @techsio/ui-kit molecule.
 *
 * @component Player
 * @componentVersion v1.1.0
 * @skill player-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the player-usage skill's component_version and a changelog entry. Bump all three together.
 */
import {
  Gesture,
  isTrackCaptionKind,
  MediaAnnouncer,
  CaptionButton as MediaCaptionButton,
  Captions as MediaCaptions,
  Controls as MediaControls,
  type MediaErrorDetail,
  FullscreenButton as MediaFullscreenButton,
  MuteButton as MediaMuteButton,
  PlayButton as MediaPlayButton,
  MediaPlayer,
  MediaProvider,
  SeekButton as MediaSeekButton,
  Poster,
  TextTrack,
  Time,
  TimeSlider,
  Track,
  useMediaPlayer,
  useMediaState,
  VolumeSlider,
} from "@vidstack/react"
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { ActionIcon } from "../atoms/action-icon"
import { Button } from "../atoms/button"
import { Icon, type IconType } from "../atoms/icon"
import { Tooltip } from "../atoms/tooltip"
import { useUiMessages } from "../messages/ui-messages-provider"
import { tv } from "../utils"

const playerStyles = tv({
  slots: {
    root: "player-base player-focus-ring relative overflow-hidden rounded-player text-player-fg",
    poster: "vds-poster",
    feedback:
      "player-feedback absolute inset-0 z-player-feedback flex flex-col items-center justify-center gap-player-feedback p-player-feedback text-center text-player-feedback",
    loadingIcon: "text-player-loading-icon",
    captions:
      "vds-captions player-captions pointer-events-none absolute inset-0 z-player-captions",
    gesture: "player-gesture absolute inset-0",
    controls: "player-controls w-full",
    control: "flex min-w-0 items-center gap-player-control",
    controlGroup: "flex w-full min-w-0 items-center gap-player-control",
    iconButton:
      "bg-player-control-bg text-player-control-fg not-disabled:hover:bg-player-control-bg-hover focus-visible:outline-player-focus-ring not-disabled:active:bg-player-control-bg-active aria-hidden:hidden",
    timeSlider: "vds-time-slider vds-slider min-w-0 flex-1",
    volumeSlider: "vds-volume-slider vds-slider player-volume-slider shrink-0",
    track: "vds-slider-track",
    trackFill: "vds-slider-track vds-slider-track-fill",
    progress: "vds-slider-track vds-slider-progress",
    thumb: "vds-slider-thumb",
    time: "shrink-0 font-player-time text-player-time tabular-nums",
  },
  variants: {
    padding: {
      default: { controlGroup: "p-player-control" },
      none: { controlGroup: "p-0" },
    },
  },
  defaultVariants: {
    padding: "default",
  },
})

const PlayerContext = createContext<{ retry: () => void } | null>(null)

function usePlayerContext() {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error("Player components must be used within Player.Root")
  }
  return context
}

export type PlayerTextTrack = ComponentProps<typeof Track> & { id: string }
export type PlayerErrorContentProps = {
  error: MediaErrorDetail
  retry: () => void
}
export type PlayerPresetSlots = {
  loading?: ReactNode
  error?: ReactNode | ((props: PlayerErrorContentProps) => ReactNode)
  controls?: ReactNode
  overlay?: ReactNode
}
export type PlayerProps = ComponentProps<typeof MediaPlayer>
export type PlayerControlsProps = ComponentProps<typeof MediaControls.Root>
export type PlayerControlProps = ComponentProps<"div">
export type PlayerControlGroupProps = ComponentProps<
  typeof MediaControls.Group
> & {
  padding?: "default" | "none"
}
export type PlayerPlayButtonProps = Omit<
  ComponentProps<typeof MediaPlayButton>,
  "asChild" | "children"
> & {
  icon?: IconType
  pauseIcon?: IconType
}
export type PlayerMuteButtonProps = Omit<
  ComponentProps<typeof MediaMuteButton>,
  "asChild" | "children"
> & {
  icon?: IconType
  mutedIcon?: IconType
  lowVolumeIcon?: IconType
}
export type PlayerFullscreenButtonProps = Omit<
  ComponentProps<typeof MediaFullscreenButton>,
  "asChild" | "children"
> & {
  icon?: IconType
  exitIcon?: IconType
}
export type PlayerSeekButtonProps = Omit<
  ComponentProps<typeof MediaSeekButton>,
  "asChild" | "children" | "seconds"
> & {
  direction: "forward" | "backward"
  seconds?: number
}
export type PlayerTimeSliderProps = Omit<
  ComponentProps<typeof TimeSlider.Root>,
  "asChild" | "children" | "orientation"
>
export type PlayerVolumeSliderProps = Omit<
  ComponentProps<typeof VolumeSlider.Root>,
  "asChild" | "children" | "orientation"
>

export function Player({
  className,
  "aria-label": ariaLabel,
  ariaLabel: mediaLabel,
  ...props
}: PlayerProps) {
  const messages = useUiMessages().player
  const [attempt, setAttempt] = useState(0)
  const context = useMemo(
    () => ({ retry: () => setAttempt((value) => value + 1) }),
    []
  )
  const label = ariaLabel ?? mediaLabel ?? props.title ?? messages.label
  return (
    <PlayerContext.Provider value={context}>
      <MediaPlayer
        {...props}
        aria-label={label}
        ariaLabel={label}
        className={playerStyles().root({ className })}
        key={attempt}
      />
    </PlayerContext.Provider>
  )
}

function InlineTextTrack({
  id,
  src,
  content,
  type,
  kind,
  label,
  default: isDefault,
  language,
  lang,
  encoding,
}: PlayerTextTrack) {
  const player = useMediaPlayer()
  useEffect(() => {
    if (!player) {
      return
    }
    // Vidstack 1.15 marks an attached inline track ready before its async parse
    // finishes. Register it after parsing so renderers receive populated cues.
    const track = new TextTrack({
      id,
      src,
      content,
      type,
      kind,
      label,
      default: isDefault,
      language: language ?? lang,
      encoding,
    })
    let attached = false
    const attach = () => {
      if (attached || track.readyState !== 2) {
        return
      }
      attached = true
      player.textTracks.add(track)
    }
    track.addEventListener("load", attach)
    if (track.readyState === 2) {
      attach()
    }
    return () => {
      track.removeEventListener("load", attach)
      if (attached) {
        player.textTracks.remove(track)
      }
    }
  }, [
    player,
    id,
    src,
    content,
    type,
    kind,
    label,
    isDefault,
    language,
    lang,
    encoding,
  ])
  return null
}

Player.Provider = function PlayerProvider({
  tracks,
  children,
  ...props
}: ComponentProps<typeof MediaProvider> & {
  tracks?: readonly PlayerTextTrack[]
}) {
  usePlayerContext()
  return (
    <MediaProvider {...props}>
      {tracks?.map((track) =>
        track.content ? (
          <InlineTextTrack {...track} key={track.id} />
        ) : (
          <Track {...track} key={track.id} />
        )
      )}
      {children}
    </MediaProvider>
  )
}

Player.Controls = function PlayerControls({
  className,
  ...props
}: PlayerControlsProps) {
  usePlayerContext()
  return (
    <MediaControls.Root
      {...props}
      className={playerStyles().controls({ className })}
    />
  )
}

Player.Poster = function PlayerPoster({
  alt = "",
  className,
  "aria-hidden": ariaHidden,
  ...props
}: ComponentProps<typeof Poster>) {
  usePlayerContext()
  return (
    <Poster
      {...props}
      alt={alt}
      aria-hidden={ariaHidden ?? (alt === "" ? true : undefined)}
      className={playerStyles().poster({ className })}
    />
  )
}

Player.PlayButton = function PlayerPlayButton({
  icon = "token-icon-player-play",
  pauseIcon = "token-icon-player-pause",
  className,
  "aria-label": ariaLabel,
  ...props
}: PlayerPlayButtonProps) {
  usePlayerContext()
  const paused = useMediaState("paused")
  const messages = useUiMessages().player
  const label = ariaLabel ?? (paused ? messages.play : messages.pause)
  return (
    <Tooltip content={label}>
      <MediaPlayButton
        {...props}
        aria-label={label}
        asChild
        className={playerStyles().iconButton({ className })}
      >
        <ActionIcon
          aria-label={label}
          icon={paused ? icon : pauseIcon}
          size="lg"
          type="button"
        />
      </MediaPlayButton>
    </Tooltip>
  )
}

Player.MuteButton = function PlayerMuteButton({
  icon = "token-icon-player-volume-high",
  mutedIcon = "token-icon-player-mute",
  lowVolumeIcon = "token-icon-player-volume-low",
  className,
  "aria-label": ariaLabel,
  ...props
}: PlayerMuteButtonProps) {
  usePlayerContext()
  const muted = useMediaState("muted")
  const volume = useMediaState("volume")
  const messages = useUiMessages().player
  const label =
    ariaLabel ?? (muted || volume === 0 ? messages.unmute : messages.mute)
  const volumeIcon = volume >= 0.5 ? icon : lowVolumeIcon
  const resolvedIcon = muted || volume === 0 ? mutedIcon : volumeIcon
  return (
    <Tooltip content={label}>
      <MediaMuteButton
        {...props}
        aria-label={label}
        asChild
        className={playerStyles().iconButton({ className })}
      >
        <ActionIcon
          aria-label={label}
          icon={resolvedIcon}
          size="lg"
          type="button"
        />
      </MediaMuteButton>
    </Tooltip>
  )
}

Player.TimeSlider = function PlayerTimeSlider({
  className,
  "aria-label": ariaLabel,
  ...props
}: PlayerTimeSliderProps) {
  usePlayerContext()
  const styles = playerStyles()
  const messages = useUiMessages().player
  return (
    <TimeSlider.Root
      {...props}
      aria-label={ariaLabel ?? messages.seek}
      className={styles.timeSlider({ className })}
    >
      <TimeSlider.Track className={styles.track()}>
        <TimeSlider.TrackFill className={styles.trackFill()} />
        <TimeSlider.Progress className={styles.progress()} />
      </TimeSlider.Track>
      <TimeSlider.Thumb className={styles.thumb()} />
    </TimeSlider.Root>
  )
}

Player.VolumeSlider = function PlayerVolumeSlider({
  className,
  "aria-label": ariaLabel,
  ...props
}: PlayerVolumeSliderProps) {
  usePlayerContext()
  const styles = playerStyles()
  const messages = useUiMessages().player
  return (
    <VolumeSlider.Root
      {...props}
      aria-label={ariaLabel ?? messages.volume}
      className={styles.volumeSlider({ className })}
    >
      <VolumeSlider.Track className={styles.track()}>
        <VolumeSlider.TrackFill className={styles.trackFill()} />
      </VolumeSlider.Track>
      <VolumeSlider.Thumb className={styles.thumb()} />
    </VolumeSlider.Root>
  )
}

Player.Time = function PlayerTime({
  className,
  ...props
}: ComponentProps<typeof Time>) {
  usePlayerContext()
  return <Time {...props} className={playerStyles().time({ className })} />
}

Player.FullscreenButton = function PlayerFullscreenButton({
  icon = "token-icon-player-fullscreen",
  exitIcon = "token-icon-player-fullscreen-exit",
  className,
  "aria-label": ariaLabel,
  ...props
}: PlayerFullscreenButtonProps) {
  usePlayerContext()
  const fullscreen = useMediaState("fullscreen")
  const messages = useUiMessages().player
  const label =
    ariaLabel ??
    (fullscreen ? messages.exitFullscreen : messages.enterFullscreen)
  return (
    <Tooltip content={label}>
      <MediaFullscreenButton
        {...props}
        aria-label={label}
        asChild
        className={playerStyles().iconButton({ className })}
      >
        <ActionIcon
          aria-label={label}
          icon={fullscreen ? exitIcon : icon}
          size="lg"
          type="button"
        />
      </MediaFullscreenButton>
    </Tooltip>
  )
}

Player.SeekButton = function PlayerSeekButton({
  direction,
  seconds = 10,
  className,
  "aria-label": ariaLabel,
  ...props
}: PlayerSeekButtonProps) {
  usePlayerContext()
  const messages = useUiMessages().player
  const label =
    ariaLabel ??
    (direction === "forward"
      ? messages.seekForward(seconds)
      : messages.seekBackward(seconds))
  return (
    <Tooltip content={label}>
      <MediaSeekButton
        {...props}
        aria-label={label}
        asChild
        className={playerStyles().iconButton({ className })}
        seconds={direction === "forward" ? seconds : -seconds}
      >
        <ActionIcon
          aria-label={label}
          icon={
            direction === "forward"
              ? "token-icon-player-seek-forward"
              : "token-icon-player-seek-backward"
          }
          size="lg"
          type="button"
        />
      </MediaSeekButton>
    </Tooltip>
  )
}

Player.Control = function PlayerControl({
  className,
  ...props
}: PlayerControlProps) {
  usePlayerContext()
  return <div {...props} className={playerStyles().control({ className })} />
}

Player.ControlGroup = function PlayerControlGroup({
  className,
  padding = "default",
  ...props
}: PlayerControlGroupProps) {
  usePlayerContext()
  return (
    <MediaControls.Group
      {...props}
      className={playerStyles({ padding }).controlGroup({ className })}
    />
  )
}

Player.Loading = function PlayerLoading({
  children,
  className,
  ...props
}: ComponentProps<"div">) {
  usePlayerContext()
  const canLoad = useMediaState("canLoad")
  const canPlay = useMediaState("canPlay")
  const waiting = useMediaState("waiting")
  const preload = useMediaState("preload")
  const error = useMediaState("error")
  const messages = useUiMessages().player
  if (!canLoad || (!waiting && (canPlay || preload === "none")) || error) {
    return null
  }
  return (
    <div
      {...props}
      className={playerStyles().feedback({ className })}
      role="status"
    >
      {children ?? (
        <>
          <Icon
            className={playerStyles().loadingIcon()}
            icon="token-icon-loading"
            size="current"
          />
          <span>{messages.loading}</span>
        </>
      )}
    </div>
  )
}

Player.Error = function PlayerError({
  children,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children"> & {
  children?: PlayerPresetSlots["error"]
}) {
  const { retry } = usePlayerContext()
  const error = useMediaState("error")
  const messages = useUiMessages().player
  const player = useMediaPlayer()
  useEffect(() => {
    // A failed source cannot reach can-play, where Vidstack normally clears busy.
    if (error) {
      player?.el?.setAttribute("aria-busy", "false")
    }
  }, [error, player])
  if (!error) {
    return null
  }
  return (
    <div
      {...props}
      className={playerStyles().feedback({ className })}
      role="alert"
    >
      {typeof children === "function"
        ? children({ error, retry })
        : (children ?? (
            <>
              <span>{messages.error}</span>
              <Button onClick={retry} type="button">
                {messages.retry}
              </Button>
            </>
          ))}
    </div>
  )
}

Player.Captions = function PlayerCaptions({
  className,
  ...props
}: ComponentProps<typeof MediaCaptions>) {
  usePlayerContext()
  return (
    <MediaCaptions
      {...props}
      className={playerStyles().captions({ className })}
    />
  )
}

Player.CaptionButton = function PlayerCaptionButton({
  className,
  "aria-label": ariaLabel,
  ...props
}: Omit<ComponentProps<typeof MediaCaptionButton>, "asChild" | "children">) {
  usePlayerContext()
  const hasCaptions = useMediaState("hasCaptions")
  const textTrack = useMediaState("textTrack")
  const messages = useUiMessages().player
  if (!hasCaptions) {
    return null
  }
  const captionsOn = textTrack !== null && isTrackCaptionKind(textTrack)
  const label =
    ariaLabel ??
    (captionsOn ? messages.disableCaptions : messages.enableCaptions)
  return (
    <Tooltip content={label}>
      <MediaCaptionButton
        {...props}
        aria-label={label}
        asChild
        className={playerStyles().iconButton({ className })}
      >
        <ActionIcon
          aria-label={label}
          icon={
            captionsOn
              ? "token-icon-player-captions"
              : "token-icon-player-captions-off"
          }
          size="lg"
          type="button"
        />
      </MediaCaptionButton>
    </Tooltip>
  )
}

Player.Gestures = function PlayerGestures() {
  usePlayerContext()
  return (
    <Gesture
      action="toggle:paused"
      className={playerStyles().gesture()}
      event="pointerup"
    />
  )
}

Player.Announcer = function PlayerAnnouncer(
  props: ComponentProps<typeof MediaAnnouncer>
) {
  usePlayerContext()
  const messages = useUiMessages().player
  return (
    <MediaAnnouncer
      {...props}
      translations={{
        Play: messages.play,
        Pause: messages.pause,
        Mute: messages.mute,
        Volume: messages.volume,
        "Enter Fullscreen": messages.enterFullscreen,
        "Exit Fullscreen": messages.exitFullscreen,
        "Seek Forward": messages.seekForwardAnnouncement,
        "Seek Backward": messages.seekBackwardAnnouncement,
        "Enter PiP": messages.enterPictureInPicture,
        "Exit PiP": messages.exitPictureInPicture,
        "Closed-Captions On": messages.enableCaptions,
        "Closed-Captions Off": messages.disableCaptions,
        ...props.translations,
      }}
    />
  )
}

Player.Root = Player
Player.displayName = "Player"
