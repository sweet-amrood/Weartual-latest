import { createDecartClient, models } from "@decartai/sdk";
import { API_URL } from "../config/api";
import { sanitizePublicErrorMessage } from "../lib/publicErrorMessage";

const DEFAULT_MODEL = import.meta.env.VITE_DECART_REALTIME_MODEL || "lucy-vton-2";

const LIVE_MIRROR =
  import.meta.env.VITE_DECART_LIVE_MIRROR === "true"
    ? true
    : import.meta.env.VITE_DECART_LIVE_MIRROR === "false"
      ? false
      : "auto";

/** Always sent as the reference image (Garment Image in studio). */
const PROMPT_GARMENT_LIVE =
  "Virtual try-on: replace only the upper-body garment of the person in the live camera video with the exact garment shown in the reference image. " +
  "Keep face, hair, skin, body shape, pose, and background unchanged. " +
  "Use only the provided reference garment — do not invent different clothing.";

const PROMPT_ACCESSORY_EXTRA_DEFAULT =
  "add realistic glasses, a watch, a hat, or a cap on the person without changing the garment.";

export function getAccessoryDefaultPrompt() {
  const fromEnv = String(import.meta.env.VITE_DECART_VTON_PROMPT ?? "").trim();
  return fromEnv || PROMPT_ACCESSORY_EXTRA_DEFAULT;
}

/** Single prompt string: garment VTON + optional accessory text (must not use setPrompt — it drops the garment). */
function buildCombinedLivePrompt(userPrompt) {
  const extra = String(userPrompt ?? "").trim() || getAccessoryDefaultPrompt();
  return (
    PROMPT_GARMENT_LIVE +
    " Keep the exact garment from the reference image at all times. " +
    "Additionally, without replacing or removing that garment, " +
    extra
  );
}

/**
 * @param {{
 *   accessoryMode?: boolean,
 *   prompt?: string,
 *   enhance?: boolean,
 *   garmentImage?: File | Blob | null
 * }} input
 */
export function resolveLiveRealtimeConfig(input = {}) {
  const garmentImage = input.garmentImage ?? null;
  const accessoryMode = input.accessoryMode === true;
  const prompt = accessoryMode ? buildCombinedLivePrompt(input.prompt) : PROMPT_GARMENT_LIVE;

  return {
    garmentImage,
    accessoryMode,
    prompt,
    /** Always false when a garment reference image is used — enhance rewrites away the VTON instructions. */
    enhance: false
  };
}

/**
 * One atomic set(): garment reference image + prompt (accessories merged into the same prompt).
 */
