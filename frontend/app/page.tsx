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
        px-2.5 py-1
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
    min-h-24        // 👈 ADD THIS
    bg-white/5 backdrop-blur-xl
    border border-white/10
    shadow-lg
    transition-all duration-200
    hover:bg-white/10 hover:border-white/20 hover:-translate-y-px
    ${isBest ? "ring-1 ring-indigo-500/60" : ""}
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
  bg-linear-to-br from-zinc-950 via-zinc-900 to-black"
    >
      {/* background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 w-130 h-130 rounded-full bg-purple-700/25 blur-[140px]" />
        <div className="absolute top-1/4 -right-32 w-130 h-130 rounded-full bg-indigo-600/25 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 w-130 h-130 rounded-full bg-fuchsia-600/20 blur-[160px]" />
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
          <h1 className="text-4xl font-bold tracking-tight">
            Media Downloader
          </h1>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Download and stream videos in the highest quality available — fast,
            clean, and without distractions.
          </p>
        </div>
        <div className="rounded-2xl bg-zinc-900/70 backdrop-blur border border-zinc-800 p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* URL input */}
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                🔗
              </span>
              <input
                value={url}
                disabled={loading}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste YouTube URL…"
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
              />
            </div>

            {/* Extract button */}
            <button
              onClick={extract}
              disabled={loading}
              className="px-8 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition"
            >
              {loading ? "Extracting…" : "Extract"}
            </button>
          </div>
        </div>

        {/* Skeleton */}
        {loading && (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 rounded bg-zinc-900 border border-zinc-800"
              />
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
              <div className="mt-6 space-y-2">
                <div className="w-full h-3 bg-zinc-800 rounded overflow-hidden">
                  <div
                    className="h-3 bg-green-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-sm text-zinc-400">
                  Downloading… {progress.toFixed(1)}%
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
