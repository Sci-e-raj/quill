from pydantic import BaseModel
from typing import List, Optional

class DownloadRequest(BaseModel):
    url: str
    format_id: str

class DownloadOption(BaseModel):
    label: str              # e.g. "1080p MP4"
    resolution: str         # "1920x1080"
    ext: str                # "mp4"
    format_id: str          # video-only format id
    fps: Optional[float]
    filesize: Optional[int]

class Format(BaseModel):
    format_id: str
    ext: str
    resolution: Optional[str]
    fps: Optional[float]   # <-- FIX HERE
    vcodec: Optional[str]
    acodec: Optional[str]
    filesize: Optional[int]
    filesize_approx: Optional[int]
    has_video: bool
    has_audio: bool


class VideoInfo(BaseModel):
    id: str
    title: str
    duration: Optional[int]
    thumbnail: Optional[str]
    formats: List[Format]
    download_options: List[DownloadOption]