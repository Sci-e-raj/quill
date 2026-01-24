import subprocess
import os
import uuid
from typing import Iterator

DOWNLOAD_DIR = "downloads"

def ensure_dirs():
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)


def download_and_merge(url: str, video_format_id: str) -> str:
    """
    Downloads video-only + best audio and merges them.
    Returns final file path.
    """
    ensure_dirs()

    job_id = str(uuid.uuid4())
    output_template = os.path.join(DOWNLOAD_DIR, job_id)

    cmd = [
        "yt-dlp",
        "-f", f"{video_format_id}+bestaudio",
        "--merge-output-format", "mp4",
        "-o", f"{output_template}.%(ext)s",
        url
    ]

    process = subprocess.run(
        cmd,
        capture_output=True,
        text=True
    )

    if process.returncode != 0:
        raise RuntimeError(process.stderr)

    # yt-dlp decides extension after merge
    for ext in ("mp4", "mkv", "webm"):
        path = f"{output_template}.{ext}"
        if os.path.exists(path):
            return path

    raise RuntimeError("Merged file not found")

def stream_video(url: str, video_format_id: str):
    ytdlp_cmd = [
        "yt-dlp",
        "-f", f"{video_format_id}+bestaudio",
        "-o", "-",
        url
    ]

    ffmpeg_cmd = [
        "ffmpeg",
        "-i", "pipe:0",
        "-movflags", "frag_keyframe+empty_moov",
        "-f", "mp4",
        "pipe:1"
    ]

    ytdlp = subprocess.Popen(
        ytdlp_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL
    )

    ffmpeg = subprocess.Popen(
        ffmpeg_cmd,
        stdin=ytdlp.stdout,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        bufsize=0
    )
    
    if ytdlp.stdout:
        ytdlp.stdout.close()

    if not ffmpeg.stdout:
        raise RuntimeError("FFmpeg failed to create output stream")

    try:
        while True:
            chunk = ffmpeg.stdout.read(64 * 1024)
            if not chunk:
                break
            yield chunk
    finally:
        ffmpeg.stdout.close()
        ffmpeg.wait()
        ytdlp.wait()

