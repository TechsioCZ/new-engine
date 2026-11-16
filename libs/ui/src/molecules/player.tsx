/**
 * Player — @techsio/ui-kit molecule.
 *
 * @component Player
 * @componentVersion v1.1.1
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
  type TimeSliderInstance,
  type Track,
  useMediaContext,
  useMediaPlayer,
  useMediaState,
  useSliderState,
  VolumeSlider,
} from "@vidstack/react"
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { ActionIcon } from "../atoms/action-icon"
import { Button } from "../atoms/button"
import { Icon, type IconType } from "../atoms/icon"
import { Tooltip } from "../atoms/tooltip"
import { useComposedRefs } from "../internal/molecules/drawer.context"
import { OverlayContainerProvider } from "../internal/overlay-portal"
import { formatPlayerTime } from "../internal/player-time"
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
export type PlayerControlsProps = ComponentProps<typeof MediaControls.Root> & {
  /** Reserve the toolbar's measured height above a bottom video overlay. */
  reserveCaptionSpace?: boolean
}
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
  children,
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
      >
        <PlayerOverlays>{children}</PlayerOverlays>
      </MediaPlayer>
    </PlayerContext.Provider>
  )
}

function PlayerOverlays({ children }: { children: ReactNode }) {
  const player = useMediaPlayer()
  const fullscreen = useMediaState("fullscreen")
  return (
    <OverlayContainerProvider
      container={fullscreen ? (player?.el ?? null) : null}
      modal={false}
    >
      {children}
    </OverlayContainerProvider>
  )
}

function createTrackSelection(
  media: NonNullable<ReturnType<typeof useMediaContext>>
) {
  const registered = new Set<TextTrack>()
  const selection = {
    definitions: [] as readonly PlayerTextTrack[],
    enabled: null as boolean | null,
    language: null as string | null,
    selected: null as TextTrack | null,
    ready: false,
    changing: false,
    revision: 0,
    select() {
      if (!selection.ready || selection.enabled === false) {
        return
      }
      const current = media.textTracks.selected
      if (current && !registered.has(current)) {
        return
      }
      const candidates = selection.definitions.filter(
        (track) => track.kind === "captions" || track.kind === "subtitles"
      )
      const desired =
        candidates.find(
          (track) =>
            selection.language &&
            (track.language ?? track.lang) === selection.language
        ) ??
        candidates.find((track) => track.default) ??
        (selection.enabled ? candidates[0] : undefined)
      // Wait for the declared preferred/default track, regardless of parse order.
      const nextTrack = [...registered].find((item) => item.id === desired?.id)
      if (!nextTrack || nextTrack === current) {
        return
      }
      selection.changing = true
      nextTrack.mode = "showing"
      selection.changing = false
      selection.selected = nextTrack
      selection.enabled = true
      selection.language = nextTrack.language
    },
    add(track: TextTrack) {
      registered.add(track)
      media.textTracks.add(track)
      selection.select()
    },
    remove(track: TextTrack) {
      selection.changing = true
      media.textTracks.remove(track)
      selection.changing = false
      registered.delete(track)
      if (selection.selected === track) {
        selection.selected = null
      }
    },
    modeChanged(track: TextTrack) {
      if (selection.changing || !isTrackCaptionKind(track)) {
        return
      }
      if (track.mode === "showing") {
        selection.enabled = true
        selection.language = track.language
        selection.selected = track
      } else if (selection.selected === track) {
        selection.enabled = false
        selection.selected = null
      } else {
        return
      }
      selection.revision += 1
    },
  }
  return selection
}

const TrackSelectionContext = createContext<ReturnType<
  typeof createTrackSelection
> | null>(null)

