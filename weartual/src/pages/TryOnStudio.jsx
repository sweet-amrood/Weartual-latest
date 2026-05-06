import React, { useMemo, useRef, useState, useEffect } from "react";
import { listDatasetSamples, uploadMyImage } from "../services/imageApi";
import { Sparkles, Trash2, Download, Maximize2, X, ArrowRight, ThumbsUp, ThumbsDown, Star, MessageCircle, Music2, Link2, Share2, Send } from "lucide-react";
import StyleInsightsPanel from "../components/StyleInsightsPanel";
import { addOutfitHistoryEntry, getAuthenticatedUserId, getOutfitRating, saveOutfitRating } from "../services/outfitHistory";

const PERSON_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PERSON_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const GARMENT_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PERSON_MAX_BYTES = 100 * 1024 * 1024;
const GARMENT_MAX_BYTES = 10 * 1024 * 1024;
const AI_PROGRESS_STAGES = ["Detecting pose...", "Applying cloth...", "Refining output..."];
const LOCAL_CLOTH_DATASET = [
  "/dataset/cloth/00001_00.jpg",
  "/dataset/cloth/00002_00.jpg",
  "/dataset/cloth/00003_00.jpg",
  "/dataset/cloth/00004_00.jpg",
  "/dataset/cloth/00005_00.jpg",
  "/dataset/cloth/00006_00.jpg",
  "/dataset/cloth/00007_00.jpg",
  "/dataset/cloth/00008_00.jpg"
];

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
  const [resultImage, setResultImage] = useState(null);
  const [resultMediaType, setResultMediaType] = useState("image");
  const [resultFilename, setResultFilename] = useState("weartual-sys-output.jpg");
  const [personSamples, setPersonSamples] = useState([]);
  const [clothSamples, setClothSamples] = useState([]);
  const [heroGlow, setHeroGlow] = useState({ x: 50, y: 50 });
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
  const heroTargetRef = useRef({ x: 50, y: 50 });
  const compareRef = useRef(null);

  const personInputRef = useRef(null);
  const garmentInputRef = useRef(null);
  const isProcessing = useMemo(() => status === "analyzing", [status]);
  const canRun = !!personPreview && !!garmentPreview && !isProcessing;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [people, cloth] = await Promise.all([listDatasetSamples("image", 0), listDatasetSamples("cloth", 8)]);
        if (!cancelled) {
          setPersonSamples(people?.samples || []);
          setClothSamples(cloth?.samples || []);
        }
      } catch {
        if (!cancelled) {
          setPersonSamples([]);
          setClothSamples([]);
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
        x: prev.x + (heroTargetRef.current.x - prev.x) * 0.14,
        y: prev.y + (heroTargetRef.current.y - prev.y) * 0.14
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
  }, [status, resultImage, garmentPreview]);

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
      addOutfitHistoryEntry(getAuthenticatedUserId(user), {
        image: job.resultUrl,
        timestamp: outfitId,
        outfitId,
        name: garment?.name ? `Try-on: ${garment.name}` : "Generated outfit look",
        resultType: job.resultType === "video" || inferResultIsVideo(job) ? "video" : "image"
      });
      const candidateSuggestions = clothSamples.length
        ? clothSamples.map((sample) => ({ url: sample.url, name: sample.fileName || "Suggested cloth" }))
        : LOCAL_CLOTH_DATASET.map((url, idx) => ({ url, name: `Cloth ${idx + 1}` }));
      setImprovementSuggestions(pickRandomItems(candidateSuggestions, 4));
    } catch (err) {
      setStatus("error");
      setError(err?.message || "Try-on generation failed.");
    }
  };

  const runTryOn = async () => {
    if (!personFile || !garmentFile) return setError("Upload both person and garment images first.");
    await executeTryOn({ person: personFile, garment: garmentFile });
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div
          className="text-center mb-6 animate-fade-in-up relative isolate overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 min-h-[280px] sm:min-h-[320px] flex items-center justify-center px-5 sm:px-6"
          onMouseMove={handleHeroMouseMove}
          onMouseLeave={() => {
            heroTargetRef.current = { x: 50, y: 50 };
          }}
          onTouchStart={handleHeroTouchMove}
          onTouchMove={handleHeroTouchMove}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(560px circle at ${heroGlow.x}% ${heroGlow.y}%, rgba(129,140,248,0.26), rgba(2,6,23,0.97) 58%)`
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(244,114,182,0.16),transparent_45%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_75%,rgba(56,189,248,0.14),transparent_48%)]" />
          <div
            className="absolute pointer-events-none w-[420px] h-[420px] rounded-full blur-3xl"
            style={{
              left: `calc(${heroGlow.x}% - 210px)`,
              top: `calc(${heroGlow.y}% - 210px)`,
              background:
                "radial-gradient(circle, rgba(124,58,237,0.32) 0%, rgba(59,130,246,0.24) 35%, rgba(236,72,153,0.2) 58%, rgba(255,255,255,0) 75%)"
            }}
          />
          <div
            className="absolute inset-0 opacity-20 select-none pointer-events-none"
            style={{
              transform: `translate(${(heroGlow.x - 50) * 0.06}px, ${(heroGlow.y - 50) * 0.05}px)`,
              transition: "transform 120ms linear"
            }}
          >
            <p className="absolute -top-4 left-6 text-[72px] sm:text-[104px] font-black tracking-tight text-white/20">WEARTUAL</p>
            <p className="absolute top-20 right-7 text-[50px] sm:text-[76px] font-extrabold tracking-tight text-white/20">VIRTUAL</p>
            <p className="absolute bottom-1 left-10 text-[40px] sm:text-[60px] font-bold tracking-tight text-white/20">TRY-ON</p>
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px] opacity-35" />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/30 bg-white/10 backdrop-blur-md shadow-sm mb-5">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-xs font-bold tracking-wider uppercase text-white/90">Weartual Neural Engine v2.0</span>
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl leading-[1.15] font-bold mb-3 text-slate-900">
              <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-fuchsia-200 to-cyan-200">
                Achieve flawless fits.
              </span>
              <br />
              <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-indigo-200 to-fuchsia-200">
                Powered by WEARTUAL.
              </span>
            </h1>
            <p className="text-white/85 max-w-2xl mx-auto">
              Upload your subject and garment. Our proprietary deep learning pipeline will synthesize a photorealistic rendering in seconds.
            </p>
          </div>
        </div>
        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 p-3 text-sm">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:h-[calc(100vh-390px)] lg:min-h-[520px]">
          <div className="lg:col-span-5 flex flex-col gap-4 lg:overflow-auto pr-1">
            {[
              { key: "person", title: "Person Input (Image/Video)", preview: personPreview, ref: personInputRef, samples: personSamples },
              { key: "garment", title: "Garment Image", preview: garmentPreview, ref: garmentInputRef, samples: clothSamples }
            ].map((block) => (
              <div key={block.key} className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">{block.title}</h3>
                <div className="relative rounded-2xl border border-slate-200 bg-slate-50 min-h-[170px] sm:min-h-[190px] overflow-hidden" onClick={() => !block.preview && block.ref.current?.click()}>
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
                      <button onClick={(e) => { e.stopPropagation(); clearType(block.key); }} className="absolute top-3 right-3 p-2 rounded-lg bg-white border border-slate-200 text-slate-700">
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
                      <button key={`${block.key}-${idx}`} type="button" className="aspect-square rounded-lg border border-slate-200 overflow-hidden bg-white" onClick={() => sample && useSample(block.key, sample)}>
                        {sample ? <img src={sample.url} alt={sample.fileName} className="w-full h-full object-contain bg-slate-50" /> : <div className="w-full h-full bg-slate-100" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <button
              onClick={runTryOn}
              disabled={!canRun}
              className={`inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold ${
                canRun ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-100 text-slate-400 border border-slate-200"
              }`}
            >
              Generate Try-On <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-4">
            <div
              className={`rounded-3xl border border-slate-200 bg-white p-3 shadow-xl flex flex-col ${
                status === "success" && resultImage ? "h-auto" : "h-full"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Result Preview</h3>
                {status === "success" && resultImage && (
                  <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
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
                className={`rounded-2xl bg-slate-100 overflow-hidden ${
                  isProcessing ? "h-full min-h-[320px] lg:min-h-0" : status === "success" && resultImage ? "" : "min-h-[320px]"
                }`}
              >
                {isProcessing ? (
                  <div className="w-full h-full flex items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
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
                ) : status === "success" && resultImage && resultMediaType === "image" && garmentPreview ? (
                  <div
                    ref={compareRef}
                    className="relative w-full overflow-hidden bg-black select-none"
                    style={resultAspectRatio ? { aspectRatio: `${resultAspectRatio}` } : undefined}
                  >
                    <img src={garmentPreview} alt="Cloth preview" className="block w-full h-auto" draggable={false} />
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
                      After
                    </div>
                    <div className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-brand-600/90 text-white">
                      Before
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
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm p-6 text-center">
                    Upload person + garment images on the left, then click Generate to view the output here.
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
                  <div className={`ml-1 inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-1.5 ${animatedRating === "stars" ? "scale-105" : "scale-100"} transition-all duration-200`}>
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
                        className="rounded-xl border border-slate-200 bg-white overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
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
            {status === "success" && resultImage && personMediaType === "image" && <StyleInsightsPanel personImageUrl={personPreview} clothImageUrl={garmentPreview} />}
          </div>
        </div>
      </div>
      {isImageFullscreenOpen && resultImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setIsImageFullscreenOpen(false)}
            className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-lg border border-white/30 bg-black/40 px-3 py-1.5 text-white text-sm hover:bg-black/60"
          >
            <X className="w-4 h-4" /> Close
          </button>
          <img src={resultImage} alt="Generated try-on full view" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
}
