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

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [video, setVideo] = useState<any>(null);
  const [selectedFormat, setSelectedFormat] = useState<DownloadOption | null>(
    null,
  );

  async function extract() {
    if (!url) return;
    setLoading(true);
    setSelectedFormat(null);

    const res = await fetch("http://127.0.0.1:8000/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();
    setVideo(data);
    setLoading(false);
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

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center">Media Downloader</h1>

        {/* URL Input */}
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube URL…"
            className="flex-1 px-4 py-3 rounded bg-zinc-900 border border-zinc-800 focus:outline-none"
          />
          <button
            onClick={extract}
            disabled={loading}
            className="px-6 py-3 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? "Extracting…" : "Extract"}
          </button>
        </div>

        {/* Video Info */}
        {video && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{video.title}</h2>

            {/* Video Player */}
            {selectedFormat && (
              <video
                className="w-full rounded bg-black"
                controls
                src={streamUrl(selectedFormat.format_id)}
              />
            )}

            {/* Formats */}
            <div className="space-y-2">
              <h3 className="font-semibold">Available Formats</h3>

              {video.download_options.map((opt: DownloadOption) => (
                <div
                  key={opt.format_id}
                  className="flex items-center justify-between p-3 rounded bg-zinc-900 border border-zinc-800"
                >
                  <div>
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-sm text-zinc-400">
                      {opt.fps ? `${opt.fps}fps · ` : ""}
                      {opt.filesize
                        ? `${(opt.filesize / 1024 / 1024).toFixed(1)} MB`
                        : ""}
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
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
