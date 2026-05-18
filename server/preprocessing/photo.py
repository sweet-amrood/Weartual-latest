"""
Decart image try-on: person image + garment reference -> edited image (PNG).
CLI: python photo.py <person_image_path> <garment_image_path> <output_image_path>
Requires: DECART_API_KEY in the environment.
"""
import argparse
import asyncio
import hashlib
import logging
import os
import sys
from pathlib import Path

import cv2
from decart import DecartClient, models

logging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stderr)
logger = logging.getLogger(__name__)

PROMPT = (
    "replace only the upper-body garment of the input image with the reference image."
)


def prepare_reference_image(source_path: str) -> str:
    """Resize and re-encode the garment reference so Decart receives a predictable upload."""
    image = cv2.imread(source_path)
    if image is None:
        raise FileNotFoundError(f"Could not read reference image: {source_path}")

    height, width = image.shape[:2]
    max_side = max(width, height)
    target_max_side = 512
    if max_side > target_max_side:
        scale = target_max_side / max_side
        resized_width = int(width * scale)
        resized_height = int(height * scale)
        image = cv2.resize(image, (resized_width, resized_height), interpolation=cv2.INTER_AREA)

    temp_path = str(Path(source_path).with_name(f"{Path(source_path).stem}_prepared.jpg"))
    cv2.imwrite(temp_path, image, [cv2.IMWRITE_JPEG_QUALITY, 92])
    return temp_path


def _file_digest(path: str) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()[:16]


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

    if _file_digest(person_path) == _file_digest(garment_path):
        raise ValueError("Person and garment files are identical; upload two different images.")

    prepared_garment = prepare_reference_image(garment_path)
    resolution = os.environ.get("DECART_IMAGE_RESOLUTION", "720p").strip() or "720p"

    logger.info(
        "[decart-photo] person=%s (%s bytes sha=%s) garment=%s prepared=%s (%s bytes sha=%s)",
        person_path,
        Path(person_path).stat().st_size,
        _file_digest(person_path),
        garment_path,
        prepared_garment,
        Path(prepared_garment).stat().st_size,
        _file_digest(prepared_garment),
    )

    try:
        async with DecartClient(api_key=api_key) as client:
            result = await client.process(
                {
                    "model": models.image("lucy-image-2"),
                    "prompt": PROMPT,
                    "data": person_path,
                    "reference_image": prepared_garment,
                    "resolution": resolution,
                    "enhance_prompt": True,
                }
            )

        _write_result(output_path, result)

        if Path(output_path).is_file():
            out_same_as_person = _file_digest(output_path) == _file_digest(person_path)
            logger.info(
                "[decart-photo] output=%s (%s bytes sha=%s identical_to_person=%s)",
                output_path,
                Path(output_path).stat().st_size,
                _file_digest(output_path),
                out_same_as_person,
            )
            if out_same_as_person:
                logger.warning("[decart-photo] output bytes match person input — garment may not have been applied")
    finally:
        if prepared_garment != garment_path:
            Path(prepared_garment).unlink(missing_ok=True)


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
