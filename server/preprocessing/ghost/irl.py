import argparse
import asyncio
import logging
import os
import sys
from pathlib import Path
from contextlib import suppress

import cv2
from aiortc.mediastreams import MediaStreamError
from aiortc.contrib.media import MediaPlayer
from decart import DecartClient, models
from decart.realtime import RealtimeClient, RealtimeConnectOptions
from decart.types import ModelState, Prompt

# -------------------------------
# STORE OUTPUT FRAMES
# -------------------------------
processed_frames = []
logger = logging.getLogger(__name__)

WAIT_FOR_OUTPUT_SECONDS = 30
remote_stream_done = asyncio.Event()
PRESERVE_INPUT_RESOLUTION = True
CODEC_CANDIDATES = ("mp4v",)


def create_video_writer(path, fps, size):
    """Create a writer using the best available codec."""
    for codec in CODEC_CANDIDATES:
        fourcc = cv2.VideoWriter_fourcc(*codec)
        writer = cv2.VideoWriter(path, fourcc, fps, size)
        if writer.isOpened():
            logger.warning("Using output codec: %s", codec)
            return writer
        writer.release()
    raise RuntimeError(f"Could not open output video writer with codecs: {CODEC_CANDIDATES}")


def prepare_reference_image(source_path: str) -> str:
    """Resize and re-encode the reference image to keep the upload small and predictable."""
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


async def collect_remote_frames(track):
    """Drain the remote video track into OpenCV-friendly BGR frames."""
    logger.info("Remote stream attached; collecting output frames (kind=%s)", getattr(track, "kind", "unknown"))
    try:
        while True:
            frame = await track.recv()
            processed_frames.append(frame.to_ndarray(format="bgr24"))
    except Exception as exc:
        if isinstance(exc, MediaStreamError):
            logger.info("Remote frame stream ended normally")
        else:
            logger.warning("Remote frame collection stopped: %s (%s)", type(exc).__name__, repr(exc))
    finally:
        remote_stream_done.set()


def handle_stream(transformed_stream):
    """
    This is where Decart returns processed frames.
    We MUST store them for video writing.
    """
    kind = getattr(transformed_stream, "kind", "unknown")
    logger.info("on_remote_stream callback fired (kind=%s)", kind)
    if kind != "video":
        logger.info("Ignoring non-video remote track: %s", kind)
        return
    asyncio.create_task(collect_remote_frames(transformed_stream))


async def wait_for_connection(client, timeout=15.0):
    """Wait until the realtime client is connected or fails fast on disconnect."""
    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout

    while loop.time() < deadline:
        state = client.get_connection_state()
        if state in ("connected", "generating"):
            return
        if state == "disconnected":
            raise RuntimeError("Realtime client disconnected before the first frame was sent")
        await asyncio.sleep(0.1)

    raise TimeoutError("Timed out waiting for realtime connection")


async def connect_with_reference_image(client, model, track, reference_image_path):
    """Try initial-image connect first, then fall back to applying the image after connect."""
    prompt_text = (
        "Apply the upper clothing style from the reference image to the person in the video. Keep face, body shape, pose, camera angle, and background unchanged."
    )

    base_options = dict(
        model=model,
        on_remote_stream=handle_stream,
    )

    try:
        return await RealtimeClient.connect(
            base_url=client.base_url,
            api_key=client.api_key,
            local_track=track,
            options=RealtimeConnectOptions(
                **base_options,
                initial_state=ModelState(
                    image=reference_image_path,
                    prompt=Prompt(text=prompt_text),
                ),
            ),
        ), True
    except Exception as exc:
        logger.warning("Initial-image connect failed: %s; retrying without initial image", exc)
        fallback_client = await RealtimeClient.connect(
            base_url=client.base_url,
            api_key=client.api_key,
            local_track=track,
            options=RealtimeConnectOptions(
                **base_options,
                initial_state=ModelState(
                    prompt=Prompt(text=prompt_text),
                ),
            ),
        )
        await fallback_client.set_image(reference_image_path, prompt=prompt_text, enhance=True)
        return fallback_client, False


