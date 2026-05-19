import React, { useMemo, useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { listDatasetSamples, uploadMyImage, deleteMyImage, deleteMyImageByResultUrl } from "../services/imageApi";
import {
  Sparkles,
  Trash2,
  Download,
  Maximize2,
  Minimize2,
  X,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  Star,
  Link2,
  Code2,
  Terminal,
  Layers,
  Cpu,
  Box,
  Wand2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Image as LucideImage,
  Video,
  Camera,
  Info
} from "lucide-react";
import StyleInsightsPanel from "../components/StyleInsightsPanel";
import {
  addOutfitHistoryEntry,
  getAuthenticatedUserId,
  getOutfitRating,
  removeOutfitHistoryEntryByJobId,
  removeOutfitHistoryEntriesWithImageUrl,
  removeOutfitRatingByOutfitId,
  saveOutfitRating
} from "../services/outfitHistory";
import { sanitizePublicErrorMessage } from "../lib/publicErrorMessage";
import { connectDecartVirtualTryOn, formatLiveSessionDuration } from "../services/decartRealtime";
import { useTheme } from "../context/ThemeContext.jsx";

const PERSON_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PERSON_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const GARMENT_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PERSON_MAX_BYTES = 100 * 1024 * 1024;
const GARMENT_MAX_BYTES = 10 * 1024 * 1024;
const AI_PROGRESS_STAGES = ["Detecting pose...", "Applying cloth...", "Refining output..."];
/** Same files as `public/dataset/cloth/` (used when API has no cloth samples). */
const LOCAL_CLOTH_DATASET = Array.from({ length: 8 }, (_, i) => `/dataset/cloth/${String(i + 1).padStart(2, "0")}.jpg`);

/** When `/api/images/samples` is empty (no Viton folders on the API host), load thumbnails from `public/dataset/`. */
const staticUiDatasetSamples = (type) => {
  if (typeof window === "undefined") return [];
  const folder = type === "image" ? "image" : "cloth";
  const origin = window.location.origin;
  return Array.from({ length: 8 }, (_, i) => {
    const name = `${String(i + 1).padStart(2, "0")}.jpg`;
    return { fileName: name, url: `${origin}/dataset/${folder}/${name}` };
  });
};

const VIDEO_NAME_RE = /\.(mp4|webm|mov|m4v)$/i;
const IMAGE_NAME_RE = /\.(jpe?g|png|webp)$/i;

const FS_ZOOM_MIN = 0.5;
const FS_ZOOM_MAX = 3;
const FS_ZOOM_STEP = 0.25;

/** Matches server / client copy for try-on when not authenticated. */
const AUTH_TRY_ON_ERROR_RE = /please create an account or log in to use try-on generation/i;
const SESSION_EXPIRED_ERROR_RE = /session expired/i;

/** Floating “tool collection” chips — Antigravity-style hero dock (positions %, parallax multiplier, animation delay). */
const HERO_DOCK_ITEMS = [
  { Icon: Sparkles, top: "10%", left: "6%", delay: "0s", mul: 0.42 },
  { Icon: Code2, top: "14%", right: "10%", delay: "0.4s", mul: -0.38 },
  { Icon: Terminal, top: "62%", left: "4%", delay: "0.9s", mul: 0.5 },
  { Icon: Layers, top: "58%", right: "6%", delay: "1.1s", mul: -0.32 },
  { Icon: Cpu, top: "8%", left: "44%", delay: "0.2s", mul: 0.28 },
  { Icon: Box, top: "72%", left: "38%", delay: "1.4s", mul: 0.36 },
  { Icon: Wand2, top: "22%", right: "28%", delay: "0.65s", mul: -0.44 }
];

/** Prefer <video> when API mis-labels OpenCV MP4 as image, or URL is clearly Cloudinary video delivery. */
const inferResultIsVideo = (job) => {
  if (!job) return false;
  if (job.resultType === "video") return true;
  if (VIDEO_NAME_RE.test(job.resultFilename || "")) return true;
  if (/\/video\/upload\//.test(job.resultUrl || "")) return true;
  return false;
};

export default function TryOnStudio({ user, authLoading = false, onSessionExpired }) {
  const reduceMotion = useReducedMotion();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [personFile, setPersonFile] = useState(null);
  const [garmentFile, setGarmentFile] = useState(null);
  const [personPreview, setPersonPreview] = useState(null);
  const [garmentPreview, setGarmentPreview] = useState(null);
  const [personMediaType, setPersonMediaType] = useState("image");
  /** Person source: file image, file video, or webcam capture (live). */
  const [personInputMode, setPersonInputMode] = useState("image");
  const [liveCameraActive, setLiveCameraActive] = useState(false);
  const [liveCameraError, setLiveCameraError] = useState("");
  /** Decart generationTick total (billing-oriented seconds while connected). */
  const [liveGenerationSeconds, setLiveGenerationSeconds] = useState(0);
  /** Shown after disconnect with how long the live session ran. */
  const [liveSessionSummary, setLiveSessionSummary] = useState("");
  const liveVideoRef = useRef(null);
  /** Wrapper for browser fullscreen on the live try-on preview. */
  const liveFeedFsRef = useRef(null);
  const [isLiveFeedFullscreen, setIsLiveFeedFullscreen] = useState(false);
  /** Live try-on WebRTC session (camera stream + realtime client; dispose stops listeners). */
  const liveTryOnSessionRef = useRef({ inputStream: null, realtimeClient: null, disposeRotation: null });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  /** After first Generate, show centered output + loading/result. */
  const [showOutputSection, setShowOutputSection] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [resultMediaType, setResultMediaType] = useState("image");
  const [resultFilename, setResultFilename] = useState("weartual-sys-output.jpg");
  const [personSamples, setPersonSamples] = useState([]);
  const [clothSamples, setClothSamples] = useState([]);
  const [heroGlow, setHeroGlow] = useState({ x: 50, y: 50 });
  /** Slower follow for icon dock / mesh — weightless parallax vs spotlight */
  const [heroParallax, setHeroParallax] = useState({ x: 50, y: 50 });
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [stageVisible, setStageVisible] = useState(true);
  const [scanOffset, setScanOffset] = useState(-20);
  const [comparePosition, setComparePosition] = useState(100);
  const [compareImageWidth, setCompareImageWidth] = useState(0);
  const [currentOutfitId, setCurrentOutfitId] = useState(null);
  const [selectedRating, setSelectedRating] = useState(null);
  const [selectedStars, setSelectedStars] = useState(0);
  const [animatedRating, setAnimatedRating] = useState(null);
  const [ratingLocked, setRatingLocked] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("");
  const [resultVideoError, setResultVideoError] = useState("");
  const [isImageFullscreenOpen, setIsImageFullscreenOpen] = useState(false);
  const [fullscreenZoom, setFullscreenZoom] = useState(1);
  const [fullscreenNatural, setFullscreenNatural] = useState(null);
  const [fullscreenViewport, setFullscreenViewport] = useState({ w: 0, h: 0 });
  const fullscreenScrollRef = useRef(null);
  const fsZoomRef = useRef(1);
  const pinchRef = useRef(null);
  const pinchMovedRef = useRef(false);
  const lastTapRef = useRef({ t: 0, x: 0, y: 0 });
  const [currentJobId, setCurrentJobId] = useState(null);
  const heroTargetRef = useRef({ x: 50, y: 50 });
  const compareRef = useRef(null);
  const outputSectionRef = useRef(null);
  const abortControllerRef = useRef(null);

  const scrollOutputIntoView = useCallback(() => {
    const el = outputSectionRef.current;
    if (!el) return;
    const behavior = reduceMotion ? "auto" : "smooth";
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        el.scrollIntoView({ behavior, block: "center", inline: "nearest" });
      });
    });
  }, [reduceMotion]);

  const cancelTryOn = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus("idle");
    setError("Try-on generation cancelled by user.");
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const personInputRef = useRef(null);
  const garmentInputRef = useRef(null);

  const stopLiveCamera = useCallback(() => {
    const fsHost = liveFeedFsRef.current;
    if (fsHost) {
      const activeFs = document.fullscreenElement ?? document.webkitFullscreenElement;
      if (activeFs === fsHost) {
        if (document.exitFullscreen) void document.exitFullscreen().catch(() => {});
        else if (document.webkitExitFullscreen) void document.webkitExitFullscreen();
      }
    }
    const session = liveTryOnSessionRef.current;
    session?.disposeRotation?.();
    session?.inputStream?.getTracks?.().forEach((t) => t.stop());
    liveTryOnSessionRef.current = { inputStream: null, realtimeClient: null, disposeRotation: null };
    const v = liveVideoRef.current;
    if (v) v.srcObject = null;
    setLiveCameraActive(false);
  }, []);

  useEffect(() => {
    return () => stopLiveCamera();
  }, [stopLiveCamera]);

  useEffect(() => {
    const syncLiveFeedFs = () => {
      const el = document.fullscreenElement ?? document.webkitFullscreenElement ?? null;
      setIsLiveFeedFullscreen(el === liveFeedFsRef.current);
    };
    document.addEventListener("fullscreenchange", syncLiveFeedFs);
    document.addEventListener("webkitfullscreenchange", syncLiveFeedFs);
    return () => {
      document.removeEventListener("fullscreenchange", syncLiveFeedFs);
      document.removeEventListener("webkitfullscreenchange", syncLiveFeedFs);
    };
  }, []);

  const toggleLiveFeedFullscreen = useCallback(async () => {
    const node = liveFeedFsRef.current;
    if (!node || !liveCameraActive) return;
    try {
      const current = document.fullscreenElement ?? document.webkitFullscreenElement;
      if (current === node) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } else if (node.requestFullscreen) {
        await node.requestFullscreen();
      } else if (node.webkitRequestFullscreen) {
        node.webkitRequestFullscreen();
      }
    } catch {
      /* requestFullscreen can reject (e.g. not allowed) */
    }
  }, [liveCameraActive]);

  const startLiveCamera = useCallback(async () => {
    setLiveCameraError("");
    stopLiveCamera();
    setLiveSessionSummary("");
    setLiveGenerationSeconds(0);
    if (authLoading) {
      setLiveCameraError("Checking your session…");
      return;
    }
    if (!user) {
      setLiveCameraError("Please create an account or log in to use try-on generation.");
      return;
    }
    if (!garmentFile) {
      setLiveCameraError("Add a garment image first — live try-on needs a reference outfit.");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setLiveCameraError("Camera is not supported in this browser.");
      return;
    }
    setLiveCameraActive(true);
    liveTryOnSessionRef.current = { inputStream: null, realtimeClient: null, disposeRotation: null };
    try {
      await connectDecartVirtualTryOn({
        sessionRef: liveTryOnSessionRef,
        garmentFile,
        onLocalStream: (localStream) => {
          const el = liveVideoRef.current;
          if (el) {
            el.srcObject = localStream;
            el.play().catch(() => {});
          }
        },
        onRemoteStream: (editedStream) => {
          const el = liveVideoRef.current;
          if (el) {
            el.srcObject = editedStream;
            el.play().catch(() => {});
          }
        },
        onGenerationTick: ({ totalSeconds }) => {
          setLiveGenerationSeconds(totalSeconds);
        },
        onSessionEnd: ({ generationSeconds, wallSeconds }) => {
          const durationSec = generationSeconds > 0 ? generationSeconds : wallSeconds;
          setLiveGenerationSeconds(0);
          if (durationSec > 0) {
            setLiveSessionSummary(`Live try-on ended · ${formatLiveSessionDuration(durationSec)}`);
          }
        }
      });
    } catch (e) {
      stopLiveCamera();
      const raw = String(e?.message || e || "Could not start live try-on.");
      const msg = sanitizePublicErrorMessage(raw);
      setLiveCameraError(
        /OverconstrainedError|NotAllowedError|NotFoundError/i.test(raw)
          ? `${msg} If the camera never started, allow camera access or try another browser.`
          : msg
      );
    }
  }, [user, authLoading, garmentFile, stopLiveCamera]);

  const handlePersonInputModeChange = useCallback(
    (mode) => {
      if (mode === personInputMode) return;
      stopLiveCamera();
      setLiveCameraError("");
      setLiveSessionSummary("");
      if (personPreview) URL.revokeObjectURL(personPreview);
      setPersonPreview(null);
      setPersonFile(null);
      setPersonMediaType("image");
      if (personInputRef.current) personInputRef.current.value = "";
      setPersonInputMode(mode);
    },
    [personInputMode, personPreview, stopLiveCamera]
  );
  const isProcessing = useMemo(() => status === "analyzing", [status]);
  const canRun = !!personPreview && !!garmentPreview && !isProcessing;
  const liveFeedExpanded = useMemo(
    () => personInputMode === "live" && liveCameraActive,
    [personInputMode, liveCameraActive]
  );

  useEffect(() => {
    fsZoomRef.current = fullscreenZoom;
  }, [fullscreenZoom]);

  useEffect(() => {
    if (!isImageFullscreenOpen) return undefined;
    setFullscreenZoom(1);
    setFullscreenNatural(null);
    setFullscreenViewport({ w: 0, h: 0 });
    pinchRef.current = null;
    pinchMovedRef.current = false;
    lastTapRef.current = { t: 0, x: 0, y: 0 };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isImageFullscreenOpen]);

  useLayoutEffect(() => {
    if (!isImageFullscreenOpen || !resultImage || resultMediaType !== "image") return undefined;
    const el = fullscreenScrollRef.current;
    if (!el) return undefined;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setFullscreenViewport((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [isImageFullscreenOpen, resultImage, resultMediaType]);

  const fullscreenImageLayout = useMemo(() => {
    if (!resultImage || !fullscreenNatural) {
      return { ready: false, displayW: 0, displayH: 0 };
    }
    const nw = fullscreenNatural.w;
    const nh = fullscreenNatural.h;
    const vw = fullscreenViewport.w;
    const vh = fullscreenViewport.h;
    if (nw <= 0 || nh <= 0 || vw <= 0 || vh <= 0) {
      return { ready: false, displayW: 0, displayH: 0 };
    }
    const fitScale = Math.min(vw / nw, vh / nh);
    const displayW = nw * fitScale * fullscreenZoom;
    const displayH = nh * fitScale * fullscreenZoom;
    return { ready: true, displayW, displayH };
  }, [resultImage, fullscreenNatural, fullscreenViewport, fullscreenZoom]);

  useEffect(() => {
    if (!isImageFullscreenOpen || resultMediaType !== "image") return undefined;
    const el = fullscreenScrollRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.002);
      setFullscreenZoom((z) => Math.min(FS_ZOOM_MAX, Math.max(FS_ZOOM_MIN, z * factor)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [isImageFullscreenOpen, resultMediaType]);

  useEffect(() => {
    if (!isImageFullscreenOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setIsImageFullscreenOpen(false);
      if (resultMediaType !== "image") return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setFullscreenZoom((z) => Math.min(FS_ZOOM_MAX, Math.round((z + FS_ZOOM_STEP) * 100) / 100));
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setFullscreenZoom((z) => Math.max(FS_ZOOM_MIN, Math.round((z - FS_ZOOM_STEP) * 100) / 100));
      }
      if (e.key === "0" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setFullscreenZoom(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isImageFullscreenOpen, resultMediaType]);

  const handleFsTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchRef.current = { dist, zoom: fsZoomRef.current };
      pinchMovedRef.current = false;
    }
  }, []);

  const handleFsTouchMove = useCallback((e) => {
    if (e.touches.length !== 2 || !pinchRef.current) return;
    e.preventDefault();
    pinchMovedRef.current = true;
    const [a, b] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const baseDist = pinchRef.current.dist;
    if (baseDist < 8) return;
    const ratio = dist / baseDist;
    const newZoom = Math.min(FS_ZOOM_MAX, Math.max(FS_ZOOM_MIN, pinchRef.current.zoom * ratio));
    pinchRef.current = { dist, zoom: newZoom };
    setFullscreenZoom(newZoom);
  }, []);

  const handleFsTouchEnd = useCallback((e) => {
    if (e.touches.length > 0) {
      if (e.touches.length < 2) pinchRef.current = null;
      return;
    }
    if (e.changedTouches.length !== 1) {
      pinchRef.current = null;
      lastTapRef.current = { t: 0, x: 0, y: 0 };
      return;
    }
    if (pinchMovedRef.current) {
      pinchMovedRef.current = false;
      pinchRef.current = null;
      lastTapRef.current = { t: 0, x: 0, y: 0 };
      return;
    }
    const tch = e.changedTouches[0];
    const now = Date.now();
    const prev = lastTapRef.current;
    const dt = now - prev.t;
    if (dt > 30 && dt < 380 && Math.hypot(tch.clientX - prev.x, tch.clientY - prev.y) < 56) {
      setFullscreenZoom((z) => (z > 1.05 ? 1 : Math.min(2, FS_ZOOM_MAX)));
      lastTapRef.current = { t: 0, x: 0, y: 0 };
    } else {
      lastTapRef.current = { t: now, x: tch.clientX, y: tch.clientY };
    }
    pinchRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [people, cloth] = await Promise.all([listDatasetSamples("image", 0), listDatasetSamples("cloth", 0)]);
        const pick = (data, t) => {
          const rows = data?.samples || [];
          return rows.length > 0 ? rows : staticUiDatasetSamples(t);
        };
        if (!cancelled) {
          setPersonSamples(pick(people, "image"));
          setClothSamples(pick(cloth, "cloth"));
        }
      } catch {
        if (!cancelled) {
          setPersonSamples(staticUiDatasetSamples("image"));
          setClothSamples(staticUiDatasetSamples("cloth"));
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(hover: none), (pointer: coarse)");
    const handleDeviceChange = () => setIsTouchDevice(mediaQuery.matches);
    handleDeviceChange();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleDeviceChange);
      return () => mediaQuery.removeEventListener("change", handleDeviceChange);
    }
    mediaQuery.addListener(handleDeviceChange);
    return () => mediaQuery.removeListener(handleDeviceChange);
  }, []);

  useEffect(() => {
    let frameId;
    const animate = () => {
      setHeroGlow((prev) => ({
        x: prev.x + (heroTargetRef.current.x - prev.x) * 0.09,
        y: prev.y + (heroTargetRef.current.y - prev.y) * 0.09
      }));
      setHeroParallax((prev) => ({
        x: prev.x + (heroTargetRef.current.x - prev.x) * 0.042,
        y: prev.y + (heroTargetRef.current.y - prev.y) * 0.042
      }));
      frameId = window.requestAnimationFrame(animate);
    };
    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!isTouchDevice) return undefined;
    const start = Date.now();
    const timer = window.setInterval(() => {
      const t = (Date.now() - start) / 1000;
      heroTargetRef.current = {
        x: 50 + Math.sin(t * 0.9) * 18,
        y: 50 + Math.cos(t * 0.7) * 14
      };
    }, 80);
    return () => window.clearInterval(timer);
  }, [isTouchDevice]);

  useEffect(() => {
    if (!isProcessing) {
      setActiveStageIndex(0);
      setStageVisible(true);
      return undefined;
    }

    const stageInterval = window.setInterval(() => {
      setStageVisible(false);
      window.setTimeout(() => {
        setActiveStageIndex((prev) => (prev + 1) % AI_PROGRESS_STAGES.length);
        setStageVisible(true);
      }, 220);
    }, 1700);

    return () => window.clearInterval(stageInterval);
  }, [isProcessing]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setError("Please create an account or log in to use try-on generation.");
      return;
    }
    setError((prev) => (AUTH_TRY_ON_ERROR_RE.test(prev) || SESSION_EXPIRED_ERROR_RE.test(prev) ? "" : prev));
  }, [user, authLoading]);

  useEffect(() => {
    if (!isProcessing) {
      setScanOffset(-20);
      return undefined;
    }

    let frameId;
    const span = 140; // from -20% to 120% then loop
    const cycleMs = 2200;
    const start = performance.now();

    const animateScan = (time) => {
      const progress = ((time - start) % cycleMs) / cycleMs;
      setScanOffset(-20 + span * progress);
      frameId = window.requestAnimationFrame(animateScan);
    };

    frameId = window.requestAnimationFrame(animateScan);
    return () => window.cancelAnimationFrame(frameId);
  }, [isProcessing]);

  useEffect(() => {
    if (!showOutputSection || !isProcessing) return;
    scrollOutputIntoView();
  }, [showOutputSection, isProcessing, scrollOutputIntoView]);

  useEffect(() => {
    const resize = () => {
      if (!compareRef.current) return;
      setCompareImageWidth(compareRef.current.getBoundingClientRect().width);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [status, resultImage, personPreview, personMediaType]);

  useEffect(() => {
    if (!currentOutfitId) {
      setSelectedRating(null);
      setSelectedStars(0);
      setRatingLocked(false);
      return;
    }
    const existing = getOutfitRating(getAuthenticatedUserId(user), currentOutfitId);
    setSelectedRating(existing?.rating || null);
    setSelectedStars(existing?.stars || 0);
    setRatingLocked(!!existing);
  }, [currentOutfitId, user]);

  const handleHeroMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    heroTargetRef.current = {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    };
  };

  const handleHeroTouchMove = (e) => {
    const touch = e.touches?.[0];
    if (!touch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    heroTargetRef.current = {
      x: ((touch.clientX - rect.left) / rect.width) * 100,
      y: ((touch.clientY - rect.top) / rect.height) * 100
    };
  };

  const detectMediaType = (file) => {
    const t = (file?.type || "").toLowerCase();
    if (t.startsWith("video/")) return "video";
    if (t.startsWith("image/")) return "image";
    if (VIDEO_NAME_RE.test(file?.name || "")) return "video";
    return "image";
  };

  const setPreview = (type, file) => {
    if (!file) return;
    const isPerson = type === "person";
    const detected = isPerson ? detectMediaType(file) : "image";
    if (isPerson && personInputMode === "image" && detected === "video") {
      return setError("Switch to Video to upload a person clip.");
    }
    if (isPerson && personInputMode === "video" && detected === "image") {
      return setError("Switch to Image to upload a photo.");
    }
    if (isPerson && personInputMode === "live" && file.type !== "image/jpeg") {
      return setError("Use Capture photo from the live camera, or switch to Image/Video to upload a file.");
    }
    const validTypes = isPerson
      ? personInputMode === "video"
        ? [...PERSON_VIDEO_TYPES, "application/octet-stream"]
        : [...PERSON_IMAGE_TYPES, ...PERSON_VIDEO_TYPES, "application/octet-stream"]
      : GARMENT_TYPES;
    const maxBytes = isPerson ? PERSON_MAX_BYTES : GARMENT_MAX_BYTES;
    const personOctetOk =
      isPerson &&
      file.type === "application/octet-stream" &&
      (VIDEO_NAME_RE.test(file.name || "") || IMAGE_NAME_RE.test(file.name || ""));
    if (!validTypes.includes(file.type) && !personOctetOk) {
      return setError(
        isPerson
          ? personInputMode === "video"
            ? "Invalid person video. Use MP4, WEBM, or MOV."
            : "Invalid person file type. Use JPG/PNG/WEBP or MP4/WEBM/MOV."
          : "Invalid garment file type. Use JPG/PNG/WEBP."
      );
    }
    if (file.size > maxBytes) return setError(isPerson ? "Person file too large. Max size is 100MB." : "Garment image too large. Max size is 10MB.");
    setError("");
    const url = URL.createObjectURL(file);
    if (type === "person") {
      if (personPreview) URL.revokeObjectURL(personPreview);
      setPersonFile(file);
      setPersonPreview(url);
      setPersonMediaType(detectMediaType(file));
    } else {
      if (garmentPreview) URL.revokeObjectURL(garmentPreview);
      setGarmentFile(file);
      setGarmentPreview(url);
    }
    setStatus("idle");
    setResultImage(null);
    setResultMediaType("image");
    setResultVideoError("");
    setCurrentJobId(null);
    setCurrentOutfitId(null);
  };

  const captureLiveFrame = async () => {
    setError("");
    const rawStream = liveTryOnSessionRef.current?.inputStream;
    let sourceVideo = liveVideoRef.current;
    let tempVideo = null;

    // Use raw camera frames for offline Generate — not the Decart-edited preview stream.
    if (rawStream?.getVideoTracks?.().length) {
      tempVideo = document.createElement("video");
      tempVideo.srcObject = rawStream;
      tempVideo.muted = true;
      tempVideo.playsInline = true;
      try {
        await tempVideo.play();
        if (tempVideo.readyState < 2) {
          await new Promise((resolve, reject) => {
            const onReady = () => resolve();
            const onErr = () => reject(new Error("Camera frame not ready"));
            tempVideo.addEventListener("loadeddata", onReady, { once: true });
            tempVideo.addEventListener("error", onErr, { once: true });
          });
        }
        sourceVideo = tempVideo;
      } catch {
        tempVideo = null;
      }
    }

    if (!sourceVideo || sourceVideo.readyState < 2) {
      setError("Wait for the camera preview, then capture again.");
      return;
    }
    const w = sourceVideo.videoWidth;
    const h = sourceVideo.videoHeight;
    if (!w || !h) {
      setError("Camera is not ready yet.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Could not capture frame.");
      return;
    }
    ctx.drawImage(sourceVideo, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (tempVideo) {
          tempVideo.pause();
          tempVideo.srcObject = null;
        }
        if (!blob) {
          setError("Could not capture frame.");
          return;
        }
        const file = new File([blob], `live-tryon-${Date.now()}.jpg`, { type: "image/jpeg" });
        setPreview("person", file);
        stopLiveCamera();
      },
      "image/jpeg",
      0.92
    );
  };

  const useSample = async (type, sample) => {
    try {
      const res = await fetch(sample.url);
      const blob = await res.blob();
      const file = new File([blob], sample.fileName, { type: blob.type || "image/jpeg" });
      setPreview(type, file);
    } catch {
      setError("Could not use sample image.");
    }
  };

  const executeTryOn = async ({ person, garment }) => {
    if (authLoading) {
      setError("Checking your session…");
      return;
    }
    if (!user) {
      setError("Please create an account or log in to use try-on generation.");
      return;
    }
    if (!person || !garment) return setError("Upload both person and garment images first.");
    try {
      setError("");
      setResultVideoError("");
      setStatus("analyzing");
      setCurrentJobId(null);
      setActiveStageIndex(0);
      setStageVisible(true);
      
      abortControllerRef.current = new AbortController();
      
      const response = await uploadMyImage({ 
        imageFile: person, 
        garmentFile: garment, 
        signal: abortControllerRef.current.signal 
      });
      
      abortControllerRef.current = null;
      
      const job = response?.job;
      if (!job?.resultUrl) throw new Error("Result image URL was not generated");
      const outfitId = new Date().toISOString();
      setStatus("success");
      setComparePosition(100);
      const resultUrl = String(job.resultUrl || "").trim();
      const cacheBusted =
        resultUrl && !resultUrl.includes("blob:")
          ? `${resultUrl}${resultUrl.includes("?") ? "&" : "?"}v=${Date.now()}`
          : resultUrl;
      setResultImage(cacheBusted);
      const personWasVideo =
        String(person?.type || "")
          .toLowerCase()
          .startsWith("video/") || VIDEO_NAME_RE.test(person?.name || "");
      setResultMediaType(personWasVideo || inferResultIsVideo(job) ? "video" : "image");
      setResultFilename(job.resultFilename || "weartual-sys-output.jpg");
      setCurrentOutfitId(outfitId);
      setSelectedRating(null);
      setSelectedStars(0);
      setRatingLocked(false);
      const resolvedJobIdRaw = job?.id ?? job?._id;
      const resolvedJobId =
        resolvedJobIdRaw != null && String(resolvedJobIdRaw).trim() !== "" ? String(resolvedJobIdRaw).trim() : null;
      addOutfitHistoryEntry(getAuthenticatedUserId(user), {
        image: job.resultUrl,
        timestamp: outfitId,
        outfitId,
        jobId: resolvedJobId ?? undefined,
        name: garment?.name ? `Try-on: ${garment.name}` : "Generated outfit look",
        resultType: job.resultType === "video" || inferResultIsVideo(job) ? "video" : "image"
      });
      setCurrentJobId(resolvedJobId);
    } catch (err) {
      if (err.name === "AbortError" || err.message === "The user aborted a request.") {
        setStatus("idle");
        setError("Try-on generation cancelled by user.");
        abortControllerRef.current = null;
        return;
      }
      abortControllerRef.current = null;
      setStatus("error");
      const msg = String(err?.message || "");
      const authLike =
        /please create an account or log in/i.test(msg) ||
        /session expired/i.test(msg) ||
        /authentication required|invalid or expired token|unauthorized|^401\b/i.test(msg);
      if (authLike) {
        if (user) onSessionExpired?.();
        setError(
          user
            ? "Your session expired. Please log in again."
            : "Please create an account or log in to use try-on generation."
        );
        return;
      }
      setError(sanitizePublicErrorMessage(msg || "Try-on generation failed."));
    }
  };

  const runTryOn = async () => {
    if (authLoading) {
      setError("Checking your session…");
      return;
    }
    if (!user) {
      setError("Please create an account or log in to use try-on generation.");
      return;
    }
    if (!personFile || !garmentFile) return setError("Upload both person and garment images first.");
    setShowOutputSection(true);
    await executeTryOn({ person: personFile, garment: garmentFile });
  };

  const deleteCurrentResultFromServer = async () => {
    const jobId = String(currentJobId || "").trim();
    if (!jobId) {
      setError("No saved result id — generate a try-on again, then delete.");
      return;
    }
    const uid = getAuthenticatedUserId(user);
    if (uid === "anonymous") {
      setError("Sign in to remove this result from your account.");
      return;
    }
    if (!window.confirm("Delete this result from your account? It will be removed from the server and cannot be undone.")) return;
    try {
      setError("");
      let data;
      try {
        data = await deleteMyImage(jobId);
      } catch (err) {
        const msg = String(err?.message || "");
        const is404 = /not found|404|Result not found/i.test(msg);
        if (is404 && resultImage && /^https?:\/\//i.test(String(resultImage).trim())) {
          data = await deleteMyImageByResultUrl(String(resultImage).trim());
        } else {
          throw err;
        }
      }
      removeOutfitHistoryEntryByJobId(uid, jobId);
      if (resultImage) removeOutfitHistoryEntriesWithImageUrl(uid, String(resultImage).trim());
      if (currentOutfitId) removeOutfitRatingByOutfitId(uid, currentOutfitId);
      setCurrentJobId(null);
      setCurrentOutfitId(null);
      setResultImage(null);
      setResultVideoError("");
      setStatus("idle");
      setComparePosition(50);
      setSelectedRating(null);
      setSelectedStars(0);
      setRatingLocked(false);
      setShareFeedback("");
    } catch (err) {
      setError(sanitizePublicErrorMessage(err?.message || "Could not delete this result from the server."));
    }
  };

  const clearType = (type) => {
    if (type === "person") {
      stopLiveCamera();
      setLiveCameraError("");
      if (personPreview) URL.revokeObjectURL(personPreview);
      setPersonPreview(null);
      setPersonFile(null);
      setPersonMediaType("image");
      if (personInputRef.current) personInputRef.current.value = "";
    } else {
      if (garmentPreview) URL.revokeObjectURL(garmentPreview);
      setGarmentPreview(null);
      setGarmentFile(null);
      if (garmentInputRef.current) garmentInputRef.current.value = "";
    }
  };

  const rateOutfit = (rating) => {
    if (!currentOutfitId || ratingLocked) return;
    const userId = getAuthenticatedUserId(user);
    const result = saveOutfitRating({
      userId,
      outfitId: currentOutfitId,
      rating,
      stars: selectedStars || undefined,
      allowUpdate: true
    });
    if (!result.saved) return;
    setSelectedRating(rating);
    setAnimatedRating(rating);
    window.setTimeout(() => setAnimatedRating(null), 220);
  };

  const rateStars = (stars) => {
    if (!currentOutfitId || ratingLocked) return;
    const userId = getAuthenticatedUserId(user);
    const result = saveOutfitRating({
      userId,
      outfitId: currentOutfitId,
      stars,
      rating: selectedRating || undefined,
      allowUpdate: true
    });
    if (!result.saved) return;
    setSelectedStars(stars);
    setAnimatedRating("stars");
    window.setTimeout(() => setAnimatedRating(null), 220);
  };

  const downloadCurrentResult = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = resultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const openResultFullscreen = () => {
    if (!resultImage || resultMediaType !== "image") return;
    setIsImageFullscreenOpen(true);
  };

  const copyImageLink = async () => {
    if (!resultImage) return false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(resultImage);
        setShareFeedback(`${resultMediaType === "video" ? "Video" : "Image"} link copied.`);
        window.setTimeout(() => setShareFeedback(""), 1800);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleCopyLinkClick = async () => {
    const ok = await copyImageLink();
    if (!ok) {
      setShareFeedback("Could not copy link (clipboard unavailable).");
      window.setTimeout(() => setShareFeedback(""), 2200);
    }
  };

  const heroSpotlightStyle = useMemo(
    () => ({
      background: isDark
        ? `radial-gradient(520px circle at ${heroGlow.x}% ${heroGlow.y}%, rgba(99,102,241,0.22), rgba(5,8,20,0.96) 55%)`
        : `radial-gradient(520px circle at ${heroGlow.x}% ${heroGlow.y}%, rgba(124,58,237,0.16), rgba(248,250,252,0.94) 55%)`
    }),
    [isDark, heroGlow.x, heroGlow.y]
  );

  const heroMeshStyle = useMemo(
    () => ({
      background: isDark
        ? `radial-gradient(ellipse 80% 50% at ${heroParallax.x * 0.85 + 8}% ${heroParallax.y * 0.7 + 10}%, rgba(236,72,153,0.12), transparent 52%),
           radial-gradient(ellipse 70% 45% at ${100 - heroParallax.x * 0.9}% ${100 - heroParallax.y * 0.75}%, rgba(56,189,248,0.1), transparent 50%)`
        : `radial-gradient(ellipse 80% 50% at ${heroParallax.x * 0.85 + 8}% ${heroParallax.y * 0.7 + 10}%, rgba(236,72,153,0.14), transparent 52%),
           radial-gradient(ellipse 70% 45% at ${100 - heroParallax.x * 0.9}% ${100 - heroParallax.y * 0.75}%, rgba(56,189,248,0.12), transparent 50%)`
    }),
    [isDark, heroParallax.x, heroParallax.y]
  );

  const heroOrbStyle = useMemo(
    () => ({
      left: `calc(${heroGlow.x}% - min(240px,45vw))`,
      top: `calc(${heroGlow.y}% - min(240px,45vw))`,
      background: isDark
        ? "radial-gradient(circle, rgba(124,58,237,0.28) 0%, rgba(59,130,246,0.18) 38%, rgba(236,72,153,0.12) 62%, rgba(255,255,255,0) 72%)"
        : "radial-gradient(circle, rgba(124,58,237,0.2) 0%, rgba(59,130,246,0.12) 38%, rgba(236,72,153,0.08) 62%, rgba(255,255,255,0) 72%)"
    }),
    [isDark, heroGlow.x, heroGlow.y]
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div
        id="tour-studio-root"
        className={`mx-auto px-4 py-12 ${liveFeedExpanded ? "max-w-[88rem]" : "max-w-6xl"}`}
      >
        <motion.div
          className="text-center mb-6 relative isolate overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-brand-50 via-white to-indigo-50 min-h-[300px] sm:min-h-[340px] flex items-center justify-center px-5 sm:px-6 dark:border-white/10 dark:bg-[#050814] dark:from-transparent dark:via-transparent dark:to-transparent"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
          onMouseMove={handleHeroMouseMove}
          onMouseLeave={() => {
            heroTargetRef.current = { x: 50, y: 50 };
          }}
          onTouchStart={handleHeroTouchMove}
          onTouchMove={handleHeroTouchMove}
        >
          {/* Spotlight follows pointer (faster layer) */}
          <div className="absolute inset-0" style={heroSpotlightStyle} />
          {/* Slower parallax mesh — Antigravity-style ambient depth */}
          <div className="absolute inset-0 opacity-90" style={heroMeshStyle} />
          <div
            className="absolute pointer-events-none w-[min(480px,90vw)] h-[min(480px,90vw)] max-w-[520px] max-h-[520px] rounded-full blur-3xl opacity-90"
            style={heroOrbStyle}
          />
          {/* Horizon glow */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-brand-200/50 via-transparent to-transparent dark:from-indigo-500/[0.07]" />
          {/* Floating tool dock — icon constellation + slow float */}
          {HERO_DOCK_ITEMS.map(({ Icon, top, left, right, delay, mul }, idx) => (
            <div
              key={`dock-${idx}`}
              className="absolute z-[5] pointer-events-none"
              style={{
                top,
                ...(left != null ? { left } : {}),
                ...(right != null ? { right } : {}),
                transform: `translate(${(heroParallax.x - 50) * 0.72 * mul}px, ${(heroParallax.y - 50) * 0.58 * mul}px)`,
                willChange: "transform"
              }}
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/90 bg-white/80 shadow-[0_8px_28px_rgba(15,23,42,0.1)] backdrop-blur-md sm:h-[3.25rem] sm:w-[3.25rem] animate-antigravity-dock-float dark:border-slate-600/70 dark:bg-slate-800/90 dark:shadow-[0_8px_28px_rgba(0,0,0,0.45)]"
                style={{ animationDelay: delay }}
              >
                <Icon className="h-[1.15rem] w-[1.15rem] text-brand-600/85 sm:h-5 sm:w-5 dark:text-slate-500" strokeWidth={1.5} />
              </div>
            </div>
          ))}
          <motion.div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.22)_1px,transparent_1px)] bg-[size:24px_24px] opacity-[0.35] dark:bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] dark:opacity-[0.28]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(241,245,249,0.65)_100%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(3,7,18,0.55)_100%)]" />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-200 bg-white/90 backdrop-blur-md shadow-sm mb-5 dark:border-white/20 dark:bg-white/[0.08]">
              <Sparkles className="w-4 h-4 text-brand-600 dark:text-slate-500" />
              <span className="text-xs font-bold tracking-wider uppercase text-brand-800 dark:text-white/85">Weartual Neural Engine v2.0</span>
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl leading-[1.15] font-bold mb-3 font-sans tracking-tight">
              <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-brand-800 to-indigo-800 dark:from-slate-100 dark:via-indigo-100 dark:to-cyan-100">
                Achieve flawless fits.
              </span>
              <br />
              <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 dark:from-cyan-100 dark:via-violet-100 dark:to-fuchsia-100">
                Powered by WEARTUAL.
              </span>
            </h1>
            <p className="text-slate-600 max-w-2xl mx-auto text-[0.95rem] sm:text-base leading-relaxed dark:text-white/75">
              Upload your subject and garment. Our proprietary deep learning pipeline will synthesize a photorealistic rendering in seconds.
            </p>
          </div>
        </motion.div>
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
            {AUTH_TRY_ON_ERROR_RE.test(error) ? (
              <span>
                Please{" "}
                <Link
                  to="/signup"
                  className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
                >
                  create an account
                </Link>{" "}
                or{" "}
                <Link
                  to="/login"
                  className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
                >
                  log in
                </Link>{" "}
                to use try-on generation.
              </span>
            ) : SESSION_EXPIRED_ERROR_RE.test(error) ? (
              <span>
                Your session expired. Please{" "}
                <Link
                  to="/login"
                  className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
                >
                  log in
                </Link>{" "}
                again.
              </span>
            ) : (
              error
            )}
          </div>
        )}

        <motion.div
          role="note"
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.35, ease: "easeOut" }}
          className="mb-4 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left shadow-sm dark:border-slate-600 dark:bg-slate-800/90"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
          <p className="text-xs leading-relaxed text-slate-600 sm:text-[0.8125rem] dark:text-slate-300">
            <span className="font-semibold text-slate-800 dark:text-slate-100">Best results:</span> use a{" "}
            <span className="font-semibold text-brand-700 dark:text-brand-300">front-facing</span> person photo or video
            (upper body visible, good lighting) and a clear garment image on a plain background when possible.
          </p>
        </motion.div>

        <div
          className={
            liveFeedExpanded
              ? "flex w-full flex-col gap-5"
              : "grid grid-cols-1 gap-5 lg:grid-cols-2"
          }
        >
          {[
            { key: "person", title: "Person input", preview: personPreview, ref: personInputRef, samples: personSamples },
            { key: "garment", title: "Garment Image", preview: garmentPreview, ref: garmentInputRef, samples: clothSamples }
          ].map((block) => (
            <div
              key={block.key}
              className={`rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 ${
                liveFeedExpanded && block.key === "person"
                  ? "flex min-h-0 flex-col ring-2 ring-brand-500/15 shadow-lg shadow-slate-900/5 dark:ring-brand-400/20 dark:shadow-black/20"
                  : ""
              } ${
                liveFeedExpanded && block.key === "garment"
                  ? "mx-auto w-full max-w-5xl shrink-0 xl:max-w-6xl"
                  : ""
              }`}
            >
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">{block.title}</h3>
              {block.key === "person" && (
                <div
                  className="mb-3 flex rounded-xl border border-slate-200 bg-slate-100/90 p-0.5 dark:border-slate-600 dark:bg-slate-800/90"
                  role="tablist"
                  aria-label="Person input type"
                >
                  {[
                    { id: "image", label: "Image", Icon: LucideImage },
                    { id: "video", label: "Video", Icon: Video },
                    { id: "live", label: "Live try-on", Icon: Camera }
                  ].map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={personInputMode === id}
                      onClick={() => handlePersonInputModeChange(id)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors sm:text-[0.8125rem] ${
                        personInputMode === id
                          ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>
              )}
              <div
                className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/50 ${
                  liveFeedExpanded && block.key === "person"
                    ? "flex min-h-[280px] flex-1 flex-col sm:min-h-[380px] lg:min-h-[min(78vh,600px)]"
                    : "min-h-[170px] sm:min-h-[190px]"
                }`}
                onClick={() =>
                  block.key === "person" && personInputMode === "live"
                    ? undefined
                    : !block.preview && block.ref.current?.click()
                }
              >
                <input
                  ref={block.ref}
                  type="file"
                  className="hidden"
                  accept={
                    block.key === "person"
                      ? personInputMode === "video"
                        ? "video/mp4,video/webm,video/quicktime"
                        : personInputMode === "image"
                          ? "image/jpeg,image/png,image/webp"
                          : "image/jpeg"
                      : "image/jpeg,image/png,image/webp"
                  }
                  onChange={(e) => setPreview(block.key, e.target.files?.[0] || null)}
                />
                {block.key === "person" && personInputMode === "live" && !block.preview ? (
                  <div
                    className={`flex flex-col items-center bg-slate-50 p-4 text-center dark:bg-slate-800/50 ${
                      liveFeedExpanded
                        ? "min-h-[260px] flex-1 justify-between gap-4 py-6 sm:min-h-[360px] lg:min-h-[min(76vh,560px)]"
                        : "min-h-[170px] justify-center gap-3 sm:min-h-[190px]"
                    }`}
                  >
                    <div
                      ref={liveFeedFsRef}
                      className={`relative w-full min-h-0 ${
                        liveCameraActive
                          ? isLiveFeedFullscreen
                            ? "flex flex-1 items-center justify-center bg-black"
                            : liveFeedExpanded
                              ? "flex flex-1 flex-col justify-center"
                              : ""
                          : ""
                      }`}
                    >
                      <video
                        ref={liveVideoRef}
                        className={
                          liveCameraActive
                            ? isLiveFeedFullscreen
                              ? "max-h-[100dvh] max-w-full object-contain"
                              : "block h-auto w-full max-w-none rounded-xl border border-slate-200 bg-black object-contain dark:border-slate-600 max-h-[min(82vh,820px)] min-h-[200px] sm:min-h-[260px] lg:min-h-[min(58vh,540px)]"
                            : "hidden max-h-[220px] w-full max-w-sm rounded-xl border border-slate-200 bg-black object-contain dark:border-slate-600"
                        }
                        playsInline
                        muted
                      />
                      {liveCameraActive ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void toggleLiveFeedFullscreen();
                          }}
                          className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/90 bg-white/95 text-slate-800 shadow-sm hover:bg-white dark:border-slate-600 dark:bg-slate-800/95 dark:text-slate-100 dark:hover:bg-slate-700"
                          aria-label={isLiveFeedFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                          title={isLiveFeedFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
                        >
                          {isLiveFeedFullscreen ? <Minimize2 className="h-4 w-4" aria-hidden /> : <Maximize2 className="h-4 w-4" aria-hidden />}
                        </button>
                      ) : null}
                    </div>
                    {!liveCameraActive ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {liveSessionSummary || "Add a garment image, then connect. The preview shows your live camera with the outfit applied."}
                      </p>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        {liveGenerationSeconds > 0 ? (
                          <p className="text-xs font-medium text-brand-700 dark:text-brand-300">
                            Live session · {formatLiveSessionDuration(liveGenerationSeconds)}
                          </p>
                        ) : null}
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Tip: capture a frame if you also want to run offline Generate with the same look.
                        </p>
                      </div>
                    )}
                    {liveCameraError ? (
                      <p className="text-xs text-rose-600 dark:text-rose-400">{liveCameraError}</p>
                    ) : null}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {!liveCameraActive ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startLiveCamera();
                          }}
                          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-violet-600 dark:hover:bg-violet-500"
                        >
                          <Camera className="h-4 w-4" />
                          Connect live try-on
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              captureLiveFrame();
                            }}
                            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
                          >
                            <LucideImage className="h-4 w-4" />
                            Capture frame for Generate
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void toggleLiveFeedFullscreen();
                            }}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            aria-pressed={isLiveFeedFullscreen}
                          >
                            {isLiveFeedFullscreen ? <Minimize2 className="h-4 w-4 shrink-0" aria-hidden /> : <Maximize2 className="h-4 w-4 shrink-0" aria-hidden />}
                            {isLiveFeedFullscreen ? "Exit fullscreen" : "Fullscreen"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              stopLiveCamera();
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            Disconnect
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : block.preview ? (
                  <>
                    {block.key === "person" && personMediaType === "video" ? (
                      <video src={block.preview} className="w-full h-full object-contain bg-slate-50" controls muted playsInline />
                    ) : (
                      <img src={block.preview} alt={block.title} className="w-full h-full object-contain bg-slate-50" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearType(block.key);
                      }}
                      className="absolute top-3 right-3 p-2 rounded-lg bg-white border border-slate-200 text-slate-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="h-full min-h-[170px] sm:min-h-[190px] flex items-center justify-center text-slate-500 text-sm px-4 text-center">
                    Click to upload
                  </div>
                )}
              </div>
              <div
                className={`mt-3 grid grid-cols-4 gap-2 ${
                  liveFeedExpanded && block.key === "person" ? "hidden" : ""
                }`}
              >
                {Array.from({ length: 8 }).map((_, idx) => {
                  const sample = block.samples[idx];
                  const samplesDisabled = block.key === "person" && (personInputMode === "live" || personInputMode === "video");
                  return (
                    <button
                      key={`${block.key}-${idx}`}
                      type="button"
                      title={samplesDisabled ? "Dataset samples are for Image mode" : undefined}
                      disabled={samplesDisabled}
                      className={`aspect-square rounded-lg border border-slate-200 overflow-hidden bg-white ${
                        samplesDisabled ? "cursor-not-allowed opacity-40" : ""
                      }`}
                      onClick={() => {
                        if (samplesDisabled) return;
                        sample && useSample(block.key, sample);
                      }}
                    >
                      {sample ? (
                        <img src={sample.url} alt={sample.fileName} className="w-full h-full object-contain bg-slate-50" />
                      ) : (
                        <div className="w-full h-full bg-slate-100" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {showOutputSection && (
          <motion.div
            ref={outputSectionRef}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }}
            className="mx-auto mt-6 w-full max-w-md scroll-mt-24"
          >
            <div
              className={`rounded-2xl border border-slate-200 bg-white p-2 flex flex-col dark:border-slate-700 dark:bg-slate-900 ${
                status === "success" && resultImage ? "h-auto" : "min-h-[200px] sm:min-h-[220px]"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 sm:flex-nowrap">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 sm:flex-nowrap">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 shrink-0">Result Preview</h3>
                </div>
                {status === "success" && resultImage && (
                  <div className="flex max-w-full flex-nowrap items-center justify-end gap-1.5 overflow-x-auto sm:min-w-0 sm:flex-1 sm:justify-end">
                    {currentJobId ? (
                      <button
                        type="button"
                        onClick={deleteCurrentResultFromServer}
                        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete from server
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={downloadCurrentResult}
                      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-500 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download {resultMediaType === "video" ? "Video" : "Image"}
                    </button>
                    {resultMediaType === "image" && (
                      <button
                        type="button"
                        onClick={openResultFullscreen}
                        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        <Maximize2 className="w-3.5 h-3.5" /> Full Screen
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleCopyLinkClick}
                      title="Copy link"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                      aria-label="Copy result link"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {shareFeedback && <p className="px-1 pb-2 text-xs text-slate-500">{shareFeedback}</p>}
              {status === "success" && resultVideoError && (
                <p className="px-1 pb-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">{resultVideoError}</p>
              )}
              <div
                className={`rounded-xl bg-slate-100 overflow-hidden dark:bg-slate-800/80 ${
                  isProcessing
                    ? "flex min-h-[200px] items-center justify-center"
                    : status === "success" && resultImage
                      ? "leading-none"
                      : "flex min-h-[160px] items-center justify-center"
                }`}
              >
                {isProcessing ? (
                  <div className="w-full h-full min-h-[200px] flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
                    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center shadow-2xl relative overflow-hidden">
                      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_10%,rgba(56,189,248,0.25),transparent_38%)] pointer-events-none" />
                      <div className="relative mx-auto mb-5 w-16 h-16">
                        <div className="absolute inset-0 rounded-full border border-cyan-300/30 animate-spin" />
                        <div className="absolute inset-[7px] rounded-full border border-fuchsia-300/30 [animation:spin_3.2s_linear_infinite_reverse]" />
                        <div className="absolute inset-[14px] rounded-full bg-gradient-to-br from-cyan-300 via-indigo-300 to-fuchsia-300 blur-[1px] animate-pulse" />
                        <div className="absolute inset-[18px] rounded-full bg-slate-900/80 border border-white/20" />
                        <div className="absolute inset-[6px] rounded-full border border-cyan-200/50 animate-ping" />
                        <div className="absolute inset-[2px] rounded-full border border-indigo-200/40 animate-ping" style={{ animationDelay: "280ms" }} />
                      </div>
                      <div className="mx-auto mb-4 h-2 w-48 rounded-full bg-white/10 overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        <div
                          className="absolute top-0 h-full w-16 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-300/80 via-indigo-300/90 to-fuchsia-300/80 shadow-[0_0_14px_rgba(129,140,248,0.8)]"
                          style={{ left: `${scanOffset}%` }}
                        />
                      </div>
                      <p
                        className={`text-sm sm:text-base font-medium text-white/90 transition-all duration-300 ${
                          stageVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
                        }`}
                      >
                        {AI_PROGRESS_STAGES[activeStageIndex]}
                      </p>
                      <button
                        type="button"
                        onClick={cancelTryOn}
                        className="relative z-10 mt-6 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/90 hover:bg-white/15 hover:text-white transition-all active:scale-95 shadow-sm"
                      >
                        <X className="w-3.5 h-3.5" /> Cancel Generation
                      </button>
                    </div>
                  </div>
                ) : status === "success" && resultImage && resultMediaType === "image" && personPreview && personMediaType === "image" ? (
                  <div ref={compareRef} className="relative w-full overflow-hidden bg-black select-none leading-none">
                    <img src={personPreview} alt="Person before try-on" className="block h-auto w-full" draggable={false} />
                    <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${comparePosition}%` }}>
                      <img
                        src={resultImage}
                        alt="Generated try-on result"
                        className="h-full max-w-none object-contain object-left"
                        style={{ width: `${compareImageWidth}px` }}
                        draggable={false}
                      />
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.1"
                      value={comparePosition}
                      onChange={(e) => setComparePosition(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                      aria-label="Compare before and after"
                    />

                    <div className="absolute inset-y-0 z-10 pointer-events-none" style={{ left: `${comparePosition}%`, transform: "translateX(-50%)" }}>
                      <div className="h-full w-0.5 bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" />
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg">
                        <span className="text-xs font-bold">||</span>
                      </div>
                    </div>

                    <div className="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-slate-900/70 text-white">
                      After (try-on)
                    </div>
                    <div className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-brand-600/90 text-white">
                      Before (person)
                    </div>
                  </div>
                ) : status === "success" && resultImage ? (
                  resultMediaType === "video" ? (
                    <video
                      key={resultImage}
                      src={resultImage}
                      controls
                      playsInline
                      preload="metadata"
                      className="mx-auto block h-auto w-full max-w-full bg-black object-contain"
                      onError={() =>
                        setResultVideoError(
                          "This video URL loaded but the browser cannot decode it. Typical cause: OpenCV mp4v output. Install FFmpeg on the API server (see server logs) so the pipeline can re-encode to H.264, or try opening the link in Chrome."
                        )
                      }
                    />
                  ) : (
                    <div className="flex w-full justify-center">
                      <img src={resultImage} alt="Generated try-on" className="block h-auto max-w-full object-contain" />
                    </div>
                  )
                ) : status === "error" ? (
                  <div className="w-full min-h-[200px] flex items-center justify-center text-slate-500 text-sm p-6 text-center">
                    Try-on did not finish. See the message above the studio controls and try again.
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm p-6 text-center">
                    Upload person and garment above, then click Generate to see your result here.
                  </div>
                )}
              </div>
              {status === "success" && resultImage && (
                <div className="pt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => rateOutfit("like")}
                    disabled={ratingLocked}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                      selectedRating === "like"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    } ${animatedRating === "like" ? "scale-105" : "scale-100"} ${ratingLocked ? "cursor-not-allowed opacity-90" : ""}`}
                  >
                    <ThumbsUp className="w-4 h-4" /> Like
                  </button>
                  <button
                    type="button"
                    onClick={() => rateOutfit("dislike")}
                    disabled={ratingLocked}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                      selectedRating === "dislike"
                        ? "bg-rose-50 text-rose-700 border-rose-300"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    } ${animatedRating === "dislike" ? "scale-105" : "scale-100"} ${ratingLocked ? "cursor-not-allowed opacity-90" : ""}`}
                  >
                    <ThumbsDown className="w-4 h-4" /> Dislike
                  </button>
                  <div
                    className={`ml-1 inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-1.5 ${animatedRating === "stars" ? "scale-105" : "scale-100"} transition-all duration-200`}
                  >
                    {Array.from({ length: 5 }).map((_, idx) => {
                      const star = idx + 1;
                      const active = selectedStars >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => rateStars(star)}
                          disabled={ratingLocked}
                          className={`p-1 transition-colors ${ratingLocked ? "cursor-not-allowed" : "hover:scale-105"} ${active ? "text-amber-400" : "text-slate-300 hover:text-amber-300"}`}
                          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                        >
                          <Star className={`w-4 h-4 ${active ? "fill-current" : ""}`} />
                        </button>
                      );
                    })}
                  </div>
                  {ratingLocked && <p className="text-xs text-slate-500">Rating locked for this saved outfit.</p>}
                </div>
              )}
            </div>
            {status === "success" && resultImage && personMediaType === "image" && (
              <div className="mt-4">
                <StyleInsightsPanel personImageUrl={personPreview} clothImageUrl={garmentPreview} />
              </div>
            )}
          </motion.div>
        )}
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={runTryOn}
            disabled={!canRun}
            className={`inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold ${
              canRun ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100" : "bg-slate-100 text-slate-400 border border-slate-200 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-500"
            }`}
          >
            Generate Try-On <ArrowRight className="w-5 h-5" />
          </button>
        </div>

      </div>
      {isImageFullscreenOpen && resultImage && resultMediaType === "image" && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen try-on result"
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5 text-white sm:px-4">
            <p className="min-w-0 flex-1 text-sm font-medium truncate">Try-on result</p>
            <div className="flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-1 py-0.5">
              <button
                type="button"
                onClick={() =>
                  setFullscreenZoom((z) => Math.max(FS_ZOOM_MIN, Math.round((z - FS_ZOOM_STEP) * 100) / 100))
                }
                disabled={fullscreenZoom <= FS_ZOOM_MIN}
                className="rounded-md p-2 text-white/90 hover:bg-white/15 disabled:pointer-events-none disabled:opacity-35 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="min-w-[3rem] select-none text-center text-xs tabular-nums text-white/85">
                {Math.round(fullscreenZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() =>
                  setFullscreenZoom((z) => Math.min(FS_ZOOM_MAX, Math.round((z + FS_ZOOM_STEP) * 100) / 100))
                }
                disabled={fullscreenZoom >= FS_ZOOM_MAX}
                className="rounded-md p-2 text-white/90 hover:bg-white/15 disabled:pointer-events-none disabled:opacity-35 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setFullscreenZoom(1)}
                disabled={fullscreenZoom === 1}
                className="ml-0.5 rounded-md p-2 text-white/90 hover:bg-white/15 disabled:pointer-events-none disabled:opacity-35 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                aria-label="Reset zoom"
                title="Reset zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsImageFullscreenOpen(false)}
              className="shrink-0 rounded-lg p-2 text-white/90 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              aria-label="Close fullscreen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            ref={fullscreenScrollRef}
            className="mx-auto min-h-0 w-full flex-1 cursor-default overflow-auto touch-pan-x touch-pan-y"
            onTouchStart={handleFsTouchStart}
            onTouchMove={handleFsTouchMove}
            onTouchEnd={handleFsTouchEnd}
          >
            <div className="flex min-h-full min-w-full items-center justify-center p-4">
              <img
                src={resultImage}
                alt="Generated try-on full view"
                onLoad={(e) => {
                  const t = e.currentTarget;
                  setFullscreenNatural({ w: t.naturalWidth, h: t.naturalHeight });
                }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  setFullscreenZoom((z) => (z > 1.05 ? 1 : Math.min(2, FS_ZOOM_MAX)));
                }}
                style={
                  fullscreenImageLayout.ready
                    ? {
                        width: fullscreenImageLayout.displayW,
                        height: fullscreenImageLayout.displayH,
                        transition: "width 0.12s ease-out, height 0.12s ease-out"
                      }
                    : undefined
                }
                className={`block select-none rounded-lg ${
                  fullscreenImageLayout.ready ? "" : "max-h-[calc(100vh-6rem)] max-w-[min(100vw-2rem,100%)] object-contain"
                }`}
                draggable={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
