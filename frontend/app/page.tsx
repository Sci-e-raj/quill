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
  if (height >= 2160)
    return <span className="px-2 py-1 text-xs rounded bg-purple-700">4K</span>;
  if (height >= 1440)
    return <span className="px-2 py-1 text-xs rounded bg-indigo-700">2K</span>;
  if (height >= 1080)
    return <span className="px-2 py-1 text-xs rounded bg-blue-700">1080p</span>;
  if (height >= 720)
    return <span className="px-2 py-1 text-xs rounded bg-zinc-700">720p</span>;

  return <span className="px-2 py-1 text-xs rounded bg-zinc-800">SD</span>;
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

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center">Media Downloader</h1>

        {/* Input */}
        <div className="flex gap-2">
          <input
            value={url}
            disabled={loading}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube URL…"
            className="flex-1 px-4 py-3 rounded bg-zinc-900 border border-zinc-800 disabled:opacity-50"
          />
          <button
            onClick={extract}
            disabled={loading}
            className="px-6 py-3 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? "Extracting…" : "Extract"}
          </button>
        </div>

        {/* Skeleton */}
        {loading && (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
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
              {Object.entries(groupByExt(video.download_options))
                .sort(([a], [b]) => (a === "mp4" ? -1 : b === "mp4" ? 1 : 0))
                .map(([ext, formats]) => (
                  <div key={ext} className="space-y-2">
                    <h4 className="text-lg font-semibold uppercase text-zinc-300">
                      {ext} formats
                    </h4>

                    {formats.map((opt, idx) => {
                      const height = getHeight(opt.resolution);
                      const isBest = idx === 0;

                      return (
                        <div
                          key={opt.format_id}
                          className={`flex items-center justify-between p-3 rounded border ${
                            isBest
                              ? "bg-zinc-900 border-indigo-600"
                              : "bg-zinc-900 border-zinc-800"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <ResolutionBadge height={height} />

                            {isBest && (
                              <span className="text-xs px-2 py-1 rounded bg-indigo-600">
                                BEST
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

                            {/* <a
                              href={downloadUrl(opt.format_id)}
                              className="px-4 py-2 rounded bg-green-600 hover:bg-green-500"
                            >
                              ⬇ Download
                            </a> */}
                            <button
                              onClick={() => startDownload(opt.format_id)}
                              className="px-4 py-2 rounded bg-green-600 hover:bg-green-500"
                            >
                              ⬇ Download
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}

              {/* {video.download_options.map(
                (opt: DownloadOption, idx: number) => {
                  const height = getHeight(opt.resolution);
                  const isBest = idx === 0;

                  return (
                    <div
                      key={opt.format_id}
                      className={`flex items-center justify-between p-3 rounded border ${
                        isBest
                          ? "bg-zinc-900 border-indigo-600"
                          : "bg-zinc-900 border-zinc-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <ResolutionBadge height={height} />
                        {isBest && (
                          <span className="text-xs px-2 py-1 rounded bg-indigo-600">
                            BEST
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

                        <a
                          href={downloadUrl(opt.format_id)}
                          className="px-4 py-2 rounded bg-green-600 hover:bg-green-500"
                        >
                          ⬇ Download
                        </a>
                      </div>
                    </div>
                  );
                },
              )} */}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