async def run_pipeline(video_path: str, reference_image_path: str, output_path: str, *, api_key: str) -> None:
    """
    Process input video with Decart realtime using reference_image_path as garment/style reference.
    Writes processed video to output_path.
    """
    remote_stream_done.clear()
    processed_frames.clear()

    video_path = str(Path(video_path).resolve())
    reference_image_path = str(Path(reference_image_path).resolve())
    output_path = str(Path(output_path).resolve())
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    model = models.realtime("lucy-2.1-vton")
    client = DecartClient(api_key=api_key)

    if not Path(reference_image_path).exists():
        raise FileNotFoundError(f"Could not open reference image: {reference_image_path}")
    if not Path(video_path).exists():
        raise FileNotFoundError(f"Could not open input video: {video_path}")

    prepared_reference_image = prepare_reference_image(reference_image_path)
    if prepared_reference_image != reference_image_path:
        logger.warning("Prepared reference image: %s", prepared_reference_image)

    player = MediaPlayer(video_path)

    realtime_client, used_initial_image = await connect_with_reference_image(
        client,
        model,
        player.video,
        prepared_reference_image,
    )

    realtime_client.on("connection_change", lambda state: logger.info("connection state: %s", state))
    realtime_client.on("error", lambda error: logger.error("realtime error: %s", error))

    await wait_for_connection(realtime_client)

    if not used_initial_image:
        logger.warning("Reference image was applied after connect due to initial-image handshake failure")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise FileNotFoundError(f"Could not open input video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    input_frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    if fps == 0:
        fps = 25  # fallback fix (IMPORTANT)

    out = None
    try:
        loop = asyncio.get_running_loop()
        deadline = loop.time() + WAIT_FOR_OUTPUT_SECONDS
        while not processed_frames and loop.time() < deadline:
            await asyncio.sleep(0.25)

        if not processed_frames:
            raise RuntimeError(
                "Decart did not return any generated frames. The input video track may not be reaching the model."
            )

        remaining = max(1.0, deadline - loop.time())
        with suppress(asyncio.TimeoutError):
            await asyncio.wait_for(remote_stream_done.wait(), timeout=remaining)

        generated_height, generated_width = processed_frames[0].shape[:2]
        if PRESERVE_INPUT_RESOLUTION:
            output_width, output_height = width, height
        else:
            output_width, output_height = generated_width, generated_height

        out = create_video_writer(output_path, fps, (output_width, output_height))

        target_frame_count = input_frame_count if input_frame_count > 0 else len(processed_frames)
        if target_frame_count <= 0:
            raise RuntimeError("Input video has no frames")

        if target_frame_count != len(processed_frames):
            logger.warning(
                "Resampling generated frames from %s to %s to preserve full video duration",
                len(processed_frames),
                target_frame_count,
            )
            frames_to_write = []
            generated_count = len(processed_frames)
            for i in range(target_frame_count):
                src_index = int(i * generated_count / target_frame_count)
                if src_index >= generated_count:
                    src_index = generated_count - 1
                frames_to_write.append(processed_frames[src_index])
        else:
            frames_to_write = processed_frames

        for frame in frames_to_write:
            if frame.shape[1] != output_width or frame.shape[0] != output_height:
                upscale = output_width > frame.shape[1] or output_height > frame.shape[0]
                interpolation = cv2.INTER_LANCZOS4 if upscale else cv2.INTER_AREA
                frame = cv2.resize(frame, (output_width, output_height), interpolation=interpolation)
            out.write(frame)

        logger.warning("Wrote %s frames to %s", len(frames_to_write), output_path)
    finally:
        cap.release()
        with suppress(Exception):
            player.stop()
        if out is not None:
            out.release()

        with suppress(Exception):
            await realtime_client.disconnect()

    if prepared_reference_image != reference_image_path:
        with suppress(Exception):
            Path(prepared_reference_image).unlink(missing_ok=True)


def main_cli() -> int:
    parser = argparse.ArgumentParser(description="Decart IRL: video + reference garment image -> output video")
    parser.add_argument("video_path", help="Input video file path")
    parser.add_argument("reference_image_path", help="Garment / style reference image path")
    parser.add_argument("output_path", help="Output MP4 path")
    args = parser.parse_args()

    api_key = os.environ.get("DECART_API_KEY", "").strip()
    if not api_key:
        print("DECART_API_KEY environment variable is required.", file=sys.stderr)
        return 1

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    try:
        asyncio.run(
            run_pipeline(
                args.video_path,
                args.reference_image_path,
                args.output_path,
                api_key=api_key,
            )
        )
    except Exception as exc:
        print(f"{type(exc).__name__}: {exc}", file=sys.stderr)
        return 1

    if not Path(args.output_path).is_file():
        print("Pipeline finished but output file was not created.", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main_cli())
