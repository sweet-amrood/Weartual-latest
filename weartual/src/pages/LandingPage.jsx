import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  UploadCloud,
  Shirt,
  Sparkles,
  Zap,
  Layers,
  Download
} from "lucide-react";

const heroExamples = [
  {
    id: "h1",
    before: "/img1_after.png",
    after: "/img1_before.png"
  },
  {
    id: "h2",
    before: "/img2_after.png",
    after: "/img2_before.png"
  },
  {
    id: "h3",
    before: "/img3_after.png",
    after: "/img3_before.png"
  }
];

function BeforeAfterInteractive({ beforeImage, afterImage, step = 0.1, value = 50, aspectClass = "aspect-[16/10]" }) {
  const [compareWidth, setCompareWidth] = useState(value);
  const [imageWidth, setImageWidth] = useState(0);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const resize = () => {
      if (!wrapperRef.current) return;
      setImageWidth(wrapperRef.current.getBoundingClientRect().width);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div ref={wrapperRef} className={`relative overflow-hidden rounded-xl bg-slate-100 ${aspectClass}`}>
        <img className="absolute inset-0 w-full h-full object-cover" src={beforeImage} alt="Before image" />
        <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${compareWidth}%` }}>
          <img className="h-full max-w-none object-cover" src={afterImage} alt="After image" style={{ width: `${imageWidth}px` }} />
        </div>

        <input
          type="range"
          min="0"
          max="100"
          step={step}
          value={compareWidth}
          onChange={(e) => setCompareWidth(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
          aria-label="Compare before and after"
        />

        <div className="absolute inset-y-0 z-10" style={{ left: `${compareWidth}%`, transform: "translateX(-50%)" }}>
          <div className="h-full w-0.5 bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" />
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg">
            <span className="text-xs font-bold">||</span>
          </div>
        </div>

        <div className="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-slate-900/70 text-white">
          Before
        </div>
        <div className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-brand-600/90 text-white">
          After
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <section className="relative overflow-hidden pt-20 pb-24">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50 via-white to-slate-50" />
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-brand-200/50 blur-3xl" />
        <div className="absolute -bottom-20 -right-16 h-72 w-72 rounded-full bg-indigo-200/50 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto animate-fade-in-up">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 text-brand-700 text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4" /> AI-Powered Virtual Try-On
            </span>
            <h1 className="text-4xl md:text-6xl leading-tight font-bold mb-6">
              Try Before You Buy -
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-700 to-indigo-600">
                {" "}
                Virtually
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-10">
              Upload your photo, pick any outfit, and generate realistic try-on previews in seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/studio"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-lg shadow-brand-300 transition-all hover:-translate-y-0.5"
              >
                Open Try-On Studio <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/about"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-xl bg-white border border-slate-200 text-slate-800 font-semibold hover:bg-slate-50"
              >
                Learn More
              </Link>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
            {heroExamples.map((item, idx) => (
              <div key={item.id} className={idx === 1 ? "md:-translate-y-6" : ""}>
                <BeforeAfterInteractive
                  beforeImage={item.before}
                  afterImage={item.after}
                  value={55}
                  step={0.1}
                  aspectClass="aspect-[3/4]"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">How It Works</h2>
            <p className="text-slate-600">Three quick steps from upload to realistic fit preview.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: UploadCloud, title: "Upload Photo", desc: "Use a clear full-body image." },
              { icon: Shirt, title: "Choose Garment", desc: "Pick from samples or upload your own." },
              { icon: Sparkles, title: "Generate Result", desc: "AI renders your styled output in seconds." }
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center hover:shadow-md transition-shadow">
                <div className="w-14 h-14 rounded-2xl bg-brand-100 text-brand-700 mx-auto mb-4 flex items-center justify-center">
                  <item.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Built for realistic styling output</h2>
              <p className="text-slate-600 mb-8">
                The Weartual engine preserves identity, pose, and visual details while adapting garments naturally.
              </p>
              <div className="space-y-5">
                {[
                  { icon: Zap, label: "Fast generation", text: "Get results quickly with guided progress." },
                  { icon: Layers, label: "Detail retention", text: "Maintains original character and framing." },
                  { icon: Download, label: "Export ready", text: "Download generated outputs directly." }
                ].map((feature) => (
                  <div key={feature.label} className="flex gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-brand-600">
                      <feature.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{feature.label}</h4>
                      <p className="text-sm text-slate-600">{feature.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80"
                alt="Fashion preview"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-brand-600 text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to try your next look?</h2>
          <p className="text-brand-100 text-lg mb-8">Jump into studio mode and generate your first try-on now.</p>
          <Link
            to="/studio"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-brand-700 font-semibold shadow-xl hover:scale-[1.02] transition-transform"
          >
            Go to Try-On Studio <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
