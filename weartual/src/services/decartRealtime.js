import { createDecartClient, models } from "@decartai/sdk";
import { API_URL } from "../config/api";

const DEFAULT_MODEL = import.meta.env.VITE_DECART_REALTIME_MODEL || "lucy-vton-2";

/** Default prompt for Lucy VTON realtime garment transfer. */
export const LIVE_VTON_PROMPT =
  import.meta.env.VITE_DECART_VTON_PROMPT ||
  "Virtual try-on: realistically dress the person in the reference garment. Preserve identity, pose, and lighting where possible.";

/**
 * Prefer a short-lived token from our API (uses server Decart keys).
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
    throw new Error(data.message || `Could not start Decart session (${res.status}). Sign in or configure Decart on the server.`);
  }
  const apiKey = data.apiKey;
  if (!apiKey) throw new Error("Invalid Decart token response from server.");
  const modelId = typeof data.modelId === "string" && data.modelId.trim() ? data.modelId.trim() : DEFAULT_MODEL;
  return { apiKey, modelId };
}

/**
 * WebRTC live virtual try-on: camera in, transformed stream out.
 * @returns {{ inputStream: MediaStream, realtimeClient: { disconnect: () => void, set: (i: unknown) => Promise<void> } }}
 */
export async function connectDecartVirtualTryOn({ garmentFile, onRemoteStream, modelId: modelIdOpt }) {
  const { apiKey, modelId: modelIdResolved } = await resolveDecartRealtimeApiKey();
  const modelId = modelIdOpt || modelIdResolved;
  const model = models.realtime(modelId);

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: {
      frameRate: model.fps,
      width: model.width,
      height: model.height
    }
  });

  const client = createDecartClient({ apiKey });
  let realtimeClient;
  try {
    realtimeClient = await client.realtime.connect(stream, {
      model,
      onRemoteStream
    });
  } catch (err) {
    stream.getTracks().forEach((t) => t.stop());
    throw err;
  }

  await realtimeClient.set({
    prompt: LIVE_VTON_PROMPT,
    enhance: true,
    image: garmentFile
  });

  return { inputStream: stream, realtimeClient };
}
