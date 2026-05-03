import React, { useMemo, useRef, useState, useEffect } from "react";
import { listDatasetSamples, uploadMyImage } from "../services/imageApi";
import { Sparkles, Trash2, Download, ArrowRight } from "lucide-react";

const VALID_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;
const AI_PROGRESS_STAGES = ["Detecting pose...", "Applying cloth...", "Refining output..."];

export default function TryOnStudio() {
  const [personFile, setPersonFile] = useState(null);
  const [garmentFile, setGarmentFile] = useState(null);
  const [personPreview, setPersonPreview] = useState(null);
  const [garmentPreview, setGarmentPreview] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [resultImage, setResultImage] = useState(null);
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
    if (!resultImage) {
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
  }, [resultImage]);

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

  const setPreview = (type, file) => {
    if (!file) return;
    if (!VALID_TYPES.includes(file.type)) return setError("Invalid file type. Please upload JPG/PNG/WEBP.");
    if (file.size > MAX_BYTES) return setError("Image too large. Max size is 10MB.");
    setError("");
    const url = URL.createObjectURL(file);
    if (type === "person") {
      if (personPreview) URL.revokeObjectURL(personPreview);
      setPersonFile(file);
      setPersonPreview(url);
    } else {
      if (garmentPreview) URL.revokeObjectURL(garmentPreview);
      setGarmentFile(file);
      setGarmentPreview(url);
    }
    setStatus("idle");
    setResultImage(null);
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

  const runTryOn = async () => {
    if (!personFile || !garmentFile) return setError("Upload both person and garment images first.");
    try {
      setError("");
      setStatus("analyzing");
      setActiveStageIndex(0);
      setStageVisible(true);
      const response = await uploadMyImage({ imageFile: personFile, garmentFile });
      const job = response?.job;
      if (!job?.resultUrl) throw new Error("Result image URL was not generated");
      setStatus("success");
      setComparePosition(50);
      setResultImage(job.resultUrl);
      setResultFilename(job.resultFilename || "weartual-sys-output.jpg");
    } catch (err) {
      setStatus("error");
      setError(err?.message || "Try-on generation failed.");
    }
  };

  const clearType = (type) => {
    if (type === "person") {
      if (personPreview) URL.revokeObjectURL(personPreview);
      setPersonPreview(null);
      setPersonFile(null);
      if (personInputRef.current) personInputRef.current.value = "";
    } else {
      if (garmentPreview) URL.revokeObjectURL(garmentPreview);
      setGarmentPreview(null);
      setGarmentFile(null);
      if (garmentInputRef.current) garmentInputRef.current.value = "";
    }
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
              { key: "person", title: "Person Image", preview: personPreview, ref: personInputRef, samples: personSamples },
              { key: "garment", title: "Garment Image", preview: garmentPreview, ref: garmentInputRef, samples: clothSamples }
            ].map((block) => (
              <div key={block.key} className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">{block.title}</h3>
                <div className="relative rounded-2xl border border-slate-200 bg-slate-50 min-h-[170px] sm:min-h-[190px] overflow-hidden" onClick={() => !block.preview && block.ref.current?.click()}>
                  <input
                    ref={block.ref}
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setPreview(block.key, e.target.files?.[0] || null)}
                  />
                  {block.preview ? (
                    <>
                      <img src={block.preview} alt={block.title} className="w-full h-full object-contain bg-slate-50" />
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

          <div className="lg:col-span-7">
            <div
              className={`rounded-3xl border border-slate-200 bg-white p-3 shadow-xl flex flex-col ${
                status === "success" && resultImage ? "h-auto" : "h-full"
              }`}
            >
              <div className="flex items-center justify-between px-1 pb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Result Preview</h3>
                {status === "success" && resultImage && (
                  <button
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = resultImage;
                      a.download = resultFilename;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-500"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                )}
              </div>
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
                ) : status === "success" && resultImage && personPreview && garmentPreview ? (
                  <div
                    ref={compareRef}
                    className="relative w-full overflow-hidden bg-black select-none"
                    style={resultAspectRatio ? { aspectRatio: `${resultAspectRatio}` } : undefined}
                  >
                    <img src={garmentPreview} alt="Cloth preview" className="block w-full h-auto" draggable={false} />
                    <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${comparePosition}%` }}>
                      <img
                        src={personPreview}
                        alt="Original uploaded"
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
                      Before
                    </div>
                    <div className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-brand-600/90 text-white">
                      Cloth
                    </div>
                  </div>
                ) : status === "success" && resultImage ? (
                  <img src={resultImage} alt="Generated try-on" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm p-6 text-center">
                    Upload person + garment images on the left, then click Generate to view the output here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
