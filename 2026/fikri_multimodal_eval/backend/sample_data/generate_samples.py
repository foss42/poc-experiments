#!/usr/bin/env python3
"""Generate sample test images and audio for the PoC.

Images: pure Pillow (shapes + text)
Audio: gTTS for real speech WAVs (so Whisper can actually transcribe them)

Usage:
    pip install Pillow gTTS
    python generate_samples.py
"""

import math
import struct
from pathlib import Path

OUT = Path(__file__).parent


def generate_images():
    from PIL import Image, ImageDraw, ImageFont

    d_out = OUT / "images"
    d_out.mkdir(exist_ok=True)
    S = (256, 256)

    # Red circle
    img = Image.new("RGB", S, "white")
    ImageDraw.Draw(img).ellipse([48, 48, 208, 208], fill="red")
    img.save(d_out / "red_circle.png")

    # Blue square
    img = Image.new("RGB", S, "white")
    ImageDraw.Draw(img).rectangle([48, 48, 208, 208], fill="blue")
    img.save(d_out / "blue_square.png")

    # Green triangle
    img = Image.new("RGB", S, "white")
    ImageDraw.Draw(img).polygon([(128, 32), (32, 224), (224, 224)], fill="green")
    img.save(d_out / "green_triangle.png")

    # Yellow star
    img = Image.new("RGB", S, "white")
    draw = ImageDraw.Draw(img)
    cx, cy = 128, 128
    pts = []
    for i in range(10):
        a = math.radians(i * 36 - 90)
        r = 90 if i % 2 == 0 else 36
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    draw.polygon(pts, fill="yellow", outline="goldenrod")
    img.save(d_out / "yellow_star.png")

    # Hello World text
    img = Image.new("RGB", S, "white")
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 32)
    except OSError:
        font = ImageFont.load_default()
    bb = draw.textbbox((0, 0), "Hello World", font=font)
    draw.text(((256 - bb[2] + bb[0]) / 2, (256 - bb[3] + bb[1]) / 2),
              "Hello World", fill="black", font=font)
    img.save(d_out / "hello_text.png")

    print(f"[images] {len(list(d_out.glob('*.png')))} files in {d_out}")


def generate_audio():
    """Generate real speech WAVs using Google TTS (so Whisper can transcribe)."""
    from gtts import gTTS
    import subprocess, shutil

    d_out = OUT / "audio"
    d_out.mkdir(exist_ok=True)

    sentences = {
        "the_sky_is_blue.wav": "The sky is blue.",
        "capital_of_france.wav": "The capital of France is Paris.",
        "two_plus_two.wav": "Two plus two equals four.",
        "hello_world.wav": "Hello world.",
    }

    has_ffmpeg = shutil.which("ffmpeg") is not None

    for fname, text in sentences.items():
        mp3_path = d_out / fname.replace(".wav", ".mp3")
        wav_path = d_out / fname

        tts = gTTS(text=text, lang="en")
        tts.save(str(mp3_path))

        if has_ffmpeg:
            subprocess.run(
                ["ffmpeg", "-y", "-i", str(mp3_path), "-ar", "16000", "-ac", "1", str(wav_path)],
                capture_output=True,
            )
            mp3_path.unlink()
        else:
            # Keep as mp3 — Whisper handles both
            wav_path = mp3_path

    print(f"[audio] {len(sentences)} files in {d_out}")


if __name__ == "__main__":
    generate_images()
    generate_audio()
