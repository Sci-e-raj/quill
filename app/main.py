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

app = FastAPI(title="Media Extractor API")


class ExtractRequest(BaseModel):
    url: str


@app.post("/extract", response_model=VideoInfo)
def extract_video(req: ExtractRequest):
    try:
        data = extract_info(req.url)

        formats = normalize_formats(data.get("formats", []))

        # return {
        #     "id": data.get("id"),
        #     "title": data.get("title"),
        #     "duration": data.get("duration"),
        #     "thumbnail": data.get("thumbnail"),
        #     "formats": formats
        # }
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

@app.post("/download")
def download_video(req: DownloadRequest):
    try:
        file_path = download_and_merge(req.url, req.format_id)

        filename = os.path.basename(file_path)

        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="application/octet-stream"
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
