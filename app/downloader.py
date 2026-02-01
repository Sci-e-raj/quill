import subprocess
import os
import uuid
import re
from typing import Iterator, IO
from fastapi.responses import StreamingResponse
import sys

DOWNLOAD_DIR = "downloads"

PHASE_MAP = {
    "Downloading video": 0,
    "Downloading audio": 1,
    "Merging formats": 2,
}

PROGRESS_RE = re.compile(r"\[download\]\s+(\d+(?:\.\d+)?)%")
PHASE_RE = re.compile(r"\[download\]\s+(Downloading video|Downloading audio)")
MERGE_RE = re.compile(r"\[Merger\]")

def ensure_dirs():
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)

def get_video_title(url: str) -> str:
    cmd = ["yt-dlp", "--get-title", url]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    title = proc.stdout.strip()
    return title or "video"

def safe_filename(name: str) -> str:
    name = re.sub(r'[\\/:*?"<>|]+', "", name)
    return name.strip()

# -------------------------
# Blocking download (server-side file)
# -------------------------
def download_and_merge(url: str, video_format_id: str) -> str:
    """
    Synchronous download + merge. Returns final file path.
    Kept for endpoints that want the file immediately (blocking).
    """
    ensure_dirs()

    job_id = str(uuid.uuid4())
    output_template = os.path.join(DOWNLOAD_DIR, job_id)

    cmd = [
        "yt-dlp",
        "-f",
        f"{video_format_id}+bestaudio",
        "--merge-output-format",
        "mp4",
        "-o",
        f"{output_template}.%(ext)s",
        url,
    ]

    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr or "yt-dlp failed")

    # find produced file
    for ext in ("mp4", "mkv", "webm"):
        path = f"{output_template}.{ext}"
        if os.path.exists(path):
            return path

    raise RuntimeError("Merged file not found")


# -------------------------
# Streaming playback (ffmpeg fragmenting so browser can play)
# -------------------------
def stream_video(url: str, video_format_id: str):
    ytdlp_cmd = [
        "yt-dlp",
        "-f",
        f"{video_format_id}+bestaudio",
        "-o",
        "-",
        url,
    ]

    ffmpeg_cmd = [
        "ffmpeg",
        "-i",
        "pipe:0",
        "-movflags",
        "frag_keyframe+empty_moov",
        "-f",
        "mp4",
        "pipe:1",
    ]

    ytdlp = subprocess.Popen(
        ytdlp_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )

    ffmpeg = subprocess.Popen(
        ffmpeg_cmd,
        stdin=ytdlp.stdout,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        bufsize=0,
    )

    # close the ytdlp stdout in the parent (ffmpeg owns the pipe now)
    if ytdlp.stdout:
        ytdlp.stdout.close()

    stdout = ffmpeg.stdout
    if stdout is None:
        raise RuntimeError("FFmpeg stdout is None")

    try:
        while True:
            chunk = stdout.read(64 * 1024)
            if not chunk:
                break
            yield chunk
    finally:
        try:
            stdout.close()
        except Exception:
            pass
        ffmpeg.wait()
        ytdlp.wait()


# -------------------------
# SSE progress download (non-blocking from the client's perspective)
# -------------------------
def download_with_progress(url: str, video_format_id: str):
    """
    Starts yt-dlp writing to a deterministic file:
      downloads/<job_id>.mp4
    Streams progress lines as SSE:
      data: <percent>\n\n
    On error:
      data: error:<short-stderr>\n\n
    On success:
      data: done:<job_id>\n\n
    """
    ensure_dirs()

    job_id = str(uuid.uuid4())
    final_path = os.path.join(DOWNLOAD_DIR, f"{job_id}.mp4")

    # Get and save title
    try:
        title = safe_filename(get_video_title(url))
        meta_path = os.path.join(DOWNLOAD_DIR, f"{job_id}.txt")
        with open(meta_path, "w", encoding="utf-8") as f:
            f.write(title)
    except Exception as e:
        print(f"Warning: Could not save title: {e}", file=sys.stderr)

    cmd = [
        "yt-dlp",
        "-f",
        f"{video_format_id}+bestaudio",
        "--merge-output-format",
        "mp4",
        "-o",
        final_path,
        "--newline",
        "--no-part",  # Don't use .part files
        url,
    ]

    print(f"Starting download with command: {' '.join(cmd)}", file=sys.stderr)

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    # make sure stdout is captured
    stdout: IO[str] | None = process.stdout
    if stdout is None:
        raise RuntimeError("Failed to start yt-dlp (no stdout)")

    # keep a short rolling tail of output so we can return a useful error
    tail_lines: list[str] = []
    MAX_TAIL_CHARS = 4000

    def event_stream() -> Iterator[str]:
        """Generator that yields SSE-formatted progress updates"""
        
        # Send initial started event
        yield "data: started\n\n"
        
        last_progress = 0.0

        try:
            for line in stdout:
                # Print to stderr for debugging
                print(f"yt-dlp: {line.rstrip()}", file=sys.stderr)
                
                # keep rolling tail
                tail_lines.append(line)
                # trim if too long
                while sum(len(x) for x in tail_lines) > MAX_TAIL_CHARS:
                    tail_lines.pop(0)

                # parse progress lines
                m = PROGRESS_RE.search(line)
                if m:
                    progress = float(m.group(1))
                    # Only send updates if progress changed significantly (reduces noise)
                    if progress - last_progress >= 0.1 or progress >= 100.0:
                        last_progress = progress
                        yield f"data: {progress}\n\n"
                
                # Also detect merge phase
                if MERGE_RE.search(line):
                    yield f"data: 99.9\n\n"
            
            # yt-dlp finished streaming output
            rc = process.wait()
            print(f"yt-dlp exited with code: {rc}", file=sys.stderr)
            
        except Exception as e:
            # if anything unexpected happened, return error with short message
            err_text = str(e)
            print(f"Exception during download: {err_text}", file=sys.stderr)
            yield f"data: error:{err_text}\n\n"
            return

        # final checks
        if rc != 0:
            # include some tail output for debugging
            tail = "".join(tail_lines[-20:])
            short = tail.strip().replace("\n", " ")[:500]
            print(f"yt-dlp failed with rc={rc}: {short}", file=sys.stderr)
            yield f"data: error:yt-dlp exited {rc}: {short}\n\n"
            return

        # Check if file exists
        if not os.path.exists(final_path):
            # Try to find the file with different extensions
            found_file = None
            for ext in ["mp4", "mkv", "webm", "m4a"]:
                alt_path = final_path.replace(".mp4", f".{ext}")
                if os.path.exists(alt_path):
                    found_file = alt_path
                    break
            
            if found_file:
                # Rename to expected path
                print(f"Found file with different extension: {found_file}, renaming to {final_path}", file=sys.stderr)
                os.rename(found_file, final_path)
            else:
                tail = "".join(tail_lines[-20:])
                short = tail.strip().replace("\n", " ")[:500]
                print(f"File not found at {final_path}", file=sys.stderr)
                print(f"Directory contents: {os.listdir(DOWNLOAD_DIR)}", file=sys.stderr)
                yield f"data: error:file-not-found:{short}\n\n"
                return

        # Verify file is not empty
        file_size = os.path.getsize(final_path)
        print(f"Download complete! File size: {file_size} bytes at {final_path}", file=sys.stderr)
        
        if file_size == 0:
            yield f"data: error:downloaded file is empty\n\n"
            return

        # success
        yield f"data: done:{job_id}\n\n"

    return StreamingResponse(
        event_stream(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable buffering for nginx
            "Connection": "keep-alive",
        }
    )