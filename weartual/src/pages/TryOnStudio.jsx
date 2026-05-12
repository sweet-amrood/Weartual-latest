import React, { useMemo, useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { listDatasetSamples, uploadMyImage, deleteMyImage, deleteMyImageByResultUrl } from "../services/imageApi";
import {
  Sparkles,
  Trash2,
  Download,
  Maximize2,
  X,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  Star,
  MessageCircle,
  Music2,
  Link2,
  Share2,
  Send,
  Code2,
  Terminal,
  Layers,
  Cpu,
  Box,
  Wand2,
  ZoomIn,
  ZoomOut,
  RotateCcw
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

const pickRandomItems = (items, count = 4) => {
  const source = [...items];
  for (let i = source.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [source[i], source[j]] = [source[j], source[i]];
  }
  return source.slice(0, count);
};

const VIDEO_NAME_RE = /\.(mp4|webm|mov|m4v)$/i;
const IMAGE_NAME_RE = /\.(jpe?g|png|webp)$/i;

const FS_ZOOM_MIN = 0.5;
const FS_ZOOM_MAX = 3;
const FS_ZOOM_STEP = 0.25;

/** Matches server / client copy for try-on when not authenticated. */
const AUTH_TRY_ON_ERROR_RE = /please create an account or log in to use try-on generation/i;

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

export default function TryOnStudio({ user }) {
  const [personFile, setPersonFile] = useState(null);
  const [garmentFile, setGarmentFile] = useState(null);
  const [personPreview, setPersonPreview] = useState(null);
  const [garmentPreview, setGarmentPreview] = useState(null);
  const [personMediaType, setPersonMediaType] = useState("image");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  /** After first Generate (or suggestion try-on), show centered output + loading/result. */
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
  const [comparePosition, setComparePosition] = useState(50);
  const [compareImageWidth, setCompareImageWidth] = useState(0);
  const [resultAspectRatio, setResultAspectRatio] = useState(null);
  const [currentOutfitId, setCurrentOutfitId] = useState(null);
  const [selectedRating, setSelectedRating] = useState(null);
  const [selectedStars, setSelectedStars] = useState(0);
  const [animatedRating, setAnimatedRating] = useState(null);
  const [ratingLocked, setRatingLocked] = useState(false);
  const [improvementSuggestions, setImprovementSuggestions] = useState([]);
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

  const personInputRef = useRef(null);
  const garmentInputRef = useRef(null);
  const isProcessing = useMemo(() => status === "analyzing", [status]);
  const canRun = !!personPreview && !!garmentPreview && !isProcessing;

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
    const resize = () => {
      if (!compareRef.current) return;
      setCompareImageWidth(compareRef.current.getBoundingClientRect().width);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [status, resultImage, personPreview, personMediaType]);

  useEffect(() => {
    if (!resultImage || resultMediaType !== "image") {
      setResultAspectRatio(null);
      return undefined;
    }

    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setResultAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = resultImage;
    return undefined;
  }, [resultImage, resultMediaType]);

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

  useEffect(() => {
    const candidateSuggestions = clothSamples.length
      ? clothSamples.map((sample) => ({ url: sample.url, name: sample.fileName || "Suggested cloth" }))
      : LOCAL_CLOTH_DATASET.map((url, idx) => ({ url, name: `Cloth ${idx + 1}` }));
    setImprovementSuggestions(pickRandomItems(candidateSuggestions, 4));
  }, [clothSamples]);

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
    const validTypes = isPerson ? [...PERSON_IMAGE_TYPES, ...PERSON_VIDEO_TYPES, "application/octet-stream"] : GARMENT_TYPES;
    const maxBytes = isPerson ? PERSON_MAX_BYTES : GARMENT_MAX_BYTES;
    const personOctetOk =
      isPerson && file.type === "application/octet-stream" && (VIDEO_NAME_RE.test(file.name || "") || IMAGE_NAME_RE.test(file.name || ""));
    if (!validTypes.includes(file.type) && !personOctetOk) {
      return setError(isPerson ? "Invalid person file type. Use JPG/PNG/WEBP or MP4/WEBM/MOV." : "Invalid garment file type. Use JPG/PNG/WEBP.");
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
    if (!person || !garment) return setError("Upload both person and garment images first.");
    try {
      setError("");
      setResultVideoError("");
      setStatus("analyzing");
      setCurrentJobId(null);
      setActiveStageIndex(0);
      setStageVisible(true);
      const response = await uploadMyImage({ imageFile: person, garmentFile: garment });
      const job = response?.job;
      if (!job?.resultUrl) throw new Error("Result image URL was not generated");
      const outfitId = new Date().toISOString();
      setStatus("success");
      setComparePosition(50);
      setResultImage(job.resultUrl);
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
      const candidateSuggestions = clothSamples.length
        ? clothSamples.map((sample) => ({ url: sample.url, name: sample.fileName || "Suggested cloth" }))
        : LOCAL_CLOTH_DATASET.map((url, idx) => ({ url, name: `Cloth ${idx + 1}` }));
      setImprovementSuggestions(pickRandomItems(candidateSuggestions, 4));
      setCurrentJobId(resolvedJobId);
    } catch (err) {
      setStatus("error");
      const msg = String(err?.message || "");
      const authLike =
        /please create an account or log in/i.test(msg) ||
        /authentication required|invalid or expired token|unauthorized|^401\b/i.test(msg);
      setError(authLike ? "Please create an account or log in to use try-on generation." : msg || "Try-on generation failed.");
    }
  };

  const runTryOn = async () => {
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
        const is404 = /not found|404|Job not found/i.test(msg);
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
      setImprovementSuggestions([]);
    } catch (err) {
      setError(err?.message || "Could not delete this result from the server.");
    }
  };

  const clearType = (type) => {
    if (type === "person") {
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

  const handleSuggestionClick = async (suggestion) => {
    if (!personFile || !suggestion?.url || isProcessing) return;
    setShowOutputSection(true);
    try {
      const response = await fetch(suggestion.url);
      const blob = await response.blob();
      const contentType = blob.type || "image/jpeg";
      const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
      const suggestionFile = new File([blob], suggestion.name || `suggested-cloth.${extension}`, { type: contentType });
      if (garmentPreview) URL.revokeObjectURL(garmentPreview);
      const nextPreview = URL.createObjectURL(suggestionFile);
      setGarmentFile(suggestionFile);
      setGarmentPreview(nextPreview);
      await executeTryOn({ person: personFile, garment: suggestionFile });
    } catch {
      setError("Could not load suggested cloth image.");
    }
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

  const openShareUrl = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSocialShare = async (platform) => {
    if (!resultImage) return;
    const encodedUrl = encodeURIComponent(resultImage);
    const message = encodeURIComponent(`Check out my AI try-on ${resultMediaType === "video" ? "video" : "look"}!`);

    if (platform === "facebook") {
      openShareUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
      return;
    }
    if (platform === "twitter") {
      openShareUrl(`https://twitter.com/intent/tweet?text=${message}&url=${encodedUrl}`);
      return;
    }
    if (platform === "whatsapp") {
      openShareUrl(`https://api.whatsapp.com/send?text=${message}%20${encodedUrl}`);
      return;
    }

    // TikTok web share is limited: fallback to copy link, then download.
    const copied = await copyImageLink();
    if (!copied) downloadCurrentResult();
    setShareFeedback(copied ? "TikTok fallback: link copied." : `TikTok fallback: ${resultMediaType} downloaded.`);
    window.setTimeout(() => setShareFeedback(""), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div
          className="text-center mb-6 animate-fade-in-up relative isolate overflow-hidden rounded-3xl border border-white/10 bg-[#050814] min-h-[300px] sm:min-h-[340px] flex items-center justify-center px-5 sm:px-6"
          onMouseMove={handleHeroMouseMove}
          onMouseLeave={() => {
            heroTargetRef.current = { x: 50, y: 50 };
          }}
          onTouchStart={handleHeroTouchMove}
          onTouchMove={handleHeroTouchMove}
        >
          {/* Spotlight follows pointer (faster layer) */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(520px circle at ${heroGlow.x}% ${heroGlow.y}%, rgba(99,102,241,0.22), rgba(5,8,20,0.96) 55%)`
            }}
          />
          {/* Slower parallax mesh — Antigravity-style ambient depth */}
          <div
            className="absolute inset-0 opacity-90"
            style={{
              background: `
                radial-gradient(ellipse 80% 50% at ${heroParallax.x * 0.85 + 8}% ${heroParallax.y * 0.7 + 10}%, rgba(236,72,153,0.12), transparent 52%),
                radial-gradient(ellipse 70% 45% at ${100 - heroParallax.x * 0.9}% ${100 - heroParallax.y * 0.75}%, rgba(56,189,248,0.1), transparent 50%)
              `
            }}
          />
          <div
            className="absolute pointer-events-none w-[min(480px,90vw)] h-[min(480px,90vw)] max-w-[520px] max-h-[520px] rounded-full blur-3xl opacity-90"
            style={{
              left: `calc(${heroGlow.x}% - min(240px,45vw))`,
              top: `calc(${heroGlow.y}% - min(240px,45vw))`,
              background:
                "radial-gradient(circle, rgba(124,58,237,0.28) 0%, rgba(59,130,246,0.18) 38%, rgba(236,72,153,0.12) 62%, rgba(255,255,255,0) 72%)"
            }}
          />
          {/* Horizon glow */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-indigo-500/[0.07] via-transparent to-transparent" />
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
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-[rgba(255,255,255,0.14)] to-[rgba(255,255,255,0.03)] shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md sm:h-[3.25rem] sm:w-[3.25rem] animate-antigravity-dock-float"
                style={{ animationDelay: delay }}
              >
                <Icon className="h-[1.15rem] w-[1.15rem] text-white/75 sm:h-5 sm:w-5" strokeWidth={1.5} />
              </div>
            </div>
          ))}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:24px_24px] opacity-[0.28]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(3,7,18,0.55)_100%)]" />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/[0.08] backdrop-blur-md shadow-sm mb-5">
              <Sparkles className="w-4 h-4 text-cyan-200/90" />
              <span className="text-xs font-bold tracking-wider uppercase text-white/85">Weartual Neural Engine v2.0</span>
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl leading-[1.15] font-bold mb-3 font-sans tracking-tight">
              <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-indigo-100 to-cyan-100">
                Achieve flawless fits.
              </span>
              <br />
              <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-cyan-100 via-violet-100 to-fuchsia-100">
                Powered by WEARTUAL.
              </span>
            </h1>
            <p className="text-white/75 max-w-2xl mx-auto text-[0.95rem] sm:text-base leading-relaxed">
              Upload your subject and garment. Our proprietary deep learning pipeline will synthesize a photorealistic rendering in seconds.
            </p>
          </div>
        </div>
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
            ) : (
              error
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {[
            { key: "person", title: "Person Input (Image/Video)", preview: personPreview, ref: personInputRef, samples: personSamples },
            { key: "garment", title: "Garment Image", preview: garmentPreview, ref: garmentInputRef, samples: clothSamples }
          ].map((block) => (
            <div key={block.key} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">{block.title}</h3>
              <div
                className="relative rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/50 min-h-[170px] sm:min-h-[190px] overflow-hidden"
                onClick={() => !block.preview && block.ref.current?.click()}
              >
                <input
                  ref={block.ref}
                  type="file"
                  className="hidden"
                  accept={block.key === "person" ? "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp"}
                  onChange={(e) => setPreview(block.key, e.target.files?.[0] || null)}
                />
                {block.preview ? (
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
                  <div className="h-full min-h-[170px] sm:min-h-[190px] flex items-center justify-center text-slate-500 text-sm">Click to upload</div>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3">
                {Array.from({ length: 8 }).map((_, idx) => {
                  const sample = block.samples[idx];
                  return (
                    <button
                      key={`${block.key}-${idx}`}
                      type="button"
                      className="aspect-square rounded-lg border border-slate-200 overflow-hidden bg-white"
                      onClick={() => sample && useSample(block.key, sample)}
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

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={runTryOn}
            disabled={!canRun}
            className={`inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold ${
              canRun ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-100 text-slate-400 border border-slate-200"
            }`}
          >
            Generate Try-On <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {showOutputSection && (
          <div className="mx-auto mt-10 w-full max-w-5xl">
            <div
              className={`rounded-3xl border border-slate-200 bg-white p-3 flex flex-col dark:border-slate-700 dark:bg-slate-900 ${
                status === "success" && resultImage ? "h-auto" : "min-h-[360px] sm:min-h-[420px]"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Result Preview</h3>
                </div>
                {status === "success" && resultImage && (
                  <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
                    {currentJobId ? (
                      <button
                        type="button"
                        onClick={deleteCurrentResultFromServer}
                        className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete from server
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={downloadCurrentResult}
                      className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-500 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download {resultMediaType === "video" ? "Video" : "Image"}
                    </button>
                    {resultMediaType === "image" && (
                      <button
                        type="button"
                        onClick={openResultFullscreen}
                        className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                      >
                        <Maximize2 className="w-3.5 h-3.5" /> Full Screen
                      </button>
                    )}
                    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1 py-1">
                      <button
                        type="button"
                        onClick={() => handleSocialShare("facebook")}
                        className="p-1.5 rounded-md text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all"
                        aria-label="Share on Facebook"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSocialShare("whatsapp")}
                        className="p-1.5 rounded-md text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                        aria-label="Share on WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSocialShare("twitter")}
                        className="p-1.5 rounded-md text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition-all"
                        aria-label="Share on Twitter"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSocialShare("tiktok")}
                        className="p-1.5 rounded-md text-slate-600 hover:text-violet-600 hover:bg-violet-50 transition-all"
                        aria-label="Share on TikTok"
                      >
                        <Music2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={copyImageLink}
                        className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
                        aria-label="Copy image link"
                      >
                        <Link2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {shareFeedback && <p className="px-1 pb-2 text-xs text-slate-500">{shareFeedback}</p>}
              {status === "success" && resultVideoError && (
                <p className="px-1 pb-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">{resultVideoError}</p>
              )}
              <div
                className={`rounded-2xl bg-slate-100 overflow-hidden dark:bg-slate-800/80 ${
                  isProcessing ? "min-h-[320px]" : status === "success" && resultImage ? "" : "min-h-[260px]"
                }`}
              >
                {isProcessing ? (
                  <div className="w-full h-full min-h-[320px] flex items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
                    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center shadow-2xl relative overflow-hidden">
                      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_10%,rgba(56,189,248,0.25),transparent_38%)]" />
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
                    </div>
                  </div>
                ) : status === "success" && resultImage && resultMediaType === "image" && personPreview && personMediaType === "image" ? (
                  <div
                    ref={compareRef}
                    className="relative w-full overflow-hidden bg-black select-none"
                    style={resultAspectRatio ? { aspectRatio: `${resultAspectRatio}` } : undefined}
                  >
                    <img src={personPreview} alt="Person before try-on" className="block w-full h-auto" draggable={false} />
                    <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${comparePosition}%` }}>
                      <img
                        src={resultImage}
                        alt="Generated try-on result"
                        className="h-full max-w-none object-cover"
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
                      className="w-full h-full min-h-[260px] object-contain bg-black"
                      onError={() =>
                        setResultVideoError(
                          "This video URL loaded but the browser cannot decode it. Typical cause: OpenCV mp4v output. Install FFmpeg on the API server (see server logs) so the pipeline can re-encode to H.264, or try opening the link in Chrome."
                        )
                      }
                    />
                  ) : (
                    <div>
                      <img src={resultImage} alt="Generated try-on" className="w-full h-full object-cover" />
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
              {status === "success" && resultImage && (
                <div className="pt-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">Suggested Improvements</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {improvementSuggestions.map((item, idx) => (
                      <button
                        key={`${item.url}-${idx}`}
                        type="button"
                        onClick={() => handleSuggestionClick(item)}
                        disabled={isProcessing}
                        className="rounded-xl border border-slate-200 bg-white overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800"
                      >
                        <div className="aspect-square bg-slate-100">
                          <img src={item.url} alt={item.name || "Suggested cloth"} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {status === "success" && resultImage && personMediaType === "image" && (
              <div className="mt-4">
                <StyleInsightsPanel personImageUrl={personPreview} clothImageUrl={garmentPreview} />
              </div>
            )}
          </div>
        )}
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
