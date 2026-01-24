import subprocess
import os
import uuid


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
