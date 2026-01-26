"use client";

import { useState } from "react";

type DownloadOption = {
  label: string;
  resolution: string;
  ext: string;
  format_id: string;
  fps?: number;
  filesize?: number;
};

function getHeight(resolution?: string): number {
  if (!resolution) return 0;
  const parts = resolution.split("x");
  return parts.length === 2 ? parseInt(parts[1]) : 0;
}

function ResolutionBadge({ height }: { height: number }) {
  let label = "SD";
  let glow = "";

  if (height >= 2160)
    return (
      <span
        className="
    glow-4k
    px-3 py-1
    text-xs font-bold tracking-wide
    rounded-md
    text-black
    border border-yellow-300
  "
      >
        4K
      </span>
    );
  else if (height >= 1440) label = "2K";
  else if (height >= 1080) label = "1080p";
  else if (height >= 720) label = "720p";

  return (
    <span
      className={`
        px-3 py-1 text-xs font-bold tracking-wide
        rounded-md
        bg-linear-to-b from-yellow-300 to-yellow-500
        text-black
        border border-yellow-400
        ${glow}
      `}
    >
      {label}
    </span>
  );
}

function groupByExt(options: DownloadOption[]) {
  return options.reduce((acc: Record<string, DownloadOption[]>, opt) => {
    if (!acc[opt.ext]) acc[opt.ext] = [];
    acc[opt.ext].push(opt);
    return acc;
  }, {});
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [video, setVideo] = useState<any>(null);
  const [selectedFormat, setSelectedFormat] = useState<DownloadOption | null>(
    null,
  );
  const [progress, setProgress] = useState<number | null>(null);

  async function extract() {
    if (!url || loading) return;

    setLoading(true);
    setVideo(null);
    setSelectedFormat(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      // sort formats by resolution DESC
      data.download_options.sort(
        (a: DownloadOption, b: DownloadOption) =>
          getHeight(b.resolution) - getHeight(a.resolution),
      );

      setVideo(data);
    } catch {
      alert("Failed to extract video");
    } finally {
      setLoading(false);
    }
  }
  function renderFormat(opt: DownloadOption, idx: number) {
    const height = getHeight(opt.resolution);
    const isBest = idx === 0;

    return (
      <div
        key={opt.format_id}
        className={`flex items-center justify-between p-4 rounded-xl
                    min-h-24
                    bg-white/10 backdrop-blur-xl
                    border border-white/20
                    shadow-lg
                    transition-all duration-200
                    hover:bg-white/20 hover:border-white/30 hover:shadow-[0_0_20px_rgba(0,255,128,0.2)]
                    ${isBest ? "ring-1 ring-indigo-400/80" : ""}
                  `}
      >
        <div className="flex items-center gap-3">
          <ResolutionBadge height={height} />

          {isBest && (
            <span
              className="
              text-[10px] px-2 py-1 rounded-md
              bg-white/10 text-white
              border border-white/20
              backdrop-blur-md
              uppercase tracking-wider
            "
            >
              Best
            </span>
          )}

          <div>
            <div className="font-medium">{opt.label}</div>
            <div className="text-sm text-zinc-400">
              {opt.fps ? `${opt.fps}fps · ` : ""}
              {opt.filesize
                ? `${(opt.filesize / 1024 / 1024).toFixed(1)} MB`
                : ""}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSelectedFormat(opt)}
            className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700"
          >
            ▶ Play
          </button>

          <button
            onClick={() => startDownload(opt.format_id)}
            className="px-4 py-2 rounded-lg
            bg-emerald-600/90 hover:bg-emerald-500
            transition active:scale-95"
          >
            ⬇ Download
          </button>
        </div>
      </div>
    );
  }

  function streamUrl(formatId: string) {
    return `http://127.0.0.1:8000/stream?url=${encodeURIComponent(
      url,
    )}&format_id=${formatId}`;
  }

  function downloadUrl(formatId: string) {
    return `http://127.0.0.1:8000/download?url=${encodeURIComponent(
      url,
    )}&format_id=${formatId}`;
  }

  function startDownload(formatId: string) {
    const evt = new EventSource(
      `http://127.0.0.1:8000/download/progress?url=${encodeURIComponent(
        url,
      )}&format_id=${formatId}`,
    );

    evt.onmessage = (e) => {
      if (e.data === "started") {
        // show progress bar immediately
        setProgress(0);
        return;
      }

      if (e.data.startsWith("done:")) {
        const jobId = e.data.split("done:")[1];
        evt.close();

        window.location.href = `http://127.0.0.1:8000/download/${jobId}`;
        return;
      }

      if (e.data.startsWith("error")) {
        evt.close();
        alert("Download failed on server");
        return;
      }

      // progress %
      setProgress(parseFloat(e.data));
    };

    evt.onerror = () => {
      evt.close();
      alert("Connection lost");
    };
  }

  function EmptyCard() {
    return (
      <div
        className="
        min-h-24
        rounded-xl
        bg-white/2
        border border-dashed border-white/10
      "
      />
    );
  }

  const grouped = video ? groupByExt(video.download_options) : {};
  const mp4Formats = grouped["mp4"] || [];
  const webmFormats = grouped["webm"] || [];
  const otherFormats = Object.entries(grouped).filter(
    ([ext]) => ext !== "mp4" && ext !== "webm",
  );
  const maxRows = Math.max(mp4Formats.length, webmFormats.length);

  return (
    <main
      className="relative min-h-screen overflow-hidden text-zinc-100 p-6
    bg-linear-to-br from-purple-800 via-indigo-700 to-cyan-600"
    >
      {/* background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-32 -left-32 w-130 h-130 rounded-full bg-pink-600/30 blur-[140px]"
          style={{ animation: "blob-move 12s infinite ease-in-out" }}
        />
        <div
          className="absolute top-1/4 -right-32 w-130 h-130 rounded-full bg-cyan-500/30 blur-[140px]"
          style={{ animation: "blob-move 16s infinite ease-in-out" }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-130 h-130 rounded-full bg-yellow-500/20 blur-[160px]"
          style={{ animation: "blob-move 20s infinite ease-in-out" }}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <h1 className="flex items-center justify-center gap-3 text-4xl font-bold tracking-tight">
            <svg
              width="60"
              height="60"
              viewBox="0 0 24 24"
              fill="none"
              className="drop-shadow-[0_0_8px_rgba(255,0,0,0.45)]"
            >
              <rect x="2" y="6" width="20" height="12" rx="3" fill="#FF0000" />
              <polygon points="10,9 16,12 10,15" fill="white" />
            </svg>

            <span>Youtube Downloader 4K</span>
          </h1>

          <p className="text-zinc-400 max-w-xl mx-auto">
            Download and stream videos in the highest quality available — fast,
            clean, and without distractions.
          </p>
        </div>

        <div
          className="
                      mx-auto w-full max-w-2xl
                      rounded-2xl
                      bg-black/30
                      backdrop-blur-xl
                      border border-white/10
                      p-6
                      shadow-[0_10px_40px_rgba(0,0,0,0.35)]
                      transition-all duration-300
  hover:bg-black/15 hover:border-white/20
                    "
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!loading && url.trim()) {
                extract();
              }
            }}
            // className="flex flex-col sm:flex-row gap-3"
            className="mx-auto flex flex-col sm:flex-row gap-3 w-full max-w-2xl"
          >
            {/* URL input */}
            <div className="relative flex-1">
              {/* <span
                className="
        absolute left-3 top-1/2 -translate-y-1/2
        text-indigo-300 text-lg pointer-events-none
      "
              >
                🔗
              </span> */}
              <span
                className="
    absolute left-3 top-1/2 -translate-y-1/2
    pointer-events-none
    opacity-90
  "
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="2"
                    y="6"
                    width="20"
                    height="12"
                    rx="3"
                    fill="#FF0000"
                  />
                  <polygon points="10,9 16,12 10,15" fill="white" />
                </svg>
              </span>

              <input
                value={url}
                disabled={loading}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste YouTube URL…"
                className="w-full pl-12 pr-4 py-3 rounded-lg
        bg-zinc-900 border border-zinc-800
        focus:border-indigo-500 focus:outline-none
        disabled:opacity-50"
              />
            </div>

            {/* Extract button */}
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="
    px-8 py-3 rounded-lg
    bg-indigo-500 hover:bg-indigo-400
    text-white font-semibold
    shadow-md hover:shadow-lg transition
    sm:self-stretch
  "
            >
              {loading ? "Extracting…" : "Extract"}
            </button>
          </form>
        </div>

        {/* Skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="
          h-20 rounded-xl
          bg-white/10 backdrop-blur-xl
          border border-white/20
          shadow-lg
          relative overflow-hidden
        "
              >
                {/* shimmer */}
                <div
                  className="
            absolute inset-0
            bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.25),transparent)]
            animate-[progress-shimmer_1.5s_linear_infinite]
          "
                />
              </div>
            ))}
          </div>
        )}

        {/* Video Info */}
        {video && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{video.title}</h2>

            {selectedFormat && (
              <video
                className="w-full rounded bg-black"
                controls
                src={streamUrl(selectedFormat.format_id)}
              />
            )}

            {progress !== null && (
              <div className="mt-8 space-y-3">
                {/* Label row */}
                <div className="flex items-center justify-between text-sm text-zinc-400">
                  <span>Downloading</span>
                  <span className="tabular-nums">{progress.toFixed(1)}%</span>
                </div>

                {/* Progress bar */}
                <div className="relative h-3 rounded-full bg-zinc-800/70 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-green-400 via-lime-300 to-green-500 transition-all duration-300 ease-out before:absolute before:inset-0 before:bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.4),transparent)] before:animate-[progress-shimmer_1.2s_linear_infinite]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="font-semibold">Available Formats</h3>
              <div className="space-y-6">
                <div className="space-y-6">
                  {/* Headers */}
                  <div className="grid grid-cols-2 gap-6 text-sm text-zinc-400 uppercase tracking-wider">
                    <div>MP4</div>
                    <div>WEBM</div>
                  </div>

                  {/* Rows */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    {Array.from({ length: maxRows }).map((_, i) => (
                      <div key={i} className="contents">
                        {/* MP4 cell */}
                        {mp4Formats[i] ? (
                          renderFormat(mp4Formats[i], i)
                        ) : (
                          <EmptyCard />
                        )}

                        {/* WEBM cell */}
                        {webmFormats[i] ? (
                          renderFormat(webmFormats[i], i)
                        ) : (
                          <EmptyCard />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