export async function applyLiveRealtimeSet(realtimeClient, config = {}) {
  const { garmentImage, accessoryMode, prompt, enhance } = resolveLiveRealtimeConfig(config);

  if (!realtimeClient?.set) {
    throw new Error("Live session is not ready. Connect the camera first.");
  }
  if (!garmentImage) {
    throw new Error("Upload a garment in the Garment Image section first.");
  }

  await realtimeClient.set({
    prompt,
    enhance,
    image: garmentImage
  });

  return { prompt, enhance, hasImage: true, accessoryMode };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function formatLiveSessionDuration(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  if (s < 60) return `${s} second${s === 1 ? "" : "s"}`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (r === 0) return `${m} minute${m === 1 ? "" : "s"}`;
  return `${m} minute${m === 1 ? "" : "s"} ${r} second${r === 1 ? "" : "s"}`;
}

const MAX_TOKEN_CONNECT_ATTEMPTS = Math.min(
  16,
  Math.max(3, Number.parseInt(String(import.meta.env.VITE_DECART_LIVE_MAX_KEY_ATTEMPTS || "12"), 10) || 12)
);

const MAX_MID_SESSION_ROTATIONS = Math.min(
  24,
  Math.max(4, Number.parseInt(String(import.meta.env.VITE_DECART_LIVE_MAX_MID_ROTATIONS || "16"), 10) || 16)
);

export function isDecartQuotaOrCreditError(err) {
  if (err == null) return false;
  const msg = String(err.message ?? err).toLowerCase();
  const code = typeof err.code === "string" ? err.code.toLowerCase() : "";
  if (code === "token_create_error") return true;
  const hints = [
    "insufficient credit",
    "not enough credit",
    "credit limit",
    "out of credit",
    "quota",
    "exceeds your",
    "billing",
    "402",
    "429",
    "payment required",
    "balance",
    "rate limit",
    "usage limit",
    "limit exceeded",
    "account suspended",
    "payment",
    "funds"
  ];
  return hints.some((h) => msg.includes(h));
}

export async function resolveDecartRealtimeApiKey() {
  const res = await fetch(`${API_URL}/api/decart/realtime-token`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const vite = String(import.meta.env.VITE_DECART_API_KEY || "").trim();
    if (vite) {
      return { apiKey: vite, modelId: DEFAULT_MODEL };
    }
    throw new Error(sanitizePublicErrorMessage(data.message || "Could not start a live session. Please sign in and try again."));
  }
  const apiKey = data.apiKey;
  if (!apiKey) throw new Error("Live session could not be started. Please try again.");
  const modelId = typeof data.modelId === "string" && data.modelId.trim() ? data.modelId.trim() : DEFAULT_MODEL;
  return { apiKey, modelId };
}

async function connectAndSetWithToken(stream, liveConfig, modelIdOverride, onRemoteStream) {
  const { apiKey, modelId } = await resolveDecartRealtimeApiKey();
  const model = models.realtime(modelIdOverride || modelId);
  const client = createDecartClient({ apiKey });
  const resolved = resolveLiveRealtimeConfig(liveConfig);

  if (import.meta.env.DEV) {
    console.info("[decart-live] set()", {
      accessoryMode: resolved.accessoryMode,
      enhance: resolved.enhance,
      garmentImageName: liveConfig.garmentImage?.name,
      promptLength: resolved.prompt?.length
    });
  }

  const realtimeClient = await client.realtime.connect(stream, {
    model,
    mirror: LIVE_MIRROR,
    onRemoteStream
  });

  await sleep(700);
  await applyLiveRealtimeSet(realtimeClient, liveConfig);
  return realtimeClient;
}

/**
 * @param {object} opts
 * @param {{ accessoryMode?: boolean, prompt?: string, enhance?: boolean, garmentImage?: File | null }} opts.liveConfig
 */
export async function connectDecartVirtualTryOn({
  sessionRef,
  liveConfig,
  onRemoteStream,
  onLocalStream,
  onGenerationTick,
  onSessionEnd,
  modelId: modelIdOpt
}) {
  const modelIdFinal = modelIdOpt || DEFAULT_MODEL;
  const model = models.realtime(modelIdFinal);
  const resolved = resolveLiveRealtimeConfig(liveConfig);

  if (!resolved.garmentImage) {
    throw new Error("Upload a garment in the Garment Image section before connecting live try-on.");
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "user" },
        frameRate: { ideal: model.fps, max: 30 },
        width: { ideal: model.width, min: 320, max: 1920 },
        height: { ideal: model.height, min: 240, max: 1080 }
      }
    });
  } catch (err) {
    const name = err?.name || "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      throw new Error("Camera permission was denied. Allow camera access for this site and try again.");
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      throw new Error("No camera was found on this device.");
    }
    if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
      throw new Error(
        "Camera does not support the requested settings. Try closing other apps that use the camera, or use another browser."
      );
    }
    throw err;
  }

  if (!sessionRef?.current) sessionRef.current = {};
  sessionRef.current.inputStream = stream;
  onLocalStream?.(stream);

  let disposed = false;
  let midSessionRotations = 0;
  let accumulatedGenerationSeconds = 0;
  let currentConnectionSeconds = 0;
  const sessionStartedAt = Date.now();
  const listenerCleanups = [];

  const flushGenerationToAccumulated = () => {
    accumulatedGenerationSeconds += currentConnectionSeconds;
    currentConnectionSeconds = 0;
  };

  const getTotalGenerationSeconds = () => accumulatedGenerationSeconds + currentConnectionSeconds;

  const emitSessionEnd = () => {
    const generationSeconds = getTotalGenerationSeconds();
    const wallSeconds = Math.max(0, Math.round((Date.now() - sessionStartedAt) / 1000));
    onSessionEnd?.({ generationSeconds, wallSeconds });
  };

  const clearListeners = () => {
    while (listenerCleanups.length) {
      const fn = listenerCleanups.pop();
      try {
        fn();
      } catch {
        // ignore
      }
    }
  };

  const disconnectRealtimeOnly = () => {
    clearListeners();
    try {
      sessionRef.current?.realtimeClient?.disconnect?.();
    } catch {
      // ignore
    }
    if (sessionRef.current) sessionRef.current.realtimeClient = null;
  };

  const attachRtc = (rtc, scheduleRotateFn) => {
    sessionRef.current.realtimeClient = rtc;
    const tickHandler = ({ seconds }) => {
      if (disposed) return;
      currentConnectionSeconds = Math.max(currentConnectionSeconds, Number(seconds) || 0);
      onGenerationTick?.({
        seconds: currentConnectionSeconds,
        totalSeconds: getTotalGenerationSeconds()
      });
    };
    rtc.on?.("generationTick", tickHandler);
    listenerCleanups.push(() => {
      try {
        rtc.off?.("generationTick", tickHandler);
      } catch {
        // ignore
      }
    });
    const errorHandler = (e) => {
      if (disposed) return;
      if (!isDecartQuotaOrCreditError(e)) return;
      void scheduleRotateFn(`error:${e?.message || e?.code || ""}`);
    };
    rtc.on?.("error", errorHandler);
    listenerCleanups.push(() => {
      try {
        rtc.off?.("error", errorHandler);
      } catch {
        // ignore
      }
    });
  };

  let rotateChain = Promise.resolve();

  const scheduleRotate = (reason) => {
    rotateChain = rotateChain
      .then(async () => {
        if (disposed) return;
        if (midSessionRotations >= MAX_MID_SESSION_ROTATIONS) {
          if (import.meta.env.DEV) {
            console.warn("[decart-live] max mid-session rotations reached", reason);
          }
          return;
        }
        midSessionRotations += 1;
        flushGenerationToAccumulated();
        disconnectRealtimeOnly();

        let lastErr;
        for (let i = 0; i < MAX_TOKEN_CONNECT_ATTEMPTS; i += 1) {
          if (disposed) return;
          try {
            const rtc = await connectAndSetWithToken(stream, liveConfig, modelIdOpt, onRemoteStream);
            if (disposed) {
              try {
                rtc.disconnect?.();
              } catch {
                // ignore
              }
              return;
            }
            attachRtc(rtc, scheduleRotate);
            return;
          } catch (e) {
            lastErr = e;
            if (!isDecartQuotaOrCreditError(e)) {
              midSessionRotations -= 1;
              if (import.meta.env.DEV) {
                console.error("[decart-live] mid-session rekey non-credit failure", e);
              }
              return;
            }
            await sleep(180 * (i + 1));
          }
        }
        midSessionRotations -= 1;
        if (import.meta.env.DEV && lastErr) {
          console.warn("[decart-live] mid-session rekey exhausted attempts", lastErr);
        }
      })
      .catch((e) => {
        if (import.meta.env.DEV) {
          console.warn("[decart-live] rotation chain error", e);
        }
      });
    return rotateChain;
  };

  let lastInitialErr;
  for (let i = 0; i < MAX_TOKEN_CONNECT_ATTEMPTS; i += 1) {
    if (disposed) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error("Aborted");
    }
    try {
      const rtc = await connectAndSetWithToken(stream, liveConfig, modelIdOpt, onRemoteStream);
      attachRtc(rtc, scheduleRotate);

      const disposeRotation = () => {
        if (disposed) return;
        disposed = true;
        emitSessionEnd();
        disconnectRealtimeOnly();
      };
      sessionRef.current.disposeRotation = disposeRotation;

      return { inputStream: stream, disposeRotation };
    } catch (e) {
      lastInitialErr = e;
      if (!isDecartQuotaOrCreditError(e)) {
        disconnectRealtimeOnly();
        stream.getTracks().forEach((t) => t.stop());
        throw e;
      }
      await sleep(200 * (i + 1));
    }
  }

  disconnectRealtimeOnly();
  stream.getTracks().forEach((t) => t.stop());
  throw new Error(sanitizePublicErrorMessage(lastInitialErr?.message || "Live try-on could not be started. Please try again."));
}
