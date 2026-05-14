import { createDecartClient, models } from "@decartai/sdk";
import { API_URL } from "../config/api";
import { sanitizePublicErrorMessage } from "../lib/publicErrorMessage";

const DEFAULT_MODEL = import.meta.env.VITE_DECART_REALTIME_MODEL || "lucy-vton-2";

/** Default prompt for Lucy VTON realtime garment transfer. */
export const LIVE_VTON_PROMPT =
  import.meta.env.VITE_DECART_VTON_PROMPT ||
  "Virtual try-on: realistically dress the person in the reference garment. Preserve identity, pose, and lighting where possible.";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MAX_TOKEN_CONNECT_ATTEMPTS = Math.min(
  16,
  Math.max(3, Number.parseInt(String(import.meta.env.VITE_DECART_LIVE_MAX_KEY_ATTEMPTS || "12"), 10) || 12)
);

const MAX_MID_SESSION_ROTATIONS = Math.min(
  24,
  Math.max(4, Number.parseInt(String(import.meta.env.VITE_DECART_LIVE_MAX_MID_ROTATIONS || "16"), 10) || 16)
);

/**
 * True if the error likely indicates quota / credits / billing so another API key may work.
 */
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

/**
 * Prefer a short-lived token from our API (server rotates keys until one mints a token).
 * Falls back to VITE_DECART_API_KEY only when the token request fails (e.g. local dev without login).
 */
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

async function connectAndSetWithToken(stream, garmentFile, modelIdOverride, onRemoteStream) {
  const { apiKey, modelId } = await resolveDecartRealtimeApiKey();
  const model = models.realtime(modelIdOverride || modelId);
  const client = createDecartClient({ apiKey });
  const realtimeClient = await client.realtime.connect(stream, {
    model,
    onRemoteStream
  });
  await realtimeClient.set({
    prompt: LIVE_VTON_PROMPT,
    enhance: true,
    image: garmentFile
  });
  return realtimeClient;
}

/**
 * WebRTC live virtual try-on with API key rotation:
 * - Retries connect+set on credit/quota-style failures (new token / shuffled server keys each attempt).
 * - Subscribes to `error` on the realtime client; on credit-like errors, disconnects and reconnects with a fresh token.
 *
 * @param {object} opts
 * @param {{ current: { inputStream?: MediaStream | null; realtimeClient?: unknown | null; disposeRotation?: (() => void) | null }}} opts.sessionRef
 * @param {File} opts.garmentFile
 * @param {(stream: MediaStream) => void} [opts.onRemoteStream]
 * @param {(stream: MediaStream) => void} [opts.onLocalStream]
 * @param {string} [opts.modelId]
 * @returns {{ inputStream: MediaStream, disposeRotation: () => void }}
 */
export async function connectDecartVirtualTryOn({ sessionRef, garmentFile, onRemoteStream, onLocalStream, modelId: modelIdOpt }) {
  const modelIdFinal = modelIdOpt || DEFAULT_MODEL;
  const model = models.realtime(modelIdFinal);

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
  /** @type {(() => void)[]} */
  const listenerCleanups = [];

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
        disconnectRealtimeOnly();

        let lastErr;
        for (let i = 0; i < MAX_TOKEN_CONNECT_ATTEMPTS; i += 1) {
          if (disposed) return;
          try {
            const rtc = await connectAndSetWithToken(stream, garmentFile, modelIdOpt, onRemoteStream);
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
      const rtc = await connectAndSetWithToken(stream, garmentFile, modelIdOpt, onRemoteStream);
      attachRtc(rtc, scheduleRotate);

      const disposeRotation = () => {
        disposed = true;
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
