import subprocess
import json


def extract_info(url: str) -> dict:
    """
    Uses yt-dlp to extract metadata only (no download)
    """
    process = subprocess.run(
        [
            "yt-dlp",
            "-J",          # JSON output
            "--no-playlist",
            url
        ],
        capture_output=True,
        text=True
    )

    if process.returncode != 0:
        raise RuntimeError(process.stderr)

    return json.loads(process.stdout)
