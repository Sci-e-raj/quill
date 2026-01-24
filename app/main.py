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

app = FastAPI(title="Media Extractor API")


class ExtractRequest(BaseModel):
    url: str

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    return StreamingResponse(
        stream_video(url, format_id),
        media_type="video/mp4",
        headers={
            "Content-Disposition": "inline",
            "Cache-Control": "no-cache",
        }
    )

