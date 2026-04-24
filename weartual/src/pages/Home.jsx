import React, { useMemo, useRef, useState, useEffect } from "react";
import { uploadMyImage } from "../services/imageApi";
import { 
  UploadCloud, 
  Trash2, 
  Download, 
  Image as ImageIcon,
  Cpu,
  Scan,
  Wand2,
  Sparkles,
  ArrowRight,
  User,
  Zap
} from "lucide-react";

const VALID_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

const typeError = "Invalid file type. Please upload a JPG, PNG, or WEBP image.";
const sizeError = "Image too large. Max size is 10MB.";

export default function Home() {
  const [personFile, setPersonFile] = useState(null);
  const [garmentFile, setGarmentFile] = useState(null);
  const [personPreview, setPersonPreview] = useState(null);
  const [garmentPreview, setGarmentPreview] = useState(null);

  const [status, setStatus] = useState("idle"); // idle | analyzing | mapping | synthesizing | success | error
  const [processingText, setProcessingText] = useState("");
  const [error, setError] = useState("");
  const [resultImage, setResultImage] = useState(null);
  const [isSavingImage, setIsSavingImage] = useState(false);

  const personInputRef = useRef(null);
  const garmentInputRef = useRef(null);
  const resultRef = useRef(null);

  const isProcessing = useMemo(
    () => ["analyzing", "mapping", "synthesizing"].includes(status),
    [status]
  );
  
  const canRun = !!personPreview && !!garmentPreview && !isProcessing && status !== "success";

  // Terminal-style effect for processing
  useEffect(() => {
    if (status === "analyzing") setProcessingText("Initializing neural network...\\nAnalyzing physiological markers...");
    if (status === "mapping") setProcessingText("Neural feature extraction complete.\\nMapping garment topology onto subject...");
    if (status === "synthesizing") setProcessingText("Topology mapped.\\nRendering high-fidelity synthesized output...");
  }, [status]);

  const validateFile = (file) => {
    if (!file) return null;
    if (!VALID_TYPES.includes(file.type)) return typeError;
    if (file.size > MAX_BYTES) return sizeError;
    return null;
  };

  const setPreview = (type, file) => {
    const err = validateFile(file);
    if (err) {
      setError(err);
      return;
    }

    setError("");

    const url = URL.createObjectURL(file);
    if (type === "person") {
      if (personPreview) URL.revokeObjectURL(personPreview);
      setPersonFile(file);
      setPersonPreview(url);
      setStatus("idle");
      setResultImage(null);
      return;
    }

    if (garmentPreview) URL.revokeObjectURL(garmentPreview);
    setGarmentFile(file);
    setGarmentPreview(url);
    setStatus("idle");
    setResultImage(null);
  };

  const saveJobToDb = async () => {
    if (!personFile || !garmentFile) throw new Error("Both images are required");
    setIsSavingImage(true);
    try {
      const response = await uploadMyImage({ imageFile: personFile, garmentFile });
      return response?.job;
    } catch (err) {
      throw new Error(err?.message || "Could not save job to database");
    } finally {
      setIsSavingImage(false);
    }
  };

  const handleFileSelect = async (type, file) => {
    setPreview(type, file);
  };

  const removeImage = (type) => {
    setError("");
    setStatus("idle");
    setResultImage(null);

    if (type === "person") {
      if (personPreview) URL.revokeObjectURL(personPreview);
      setPersonFile(null);
      setPersonPreview(null);
      if (personInputRef.current) personInputRef.current.value = "";
      return;
    }

    if (garmentPreview) URL.revokeObjectURL(garmentPreview);
    setGarmentFile(null);
    setGarmentPreview(null);
    if (garmentInputRef.current) garmentInputRef.current.value = "";
  };

  const runTryOn = async () => {
    if (!personPreview || !garmentPreview) {
      setError("Require multi-modal inputs to initialize the pipeline.");
      return;
    }
    if (isProcessing) return;

    try {
      setError("");
      setStatus("analyzing");
      const job = await saveJobToDb();
      if (!job?.resultUrl) {
        throw new Error("Result image URL was not generated");
      }

      // Simulated Neural Pipeline
      window.setTimeout(() => {
        setStatus("mapping");
        window.setTimeout(() => {
          setStatus("synthesizing");
          window.setTimeout(() => {
            setResultImage(job.resultUrl);
            setStatus("success");
            window.setTimeout(() => {
              if (resultRef.current) {
                 window.scrollTo({
                   top: resultRef.current.offsetTop - 100,
                   behavior: "smooth"
                 });
              }
            }, 100);
          }, 1800);
        }, 1500);
      }, 1200);
    } catch (uploadErr) {
      setStatus("error");
      setError(uploadErr.message);
    }
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = "weartual-sys-output.jpg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const tryAgain = () => {
    removeImage("garment");
    garmentInputRef.current?.click();
  };

  const startOver = () => {
    removeImage("person");
    removeImage("garment");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-brand-500/30">
      {/* Abstract Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8 relative z-10">
        
        {/* Dynamic AI Hero Section */}
        <div className="text-center mb-16 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-200 bg-white/60 backdrop-blur-md shadow-sm mb-6">
            <Sparkles className="w-4 h-4 text-brand-600" />
            <span className="text-xs font-bold tracking-wider uppercase text-brand-700">Weartual Neural Engine v2.0</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500">
            Achieve flawless fits.<br/>Powered by AI.
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-light leading-relaxed">
            Upload your subject and garment. Our proprietary deep learning pipeline will synthesize a photorealistic rendering in seconds.
          </p>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3 shadow-sm">
             <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse"></div>
             <div className="text-sm text-red-800 font-mono font-medium">{error}</div>
          </div>
        )}

        {/* AI Workspace */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          
          {/* Module 1: Subject */}
          <div className="flex flex-col animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-sm font-mono tracking-widest uppercase text-slate-500 mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-brand-600" />
              Input Parameter: Subject
            </h2>

            <div
              className={`group relative flex flex-col items-center justify-center w-full h-[400px] border border-slate-200 rounded-2xl transition-all duration-500 overflow-hidden shadow-sm ${
                personPreview
                  ? "bg-white shadow-[0_0_30px_rgba(124,58,237,0.1)] ring-4 ring-brand-50"
                  : "bg-white hover:bg-slate-50/80 hover:border-brand-300 hover:shadow-md cursor-pointer"
              }`}
              onClick={() => !personPreview && personInputRef.current?.click()}
            >
              <input
                type="file"
                ref={personInputRef}
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleFileSelect("person", e.target.files?.[0] || null)}
              />

              {personPreview ? (
                <>
                  {isProcessing && <div className="absolute inset-0 bg-brand-100/50 mix-blend-multiply z-10 animate-pulse" />}
                  <img src={personPreview} alt="Subject" className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105" />
                  
                  {/* Scanning Effect during processing */}
                  {isProcessing && (
                     <div className="absolute top-0 left-0 w-full h-1 bg-brand-500 shadow-[0_0_15px_rgba(124,58,237,0.8)] z-20 animate-[scan_2s_ease-in-out_infinite]" />
                  )}

                  {!isProcessing && status !== "success" && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 z-20">
                      <button
                        onClick={(e) => { e.stopPropagation(); personInputRef.current?.click(); }}
                        className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-lg"
                      >
                        Replace
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeImage("person"); }}
                        className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 p-2.5 rounded-xl transition-colors shadow-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center z-10 relative">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500 text-slate-400 group-hover:text-brand-600 shadow-sm group-hover:shadow-[0_0_20px_rgba(124,58,237,0.15)]">
                    <Scan className="w-8 h-8" />
                  </div>
                  <p className="text-base font-semibold text-slate-800 mb-2">Upload Subject Image</p>
                  <p className="text-xs text-slate-500 font-mono tracking-wide">High Resolution JPG/PNG</p>
                </div>
              )}
            </div>
          </div>

          {/* Module 2: Garment */}
          <div className="flex flex-col animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-sm font-mono tracking-widest uppercase text-slate-500 mb-3 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-brand-600" />
              Input Parameter: Garment
            </h2>

            <div
              className={`group relative flex flex-col items-center justify-center w-full h-[400px] border border-slate-200 rounded-2xl transition-all duration-500 overflow-hidden shadow-sm ${
                garmentPreview
                  ? "bg-white shadow-[0_0_30px_rgba(124,58,237,0.1)] ring-4 ring-brand-50"
                  : "bg-white hover:bg-slate-50/80 hover:border-brand-300 hover:shadow-md cursor-pointer"
              }`}
              onClick={() => !garmentPreview && garmentInputRef.current?.click()}
            >
              <input
                type="file"
                ref={garmentInputRef}
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleFileSelect("garment", e.target.files?.[0] || null)}
              />

              {garmentPreview ? (
                <>
                  {isProcessing && <div className="absolute inset-0 bg-brand-100/50 mix-blend-multiply z-10 animate-pulse" />}
                  <img src={garmentPreview} alt="Garment" className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105" />
                  
                  {isProcessing && (
                     <div className="absolute top-0 left-0 w-full h-1 bg-brand-500 shadow-[0_0_15px_rgba(124,58,237,0.8)] z-20 animate-[scan_2s_ease-in-out_infinite_reverse]" />
                  )}

                  {!isProcessing && status !== "success" && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 z-20">
                      <button
                        onClick={(e) => { e.stopPropagation(); garmentInputRef.current?.click(); }}
                        className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-lg"
                      >
                        Replace
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeImage("garment"); }}
                        className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 p-2.5 rounded-xl transition-colors shadow-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center z-10 relative">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500 text-slate-400 group-hover:text-brand-600 shadow-sm group-hover:shadow-[0_0_20px_rgba(124,58,237,0.15)]">
                    <Wand2 className="w-8 h-8" />
                  </div>
                  <p className="text-base font-semibold text-slate-800 mb-2">Upload Garment Image</p>
                  <p className="text-xs text-slate-500 font-mono tracking-wide">Flat-lay or Ghost Mannequin</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Neural Execution Station */}
        <div className="flex flex-col items-center justify-center mb-16 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          {isSavingImage && (
            <p className="font-mono text-xs text-slate-500 mb-3 tracking-wide uppercase">
              Syncing image to database...
            </p>
          )}
          
          <button
            onClick={runTryOn}
            disabled={!canRun}
            className={`relative overflow-hidden group flex items-center gap-3 px-10 py-5 rounded-2xl font-semibold text-lg transition-all duration-300 ${
              canRun
                ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:bg-slate-800 hover:-translate-y-1"
                : isProcessing
                ? "bg-brand-50 text-brand-600 border border-brand-200 cursor-not-allowed shadow-[0_0_30px_rgba(124,58,237,0.2)]"
                : status === "success"
                ? "bg-green-50 text-green-700 border border-green-200 cursor-not-allowed"
                : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
            }`}
          >
            {isProcessing ? (
              <>
                <Cpu className="w-6 h-6 animate-pulse text-brand-600" />
                Processing Tensor Data...
              </>
            ) : status === "success" ? (
              <>
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                Synthesis Complete
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 text-brand-400" />
                Initialize Pipeline
                {canRun && <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />}
              </>
            )}
            
            {/* Button Shine Effect */}
            {canRun && <div className="absolute inset-0 -translate-x-[150%] animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />}
          </button>

          {/* Terminal Readout */}
          <div className="min-h-[60px] mt-6 flex items-center justify-center p-4 rounded-xl">
            {isProcessing ? (
               <div className="font-mono text-sm text-brand-700 text-center leading-relaxed">
                 {processingText.split('\\n').map((line, i) => (
                   <React.Fragment key={i}>
                     <span className="opacity-70">{'> '}</span><span className="font-semibold">{line}</span><br/>
                   </React.Fragment>
                 ))}
               </div>
            ) : (!personPreview || !garmentPreview) && status === "idle" ? (
              <p className="font-mono text-sm text-slate-400 tracking-wide uppercase opacity-80">
                 System Standby // Awaiting dual modality input
              </p>
            ) : null}
          </div>
        </div>

        {/* Synthesized Result */}
        {status === "success" && resultImage && (
          <div ref={resultRef} className="pt-8 mb-20 animate-fade-in-up">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-brand-300" />
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-brand-200 bg-brand-50 text-brand-700 font-mono text-xs font-bold uppercase tracking-widest shadow-sm">
                <Sparkles className="w-4 h-4" /> Output Generated
              </div>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-brand-300" />
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="bg-white border border-slate-200 rounded-3xl p-3 shadow-2xl backdrop-blur-xl">
                <div className="aspect-[3/4] bg-slate-100 rounded-2xl relative overflow-hidden group">
                  <img src={resultImage} alt="Synthesized Try-On" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-[1.02]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  {/* Subtle Grid overlay */}
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGgyMHYyMEgwVTB6IiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTAgLjVoMjBWMGgtMjB6TTAgMjAuNWgyMFYyMGgtMjB6IiBmaWxsPSJyZ2JhKDAsMCwwLDAuMDUpIi8+PHBhdGggZD0iTTAgMHYyMEguNVYweiBNMTkuNSAwLjVWMjBoLjVWMC41eiIgZmlsbD0icmdiYSgwLDAsMCwwLjA1KSIvPjwvc3ZnPg==')] opacity-40 pointer-events-none mix-blend-overlay" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <button
                    onClick={downloadResult}
                    className="md:col-span-3 lg:col-span-1 flex items-center justify-center gap-2 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium transition-colors shadow-md hover:shadow-lg shadow-brand-600/20"
                  >
                    <Download className="w-4 h-4" /> Export Media
                  </button>
                  <button
                    onClick={tryAgain}
                    className="flex items-center justify-center gap-2 py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-semibold transition-colors shadow-sm"
                  >
                    New Garment
                  </button>
                  <button
                    onClick={startOver}
                    className="flex items-center justify-center gap-2 py-4 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-700 hover:text-red-700 rounded-xl font-semibold transition-colors shadow-sm"
                  >
                    Complete Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes shimmer {
          100% { transform: translateX(150%); }
        }
      `}} />
    </div>
  );
}
