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
  if (height >= 4320) {
    return (
      <div className="relative inline-flex items-center gap-2 px-3.5 py-1.5 bg-linear-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-sm border border-yellow-500/30 rounded-lg">
        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]"></div>
        <span className="text-xs font-bold tracking-wide text-yellow-400">
          8K ULTRA
        </span>
      </div>
    );
  } else if (height >= 2160) {
    return (
      <div className="relative inline-flex items-center gap-2 px-3.5 py-1.5 bg-linear-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-sm border border-amber-500/30 rounded-lg">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
        <span className="text-xs font-bold tracking-wide text-amber-400">
          4K ULTRA
        </span>
      </div>
    );
  } else if (height >= 1440) {
    return (
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-violet-500/10 backdrop-blur-sm border border-violet-500/30 rounded-lg">
        <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
        <span className="text-xs font-semibold tracking-wide text-violet-400">
          2K QHD
        </span>
      </div>
    );
  } else if (height >= 1080) {
    return (
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-500/10 backdrop-blur-sm border border-blue-500/30 rounded-lg">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
        <span className="text-xs font-semibold tracking-wide text-blue-400">
          1080p FHD
        </span>
      </div>
    );
  } else if (height >= 720) {
    return (
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/30 rounded-lg">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
        <span className="text-xs font-semibold tracking-wide text-emerald-400">
          720p HD
        </span>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-zinc-500/10 backdrop-blur-sm border border-zinc-500/30 rounded-lg">
      <div className="w-1.5 h-1.5 rounded-full bg-zinc-500"></div>
      <span className="text-xs font-semibold tracking-wide text-zinc-400">
        SD
      </span>
    </div>
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
        className={`group relative bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 transition-all duration-300 min-h-[120px] flex flex-col justify-between ${
          isBest
            ? "ring-1 ring-amber-400/40 shadow-[0_0_20px_rgba(251,191,36,0.1)]"
            : ""
        }`}
      >
        {isBest && (
          <div className="absolute -top-2.5 -right-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-linear-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-md border border-amber-400/40 text-amber-300 text-[10px] font-bold rounded-full shadow-lg">
            <svg
              className="w-2.5 h-2.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            BEST QUALITY
          </div>
        )}

        <div className="flex items-start justify-between gap-4 flex-1">
          <div className="flex items-start gap-4 flex-1">
            <div className="shrink-0">
              <ResolutionBadge height={height} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-white font-medium text-sm mb-1.5 truncate">
                {opt.label}
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                {opt.fps && (
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-3 h-3 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    {opt.fps}fps
                  </span>
                )}
                {opt.filesize && (
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-3 h-3 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    {(opt.filesize / 1024 / 1024).toFixed(1)} MB
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-800">
          <button
            onClick={() => setSelectedFormat(opt)}
            className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
            Preview
          </button>

          <button
            onClick={() => startDownload(opt.format_id)}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium shadow-lg shadow-red-600/30"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download
          </button>
        </div>
      </div>
    );
  }

  function streamUrl(formatId: string) {
    return `http://127.0.0.1:8000/stream?url=${encodeURIComponent(url)}&format_id=${formatId}`;
  }

  function downloadUrl(formatId: string) {
    return `http://127.0.0.1:8000/download?url=${encodeURIComponent(url)}&format_id=${formatId}`;
  }

  function startDownload(formatId: string) {
    const evt = new EventSource(
      `http://127.0.0.1:8000/download/progress?url=${encodeURIComponent(url)}&format_id=${formatId}`,
    );

    evt.onmessage = (e) => {
      if (e.data === "started") {
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

      setProgress(parseFloat(e.data));
    };

    evt.onerror = () => {
      evt.close();
      alert("Connection lost");
    };
  }

  function EmptyCard() {
    return (
      <div className="min-h-[120px] rounded-xl bg-zinc-900/40 border border-dashed border-zinc-800 flex items-center justify-center text-zinc-600 text-sm">
        No format available
      </div>
    );
  }

  const grouped = video ? groupByExt(video.download_options) : {};
  const mp4Formats = grouped["mp4"] || [];
  const webmFormats = grouped["webm"] || [];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap");

        * {
          font-family:
            "Inter",
            -apple-system,
            BlinkMacSystemFont,
            sans-serif;
        }

        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        .shimmer {
          animation: shimmer 2s infinite linear;
          background: linear-linear(
            to right,
            #18181b 0%,
            #27272a 50%,
            #18181b 100%
          );
          background-size: 1000px 100%;
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-20px) translateX(10px);
          }
        }

        @keyframes float-delayed {
          0%,
          100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-30px) translateX(-15px);
          }
        }

        @keyframes float-slow {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-15px) rotate(5deg);
          }
        }

        @keyframes pulse-glow {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.1);
          }
        }

        @keyframes-linear-shift {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.8;
          }
        }

        .video-player {
          aspect-ratio: 16/9;
        }

        .animated-bg {
          background: linear-linear(-45deg, #000000, #0a0a0a, #1a0a0a, #0a0515);
          background-size: 400% 400%;
          animation: -linear-shift 15s ease infinite;
        }

        .grid-pattern {
          background-image:
            linear-linear(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-linear(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          background-size: 50px 50px;
        }

        @keyframes scan-line {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100vh);
          }
        }

        .scan-line {
          animation: scan-line 8s linear infinite;
        }
      `}</style>

      {/* Animated Background Layer */}
      <div className="fixed inset-0 animated-bg"></div>

      {/* Grid Pattern Overlay */}
      <div className="fixed inset-0 grid-pattern opacity-30"></div>

      {/* Animated Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[500px] h-[500px] bg-linear-to-br from-red-600/20 to-orange-600/20 rounded-full blur-3xl"
          style={{
            top: "-10%",
            left: "-10%",
            animation: "float 20s ease-in-out infinite",
          }}
        ></div>

        <div
          className="absolute w-[400px] h-[400px] bg-linear-to-br from-purple-600/15 to-pink-600/15 rounded-full blur-3xl"
          style={{
            top: "40%",
            right: "-5%",
            animation: "float-delayed 18s ease-in-out infinite",
          }}
        ></div>

        <div
          className="absolute w-[450px] h-[450px] bg-linear-to-br from-blue-600/15 to-cyan-600/15 rounded-full blur-3xl"
          style={{
            bottom: "-15%",
            left: "30%",
            animation: "float-slow 22s ease-in-out infinite",
          }}
        ></div>

        <div
          className="absolute w-[300px] h-[300px] bg-linear-to-br from-yellow-600/20 to-red-600/20 rounded-full blur-2xl"
          style={{
            top: "15%",
            right: "20%",
            animation: "pulse-glow 8s ease-in-out infinite",
          }}
        ></div>

        <div
          className="absolute w-[250px] h-[250px] bg-linear-to-br from-green-600/15 to-emerald-600/15 rounded-full blur-2xl"
          style={{
            bottom: "20%",
            left: "10%",
            animation: "pulse-glow 10s ease-in-out infinite 2s",
          }}
        ></div>
      </div>

      {/* Floating Particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-1 h-1 bg-white/30 rounded-full"
          style={{
            left: "10%",
            top: "20%",
            animation: "twinkle 3s ease-in-out infinite",
          }}
        ></div>
        <div
          className="absolute w-1 h-1 bg-white/30 rounded-full"
          style={{
            left: "85%",
            top: "15%",
            animation: "twinkle 4s ease-in-out infinite 0.5s",
          }}
        ></div>
        <div
          className="absolute w-1.5 h-1.5 bg-white/25 rounded-full"
          style={{
            left: "25%",
            top: "45%",
            animation: "twinkle 3.5s ease-in-out infinite 1s",
          }}
        ></div>
        <div
          className="absolute w-1 h-1 bg-white/30 rounded-full"
          style={{
            left: "70%",
            top: "60%",
            animation: "twinkle 4.5s ease-in-out infinite 1.5s",
          }}
        ></div>
        <div
          className="absolute w-1.5 h-1.5 bg-white/25 rounded-full"
          style={{
            left: "15%",
            top: "75%",
            animation: "twinkle 3s ease-in-out infinite 2s",
          }}
        ></div>
        <div
          className="absolute w-1 h-1 bg-white/30 rounded-full"
          style={{
            left: "90%",
            top: "80%",
            animation: "twinkle 4s ease-in-out infinite 2.5s",
          }}
        ></div>
        <div
          className="absolute w-2 h-2 bg-white/20 rounded-full"
          style={{
            left: "50%",
            top: "30%",
            animation: "twinkle 5s ease-in-out infinite",
          }}
        ></div>
        <div
          className="absolute w-1 h-1 bg-white/30 rounded-full"
          style={{
            left: "35%",
            top: "10%",
            animation: "twinkle 3.5s ease-in-out infinite 0.8s",
          }}
        ></div>
        <div
          className="absolute w-1.5 h-1.5 bg-white/25 rounded-full"
          style={{
            left: "60%",
            top: "25%",
            animation: "twinkle 4.2s ease-in-out infinite 1.2s",
          }}
        ></div>
        <div
          className="absolute w-1 h-1 bg-white/30 rounded-full"
          style={{
            left: "5%",
            top: "50%",
            animation: "twinkle 3.8s ease-in-out infinite 1.8s",
          }}
        ></div>
        <div
          className="absolute w-1 h-1 bg-white/30 rounded-full"
          style={{
            left: "95%",
            top: "40%",
            animation: "twinkle 4.5s ease-in-out infinite 0.3s",
          }}
        ></div>
        <div
          className="absolute w-1.5 h-1.5 bg-white/25 rounded-full"
          style={{
            left: "40%",
            top: "70%",
            animation: "twinkle 3.2s ease-in-out infinite 2.2s",
          }}
        ></div>
        <div
          className="absolute w-1 h-1 bg-white/30 rounded-full"
          style={{
            left: "75%",
            top: "85%",
            animation: "twinkle 4.8s ease-in-out infinite 0.7s",
          }}
        ></div>
        <div
          className="absolute w-2 h-2 bg-white/20 rounded-full"
          style={{
            left: "20%",
            top: "65%",
            animation: "twinkle 5.5s ease-in-out infinite 1.5s",
          }}
        ></div>
        <div
          className="absolute w-1 h-1 bg-white/30 rounded-full"
          style={{
            left: "55%",
            top: "55%",
            animation: "twinkle 3.3s ease-in-out infinite 2.8s",
          }}
        ></div>
      </div>

      {/* Scan Line Effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="scan-line absolute w-full h-32 bg-linear-to-b from-transparent via-red-500/5 to-transparent"></div>
      </div>

      {/* Vignette */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-linear(ellipse_at_center,transparent_0%,transparent_60%,black_100%)]"></div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-zinc-800/80 bg-black/60 backdrop-blur-2xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 sm:px-8">
            <div className="flex items-center h-16">
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <div className="absolute inset-0 bg-linear-to-br from-red-500 to-red-600 rounded-xl blur-md opacity-50 group-hover:opacity-70 transition-opacity"></div>
                  <div className="relative w-10 h-10 bg-linear-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center shadow-lg ring-1 ring-white/10">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                    </svg>
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                  <h1 className="text-xl font-bold tracking-tight text-white">
                    Quill
                  </h1>
                  <p className="text-[11px] font-medium text-zinc-500 tracking-wide">
                    Premium Downloader
                  </p>
                </div>
              </div>
              <div className="flex-1"></div>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-6 py-12">
            {/* Hero Section */}
            <div className="mb-12 text-center space-y-4">
              <h2 className="text-5xl font-bold tracking-tight bg-linear-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent drop-shadow-2xl">
                Download Videos in Stunning Quality
              </h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                Experience cinema-quality downloads up to 4K Ultra HD with
                lightning-fast speeds
              </p>
            </div>

            {/* Search Box */}
            <div className="max-w-3xl mx-auto mb-16">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!loading && url.trim()) extract();
                }}
              >
                <div className="relative">
                  <input
                    type="url"
                    value={url}
                    disabled={loading}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste YouTube URL here..."
                    className="w-full px-6 py-5 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/50 rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition-all disabled:opacity-50 text-lg shadow-2xl"
                  />
                  <button
                    type="submit"
                    disabled={loading || !url.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-8 py-3 bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-red-600/50 disabled:shadow-none"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <svg
                          className="animate-spin w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Analyzing...
                      </div>
                    ) : (
                      "Extract Video"
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Loading Skeleton */}
            {loading && (
              <div className="space-y-4 max-w-5xl mx-auto">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-[120px] rounded-xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/50 shimmer shadow-xl"
                  />
                ))}
              </div>
            )}

            {/* Video Content */}
            {video && (
              <div className="space-y-8 max-w-5xl mx-auto">
                <div className="bg-linear-to-r from-zinc-900/90 to-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-8 shadow-2xl">
                  <div className="flex items-start gap-6">
                    {video.thumbnail && (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-48 h-27 object-cover rounded-lg shadow-2xl ring-1 ring-white/10"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-2 leading-tight">
                        {video.title}
                      </h3>
                      {video.duration && (
                        <p className="text-zinc-400 text-sm">
                          Duration: {Math.floor(video.duration / 60)}:
                          {String(video.duration % 60).padStart(2, "0")} minutes
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {selectedFormat && (
                  <div className="bg-black rounded-2xl overflow-hidden border border-zinc-800/50 shadow-2xl ring-1 ring-white/5">
                    <video
                      className="w-full video-player"
                      controls
                      src={streamUrl(selectedFormat.format_id)}
                    />
                  </div>
                )}

                {progress !== null && (
                  <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-6 shadow-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center relative">
                          <div className="absolute inset-0 bg-red-500/30 rounded-full blur-md animate-pulse"></div>
                          <svg
                            className="w-5 h-5 text-red-500 relative z-10"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                        </div>
                        <div>
                          <div className="font-semibold">Downloading...</div>
                          <div className="text-sm text-zinc-400">
                            Please wait while we prepare your file
                          </div>
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-red-500">
                        {progress.toFixed(0)}%
                      </div>
                    </div>

                    <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-linear-to-r from-red-600 to-red-500 rounded-full transition-all duration-300 ease-out shadow-lg shadow-red-500/50"
                        style={{ width: `${progress}%` }}
                      >
                        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent shimmer"></div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <svg
                      className="w-6 h-6 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    Available Formats
                  </h4>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2 flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        MP4 Format
                      </div>
                      {mp4Formats.length > 0 ? (
                        mp4Formats.map((opt, idx) => renderFormat(opt, idx))
                      ) : (
                        <EmptyCard />
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2 flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        WEBM Format
                      </div>
                      {webmFormats.length > 0 ? (
                        webmFormats.map((opt, idx) => renderFormat(opt, idx))
                      ) : (
                        <EmptyCard />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="border-t border-zinc-900/50 mt-auto bg-black/30 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <p className="text-center text-zinc-500 text-sm">
              © 2026 Quill. Download responsibly and respect copyright laws.
              Built with ❤️ by{" "}
              <span className="text-zinc-300 font-medium">Sairaj</span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
