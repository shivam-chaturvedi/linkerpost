import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX, Gauge } from "lucide-react";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ProductDemoVideo({
  src,
  title,
  caption,
}: {
  src: string;
  title: string;
  caption: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wantHoverPlay = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [showSpeed, setShowSpeed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.muted = muted;
      await video.play();
    } catch {
      // Hover play can fail until a direct click unlocks media.
    }
  }, [muted]);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    const markReady = () => {
      if (cancelled) return;
      setReady(true);
      setError("");
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
      if (wantHoverPlay.current) {
        void video.play().catch(() => undefined);
      }
    };

    const onTime = () => setCurrent(video.currentTime || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => {
      if (cancelled) return;
      const code = video.error?.code;
      const detail =
        code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
          ? "This browser could not decode the demo video."
          : "The demo could not load. Check your connection, then refresh.";
      setError(detail);
      setReady(false);
    };

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    video.addEventListener("loadedmetadata", markReady);
    video.addEventListener("loadeddata", markReady);
    video.addEventListener("canplay", markReady);
    video.addEventListener("canplaythrough", markReady);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("error", onError);
    video.load();

    return () => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", markReady);
      video.removeEventListener("loadeddata", markReady);
      video.removeEventListener("canplay", markReady);
      video.removeEventListener("canplaythrough", markReady);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("error", onError);
    };
  }, [src, reloadKey]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.playbackRate = speed;
  }, [speed]);

  const togglePlay = () => {
    if (playing) pause();
    else void play();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !muted;
    video.muted = next;
    setMuted(next);
  };

  return (
    <figure className="relative mx-auto max-w-5xl text-left">
      <div className="overflow-hidden rounded-[24px] border bg-card shadow-soft-lg ring-1 ring-black/5">
        <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="ml-2 text-xs font-medium text-muted-foreground">{title}</span>
        </div>

        <div
          className="group relative aspect-video w-full bg-ink"
          onMouseEnter={() => {
            wantHoverPlay.current = true;
            void play();
          }}
          onMouseLeave={() => {
            wantHoverPlay.current = false;
            pause();
          }}
        >
          <video
            key={`${src}-${reloadKey}`}
            ref={videoRef}
            className="h-full w-full object-contain md:object-cover"
            src={src}
            playsInline
            preload="auto"
            muted={muted}
            controls={false}
            disablePictureInPicture
            title="Linker Post AI app demo: research trends, draft posts, and schedule LinkedIn content"
            aria-label="Demo video of the Linker Post AI LinkedIn content planner and scheduler"
          />

          {!ready && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/80 text-sm text-white/80">
              Loading demo…
            </div>
          )}
          {error && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-ink/90 px-6 text-center text-sm text-white/90">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setReady(false);
                  setReloadKey((k) => k + 1);
                }}
                className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink"
              >
                Retry video
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="absolute left-1/2 top-1/2 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-950 shadow-lg transition opacity-100 md:opacity-0 md:group-hover:opacity-100"
            aria-label={playing ? "Pause demo" : "Play demo"}
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>

          <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-3 pb-3 pt-10 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.05}
              value={Math.min(current, duration || 0)}
              onChange={(e) => {
                const video = videoRef.current;
                if (!video) return;
                const next = Number(e.target.value);
                video.currentTime = next;
                setCurrent(next);
              }}
              className="mb-2 h-1.5 w-full cursor-pointer accent-primary"
              aria-label="Seek demo video"
            />
            <div className="flex flex-wrap items-center gap-2 text-white">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <span className="text-xs tabular-nums text-white/85">
                {formatTime(current)} / {formatTime(duration)}
              </span>
              <div className="relative ml-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSpeed((v) => !v);
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/15 px-3 text-xs font-medium hover:bg-white/25"
                  aria-label="Playback speed"
                >
                  <Gauge className="h-3.5 w-3.5" />
                  {speed}x
                </button>
                {showSpeed && (
                  <div className="absolute bottom-11 right-0 z-30 min-w-[104px] overflow-hidden rounded-xl border border-white/25 bg-neutral-950 py-1.5 shadow-xl">
                    {SPEEDS.map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSpeed(rate);
                          setShowSpeed(false);
                        }}
                        className={`block w-full px-3.5 py-2 text-left text-xs font-medium transition-colors hover:bg-white/10 ${
                          speed === rate ? "bg-white/10 text-sky-300" : "text-white"
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-sm text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}
