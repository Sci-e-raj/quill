from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app.extractor import extract_info
from app.utils import normalize_formats
from app.models import VideoInfo
from app.utils import normalize_formats, build_download_options

from fastapi.responses import FileResponse
from app.downloader import download_and_merge
from app.models import DownloadRequest
import os

from fastapi.responses import StreamingResponse
from app.downloader import stream_video

from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware

from app.downloader import download_with_progress

DOWNLOAD_DIR = "downloads"

app = FastAPI(title="Media Extractor API")

class ExtractRequest(BaseModel):
    url: str

# IMPROVED CORS CONFIGURATION
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],  # Important for SSE
)

@app.post("/extract", response_model=VideoInfo)
def extract_video(req: ExtractRequest):
    try:
        data = extract_info(req.url)

        formats = normalize_formats(data.get("formats", []))

        raw_formats = data.get("formats", [])

        return {
            "id": data.get("id"),
            "title": data.get("title"),
            "duration": data.get("duration"),
            "thumbnail": data.get("thumbnail"),
            "formats": normalize_formats(raw_formats),
            "download_options": build_download_options(raw_formats)
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/download")
def download_video(url: str, format_id: str):
    """
    Blocking download endpoint - downloads entire file before returning.
    Not recommended for large files.
    """
    try:
        file_path = download_and_merge(url, format_id)

        filename = os.path.basename(file_path)

        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="video/mp4"
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/stream")
def stream_video_endpoint(url: str, format_id: str):
    """
    Streaming endpoint for video playback in browser.
    """
    return StreamingResponse(
        stream_video(url, format_id),
        media_type="video/mp4",
        headers={
            "Content-Disposition": "inline",
            "Cache-Control": "no-cache",
        }
    )

@app.get("/download/progress")
def download_progress(url: str, format_id: str):
    """
    SSE endpoint that streams download progress.
    Returns events: started, <percentage>, done:<job_id>, or error:<msg>
    """
    return download_with_progress(url, format_id)

@app.get("/download/{job_id}")
def download_file(job_id: str):
    """
    Endpoint to download a completed file by job_id.
    """
    file_path = os.path.join(DOWNLOAD_DIR, f"{job_id}.mp4")
    meta_path = os.path.join(DOWNLOAD_DIR, f"{job_id}.txt")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File not found: {job_id}")

    filename = f"{job_id}.mp4"
    if os.path.exists(meta_path):
        try:
            with open(meta_path, encoding="utf-8") as f:
                title = f.read().strip()
                if title:
                    filename = f"{title}.mp4"
        except Exception:
            pass  # Use default filename if metadata read fails

    return FileResponse(
        path=file_path,
        media_type="video/mp4",
        filename=filename,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )

# Add health check endpoint
@app.get("/health")
def health_check():
    return {"status": "ok", "download_dir": DOWNLOAD_DIR}