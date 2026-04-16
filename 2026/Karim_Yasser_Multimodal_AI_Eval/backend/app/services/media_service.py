"""Media processing service for multimodal evaluation.

Handles storage, retrieval, and preprocessing of media files
(images, PDFs, videos) for multimodal AI evaluation.
"""

import io
import logging
import mimetypes
import os
import uuid
import asyncio
from typing import Optional

import httpx
from PIL import Image

logger = logging.getLogger(__name__)

# Directory for uploaded media files
UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Supported MIME types by category
IMAGE_MIMES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"}
PDF_MIMES = {"application/pdf"}
VIDEO_MIMES = {"video/mp4", "video/avi", "video/mov", "video/webm", "video/quicktime", "video/x-msvideo"}

ALL_SUPPORTED_MIMES = IMAGE_MIMES | PDF_MIMES | VIDEO_MIMES


class MediaError(Exception):
    """Raised when media processing fails."""
    pass


def detect_media_type(filename: str, content_type: Optional[str] = None) -> str:
    """Detect media category from filename or content type.

    Returns one of: 'image', 'pdf', 'video', 'unknown'.
    """
    mime = content_type or mimetypes.guess_type(filename)[0] or ""
    if mime in IMAGE_MIMES:
        return "image"
    if mime in PDF_MIMES:
        return "pdf"
    if mime in VIDEO_MIMES:
        return "video"
    # Fallback: check extension
    ext = os.path.splitext(filename)[1].lower()
    ext_map = {
        ".jpg": "image", ".jpeg": "image", ".png": "image",
        ".gif": "image", ".webp": "image", ".bmp": "image",
        ".pdf": "pdf",
        ".mp4": "video", ".avi": "video", ".mov": "video", ".webm": "video",
    }
    return ext_map.get(ext, "unknown")


def get_mime_type(filename: str) -> str:
    """Get MIME type from filename."""
    mime = mimetypes.guess_type(filename)[0]
    return mime or "application/octet-stream"


def save_media_file(file_bytes: bytes, filename: str) -> str:
    """Save a media file to the uploads directory.

    Returns the relative path from the backend root (e.g. 'uploads/abc123_photo.jpg').
    """
    safe_name = f"{uuid.uuid4().hex}_{filename}"
    file_path = os.path.join(UPLOADS_DIR, safe_name)
    with open(file_path, "wb") as f:
        f.write(file_bytes)
    logger.info(f"Saved media file: {file_path} ({len(file_bytes)} bytes)")
    return file_path


async def fetch_media_from_url(url: str, max_retries: int = 3) -> tuple[bytes, str]:
    """Download media from a URL with retry logic for 429 status codes.

    Returns (file_bytes, mime_type).
    """
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI-Eval-Framework/1.0"}
    
    for attempt in range(1, max_retries + 1):
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True, headers=headers) as client:
            try:
                response = await client.get(url)
                response.raise_for_status()
                break  # Success
            except httpx.HTTPStatusError as e:
                # Handle Wikipedia/Wikimedia 429 Too Many Requests
                if e.response.status_code == 429 and attempt < max_retries:
                    retry_after = int(e.response.headers.get("retry-after", attempt * 2))
                    logger.warning(f"429 Too Many Requests for {url}. Waiting {retry_after}s...")
                    await asyncio.sleep(retry_after)
                    continue
                raise MediaError(f"URL returned status {e.response.status_code}: {url}") from e
            except httpx.RequestError as e:
                if attempt < max_retries:
                    logger.warning(f"Request error for {url}: {e}. Retrying {attempt}/{max_retries}...")
                    await asyncio.sleep(2)
                    continue
                raise MediaError(f"Failed to fetch media from URL: {e}") from e

    content_type = response.headers.get("content-type", "").split(";")[0].strip()
    if not content_type:
        content_type = get_mime_type(url.split("?")[0])

    return response.content, content_type


def extract_video_frames(video_bytes: bytes, max_frames: int = 5) -> list[bytes]:
    """Extract evenly-spaced key frames from a video.

    Returns a list of JPEG-encoded frame bytes.
    """
    try:
        import cv2
        import numpy as np
    except ImportError:
        raise MediaError("opencv-python-headless is required for video processing")

    # Write to temp file (OpenCV needs a file path)
    temp_path = os.path.join(UPLOADS_DIR, f"_temp_{uuid.uuid4().hex}.mp4")
    try:
        with open(temp_path, "wb") as f:
            f.write(video_bytes)

        cap = cv2.VideoCapture(temp_path)
        if not cap.isOpened():
            raise MediaError("Failed to open video file")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 0:
            raise MediaError("Video has no frames")

        # Calculate evenly-spaced frame indices
        frame_count = min(max_frames, total_frames)
        indices = [int(i * total_frames / frame_count) for i in range(frame_count)]

        frames = []
        for idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if ret:
                # Encode as JPEG
                _, buffer = cv2.imencode(".jpg", frame)
                frames.append(buffer.tobytes())

        cap.release()
        logger.info(f"Extracted {len(frames)} frames from video ({total_frames} total frames)")
        return frames

    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


def convert_pdf_to_images(pdf_bytes: bytes, max_pages: int = 5) -> list[bytes]:
    """Convert PDF pages to JPEG images using pdf2image.

    Returns a list of JPEG-encoded page image bytes.
    """
    try:
        from pdf2image import convert_from_bytes
    except ImportError:
        raise MediaError("pdf2image is required for PDF processing")

    try:
        images = convert_from_bytes(pdf_bytes, first_page=1, last_page=max_pages, dpi=150)
    except Exception as e:
        raise MediaError(f"Failed to convert PDF to images: {e}") from e

    result = []
    for img in images:
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        result.append(buf.getvalue())

    logger.info(f"Converted {len(result)} PDF pages to images")
    return result


async def resolve_media_item(item: dict) -> tuple[list[bytes], str, str]:
    """Resolve a multimodal dataset item to processable media.

    Given a dataset item dict with 'media_url' or 'media_file',
    returns (image_bytes_list, media_type, display_url).

    For images: returns [image_bytes]
    For videos: returns [frame1_bytes, frame2_bytes, ...]
    For PDFs:   returns [page1_bytes, page2_bytes, ...]
    """
    media_url = item.get("media_url", "")
    media_file = item.get("media_file", "")
    display_url = media_url or media_file

    if media_url:
        file_bytes, content_type = await fetch_media_from_url(media_url)
        media_type = detect_media_type(media_url, content_type)
    elif media_file:
        # Resolve local file path
        if not os.path.isabs(media_file):
            media_file = os.path.join(UPLOADS_DIR, os.path.basename(media_file))
        if not os.path.exists(media_file):
            raise MediaError(f"Media file not found: {media_file}")
        with open(media_file, "rb") as f:
            file_bytes = f.read()
        media_type = detect_media_type(media_file)
    else:
        raise MediaError("Dataset item must have either 'media_url' or 'media_file'")

    # Process based on media type
    if media_type == "image":
        return [file_bytes], media_type, display_url
    elif media_type == "video":
        frames = extract_video_frames(file_bytes, max_frames=5)
        if not frames:
            raise MediaError("No frames could be extracted from video")
        return frames, media_type, display_url
    elif media_type == "pdf":
        pages = convert_pdf_to_images(file_bytes, max_pages=5)
        if not pages:
            raise MediaError("No pages could be converted from PDF")
        return pages, media_type, display_url
    else:
        # Try treating as image as a fallback
        try:
            img = Image.open(io.BytesIO(file_bytes))
            img.verify()
            return [file_bytes], "image", display_url
        except Exception:
            raise MediaError(f"Unsupported media type: {media_type}")
