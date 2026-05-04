"""
Decart image try-on: person image + garment reference -> edited image (PNG).
CLI: python photo.py <person_image_path> <garment_image_path> <output_image_path>
Requires: DECART_API_KEY in the environment.
"""
import argparse
import asyncio
import os
import sys
from pathlib import Path

from decart import DecartClient, models

PROMPT = (
    "Virtual try-on: apply the upper-body clothing style, colors, pattern, and fit from the reference garment "
    "image onto the person in the main image. Keep the person's face, hair, skin, body proportions, pose, "
    "hands, and background unchanged. Output a photorealistic result."
)


def _write_result(output_path: str, result) -> None:
    if isinstance(result, (bytes, bytearray)):
        data = bytes(result)
    elif hasattr(result, "read"):
        data = result.read()
    else:
        data = bytes(result)
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(data)


async def run_photo_edit(person_path: str, garment_path: str, output_path: str, *, api_key: str) -> None:
    person_path = str(Path(person_path).resolve())
    garment_path = str(Path(garment_path).resolve())
    output_path = str(Path(output_path).resolve())

    if not Path(person_path).is_file():
        raise FileNotFoundError(f"Person image not found: {person_path}")
    if not Path(garment_path).is_file():
        raise FileNotFoundError(f"Garment image not found: {garment_path}")

    resolution = os.environ.get("DECART_IMAGE_RESOLUTION", "720p").strip() or "720p"

    async with DecartClient(api_key=api_key) as client:
        with open(person_path, "rb") as person_f, open(garment_path, "rb") as garment_f:
            result = await client.process(
                {
                    "model": models.image("lucy-image-2"),
                    "prompt": PROMPT,
                    "data": person_f,
                    "reference_image": garment_f,
                    "resolution": resolution,
                }
            )

    _write_result(output_path, result)


def main_cli() -> int:
    parser = argparse.ArgumentParser(description="Decart image try-on (person + garment -> output image)")
    parser.add_argument("person_image_path", help="Full-body or upper-body person photo")
    parser.add_argument("garment_image_path", help="Garment / clothing reference image")
    parser.add_argument("output_image_path", help="Where to write PNG (or other) result")
    args = parser.parse_args()

    api_key = os.environ.get("DECART_API_KEY", "").strip()
    if not api_key:
        print("DECART_API_KEY environment variable is required.", file=sys.stderr)
        return 1

    try:
        asyncio.run(
            run_photo_edit(
                args.person_image_path,
                args.garment_image_path,
                args.output_image_path,
                api_key=api_key,
            )
        )
    except Exception as exc:
        print(f"{type(exc).__name__}: {exc}", file=sys.stderr)
        return 1

    if not Path(args.output_image_path).is_file():
        print("Pipeline finished but output file was not created.", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main_cli())
