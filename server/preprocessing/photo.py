"""
Decart image try-on: person image + garment reference -> edited image (PNG).
Ghost mannequin runs separately in Node (ghostGarment.service) before this script.
CLI: python photo.py <person_image_path> <garment_image_path> <output_image_path>
"""
import argparse
import asyncio
import hashlib
import logging
import os
import sys
import time
from pathlib import Path

import cv2
from decart import DecartClient, models

logging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stderr)
logger = logging.getLogger(__name__)

PROMPT = (
    "replace only the upper-body garment of the input image with the reference image."
)


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() not in ("0", "false", "no", "off")


def _fast_mode() -> bool:
    return _env_bool("IMAGE_TRYON_FAST", False)


def _resolution() -> str:
    if _fast_mode():
        return "480p"
    return (os.environ.get("DECART_IMAGE_RESOLUTION", "720p").strip() or "720p")


def _enhance_prompt() -> bool:
    if _fast_mode():
        return False
    return _env_bool("DECART_ENHANCE_PROMPT", True)


def _max_side(env_name: str, *, fast_default: int, default: int) -> int:
    if _fast_mode():
        return fast_default
    raw = os.environ.get(env_name, "").strip()
    if not raw:
        return default
    try:
        return max(256, int(raw))
    except ValueError:
        return default


def prepare_input_image(source_path: str, *, max_side: int, suffix: str) -> str:
    """Downscale/re-encode before API upload to reduce latency."""
    image = cv2.imread(source_path)
    if image is None:
        raise FileNotFoundError(f"Could not read image: {source_path}")

    height, width = image.shape[:2]
    longest = max(width, height)
    if longest > max_side:
        scale = max_side / longest
        image = cv2.resize(
            image,
            (int(width * scale), int(height * scale)),
            interpolation=cv2.INTER_AREA,
        )

    out_path = str(Path(source_path).with_name(f"{Path(source_path).stem}_{suffix}.jpg"))
    cv2.imwrite(out_path, image, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return out_path


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

    temp_paths: list[str] = []
    try:
        person_max = _max_side("DECART_PERSON_MAX_SIDE", fast_default=640, default=768)
        garment_max = _max_side("DECART_GARMENT_MAX_SIDE", fast_default=384, default=512)

        prepared_person = prepare_input_image(person_path, max_side=person_max, suffix="prep_person")
        prepared_garment = prepare_input_image(garment_path, max_side=garment_max, suffix="prep_garment")
        temp_paths.extend([prepared_person, prepared_garment])

        resolution = _resolution()
        enhance = _enhance_prompt()

        logger.info(
            "[photo] decart start resolution=%s enhance=%s person=%s garment=%s",
            resolution,
            enhance,
            prepared_person,
            prepared_garment,
        )

        decart_t0 = time.perf_counter()
        async with DecartClient(api_key=api_key) as client:
            result = await client.process(
                {
                    "model": models.image("lucy-image-2"),
                    "prompt": PROMPT,
                    "data": prepared_person,
                    "reference_image": prepared_garment,
                    "resolution": resolution,
                    "enhance_prompt": enhance,
                }
            )

        logger.info("[photo] decart done %.1fs", time.perf_counter() - decart_t0)
        _write_result(output_path, result)

        if Path(output_path).is_file():
            logger.info(
                "[photo] output %s (%s bytes)",
                output_path,
                Path(output_path).stat().st_size,
            )
    finally:
        for p in temp_paths:
            if p and p not in (person_path, garment_path, output_path):
                Path(p).unlink(missing_ok=True)


def main_cli() -> int:
    parser = argparse.ArgumentParser(description="Decart image try-on (person + garment -> output)")
    parser.add_argument("person_image_path")
    parser.add_argument("garment_image_path")
    parser.add_argument("output_image_path")
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