function PlayerTrack({
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
  const selection = useContext(TrackSelectionContext)
  const attachedTrack = useRef<TextTrack | null>(null)
  useEffect(
    () => () => {
      if (attachedTrack.current && selection) {
        selection.remove(attachedTrack.current)
        attachedTrack.current = null
      }
    },
    [selection]
  )
  useEffect(() => {
    if (!(player && selection)) {
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
      // Caption defaults are selected by the provider. Vidstack 1.15 cannot
      // remove subtitle defaults reliably from its internal default registry.
      default: kind === "captions" || kind === "subtitles" ? false : isDefault,
      language: language ?? lang,
      encoding,
    })
    let attached = false
    const attach = () => {
      if (attached || (content && track.readyState !== 2)) {
        return
      }
      attached = true
      const previousTrack = attachedTrack.current
      if (previousTrack) {
        selection.remove(previousTrack)
      }
      selection.add(track)
      attachedTrack.current = track
    }
    track.addEventListener("load", attach)
    if (!content || track.readyState === 2) {
      attach()
    }
    return () => {
      track.removeEventListener("load", attach)
    }
  }, [
    player,
    selection,
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
  const media = useMediaContext()
  const canLoad = useMediaState("canLoad")
  const selection = useMemo(
    () => (media ? createTrackSelection(media) : null),
    [media]
  )
  useEffect(() => {
    if (!(media && selection)) {
      return
    }
    const onModeChange = (event: { detail: TextTrack }) => {
      selection.modeChanged(event.detail)
    }
    media.textTracks.addEventListener("mode-change", onModeChange)
    return () => {
      media.textTracks.removeEventListener("mode-change", onModeChange)
    }
  }, [media, selection])
  useEffect(() => {
    if (!selection) {
      return
    }
    selection.definitions = tracks ?? []
    selection.select()
  }, [selection, tracks])
  useEffect(() => {
    if (!(media && selection && canLoad)) {
      return
    }
    let cancelled = false
    const revision = selection.revision
    Promise.allSettled([
      media.storage?.getCaptions(),
      media.storage?.getLang(),
    ]).then(([enabled, language]) => {
      if (cancelled) {
        return
      }
      if (selection.revision === revision) {
        selection.enabled =
          (enabled.status === "fulfilled" ? enabled.value : null) ??
          selection.enabled
        selection.language =
          (language.status === "fulfilled" ? language.value : null) ??
          selection.language
      }
      selection.ready = true
      selection.select()
    })
    return () => {
      cancelled = true
    }
  }, [canLoad, media, selection])
  return (
    <MediaProvider {...props}>
      <TrackSelectionContext.Provider value={selection}>
        {tracks?.map((track) => (
          <PlayerTrack {...track} key={track.id} />
        ))}
      </TrackSelectionContext.Provider>
      {children}
    </MediaProvider>
  )
}

Player.Controls = function PlayerControls({
  className,
  ref,
  reserveCaptionSpace = false,
  ...props
}: PlayerControlsProps) {
  usePlayerContext()
  const player = useMediaPlayer()
  const [element, setElement] = useState<HTMLElement | null>(null)
  const controlsRef = useComposedRefs(ref, setElement)
  useEffect(() => {
    const root = player?.el
    if (!(reserveCaptionSpace && element && root)) {
      return
    }
    const update = () => {
      root.style.setProperty(
        "--player-controls-height",
        `${element.offsetHeight}px`
      )
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => {
      observer.disconnect()
      root.style.removeProperty("--player-controls-height")
    }
  }, [element, player, reserveCaptionSpace])
  return (
    <MediaControls.Root
      {...props}
      className={playerStyles().controls({ className })}
      ref={controlsRef}
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
  ref,
  "aria-label": ariaLabel,
  "aria-valuetext": ariaValueText,
  ...props
}: PlayerTimeSliderProps) {
  usePlayerContext()
  const styles = playerStyles()
  const { player: messages, locale } = useUiMessages()
  const duration = useMediaState("duration")
  const [slider, setSlider] = useState<TimeSliderInstance | null>(null)
  const sliderRef = useMemo(() => ({ current: slider }), [slider])
  const composedRef = useComposedRefs(ref, setSlider)
  const value = useSliderState("value", sliderRef)
  const time = (value / 100) * duration
  const valueText = Number.isFinite(time)
    ? messages.timeValueText({
        currentTime: formatPlayerTime(time, locale),
        duration: formatPlayerTime(duration, locale),
      })
    : messages.live
  // biome-ignore lint/correctness/useExhaustiveDependencies: Reapply after every SDK value write, even when formatted whole seconds stay equal.
  useEffect(() => {
    slider?.el?.setAttribute("aria-valuetext", ariaValueText ?? valueText)
  }, [slider, value, valueText, ariaValueText])
  return (
    <TimeSlider.Root
      {...props}
      aria-label={ariaLabel ?? messages.seek}
      aria-valuetext={ariaValueText ?? valueText}
      className={styles.timeSlider({ className })}
      ref={composedRef}
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
  const hasCaptions = useMediaState("hasCaptions")
  return (
    <MediaCaptions
      {...props}
      className={playerStyles().captions({ className })}
      data-available={hasCaptions ? "" : undefined}
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

Player.Announcer = function PlayerAnnouncer({
  ref,
  onChange,
  translations,
  ...props
}: ComponentProps<typeof MediaAnnouncer>) {
  usePlayerContext()
  const { player: messages, locale } = useUiMessages()
  const player = useMediaPlayer()
  const [element, setElement] = useState<HTMLElement | null>(null)
  const composedRef = useComposedRefs(ref, setElement)
  const forward =
    translations?.["Seek Forward"] ?? messages.seekForwardAnnouncement
  const backward =
    translations?.["Seek Backward"] ?? messages.seekBackwardAnnouncement
  return (
    <MediaAnnouncer
      {...props}
      onChange={(detail, event) => {
        // The SDK's seek announcement appends fixed English duration units.
        const direction = [forward, backward].find(
          (prefix) => prefix && detail.startsWith(`${prefix} `)
        )
        if (direction && element && player) {
          const { currentTime, duration } = player.state
          const position = Number.isFinite(duration)
            ? messages.timeValueText({
                currentTime: formatPlayerTime(currentTime, locale),
                duration: formatPlayerTime(duration, locale),
              })
            : messages.live
          element.setAttribute("aria-label", `${direction}: ${position}`)
        }
        onChange?.(detail, event)
      }}
      ref={composedRef}
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
        ...translations,
      }}
    />
  )
}

Player.Root = Player
Player.displayName = "Player"
