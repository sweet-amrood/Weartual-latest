import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  UploadCloud,
  Shirt,
  Sparkles,
  Zap,
  Layers,
  Download
} from "lucide-react";
import { easeOut, fadeUpItem, staggerChildren } from "../lib/motionPresets";

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
    <div ref={wrapperRef} className={`relative overflow-hidden rounded-2xl bg-slate-100 shadow-lg dark:bg-slate-900 dark:shadow-black/30 ${aspectClass}`}>
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
  );
}

export default function LandingPage() {
  const reduceMotion = useReducedMotion();
  const heroContainer = staggerChildren(reduceMotion, 0.07);
  const heroItem = fadeUpItem(reduceMotion);
  const sectionItem = fadeUpItem(reduceMotion);
  const howItWorks = staggerChildren(reduceMotion, 0.08);
  const howCard = fadeUpItem(reduceMotion);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="relative overflow-hidden pt-20 pb-24">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950" />
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-brand-200/50 blur-3xl" />
        <div className="absolute -bottom-20 -right-16 h-72 w-72 rounded-full bg-indigo-200/50 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            id="tour-landing-hero"
            className="text-center max-w-3xl mx-auto"
            variants={heroContainer}
            initial="hidden"
            animate="show"
          >
            <motion.span
              variants={heroItem}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 text-brand-700 text-sm font-semibold mb-6"
            >
              <Sparkles className="w-4 h-4" /> AI-Powered Virtual Try-On
            </motion.span>
            <motion.h1 variants={heroItem} className="text-4xl md:text-6xl leading-tight font-bold mb-6">
              Try Before You Buy -
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-700 to-indigo-600">
                {" "}
                Virtually
              </span>
            </motion.h1>
            <motion.p
              variants={heroItem}
              className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed dark:text-slate-400 mb-10"
            >
              Upload your photo, pick any outfit, and generate realistic try-on previews in seconds.
            </motion.p>
            <motion.div variants={heroItem} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.div whileHover={reduceMotion ? {} : { y: -2 }} whileTap={reduceMotion ? {} : { scale: 0.98 }} className="w-full sm:w-auto">
                <Link
                  to="/studio"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-lg shadow-brand-300 transition-colors"
                >
                  Open Try-On Studio <ArrowRight className="w-5 h-5" />
                </Link>
              </motion.div>
              <motion.div whileHover={reduceMotion ? {} : { y: -2 }} whileTap={reduceMotion ? {} : { scale: 0.98 }} className="w-full sm:w-auto">
                <Link
                  to="/about"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-xl bg-white border border-slate-200 text-slate-800 font-semibold hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Learn More
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={heroContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
          >
            {heroExamples.map((item, idx) => (
              <motion.div
                key={item.id}
                variants={sectionItem}
                className={idx === 1 ? "md:-translate-y-6" : ""}
                whileHover={reduceMotion ? {} : { y: -4, transition: { type: "spring", stiffness: 400, damping: 22 } }}
              >
                <BeforeAfterInteractive
                  beforeImage={item.before}
                  afterImage={item.after}
                  value={55}
                  step={0.1}
                  aspectClass="aspect-[3/4]"
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: reduceMotion ? 0 : 0.4, ease: easeOut }}
          >
            <h2 className="text-3xl font-bold mb-3 text-slate-900 dark:text-slate-100">How It Works</h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed dark:text-slate-400">
              Three quick steps from upload to realistic fit preview.
            </p>
          </motion.div>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            variants={howItWorks}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
          >
            {[
              { icon: UploadCloud, title: "Upload Photo", desc: "Use a clear full-body image." },
              { icon: Shirt, title: "Choose Garment", desc: "Pick from samples or upload your own." },
              { icon: Sparkles, title: "Generate Result", desc: "AI renders your styled output in seconds." }
            ].map((item) => (
              <motion.div
                key={item.title}
                variants={howCard}
                whileHover={reduceMotion ? {} : { y: -3 }}
                className="rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center shadow-md transition-shadow dark:border-slate-600 dark:bg-slate-900"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/25 text-indigo-100 ring-1 ring-indigo-400/30 mx-auto mb-4 flex items-center justify-center dark:bg-indigo-500/20 dark:text-indigo-100 dark:ring-indigo-400/40">
                  <item.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-slate-100">{item.title}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: reduceMotion ? 0 : 0.45, ease: easeOut }}
            >
              <h2 className="text-3xl font-bold mb-4 dark:text-slate-100">Built for realistic styling output</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                The Weartual engine preserves identity, pose, and visual details while adapting garments naturally.
              </p>
              <div className="space-y-5">
                {[
                  { icon: Zap, label: "Fast generation", text: "Get results quickly with guided progress." },
                  { icon: Layers, label: "Detail retention", text: "Maintains original character and framing." },
                  { icon: Download, label: "Export ready", text: "Download generated outputs directly." }
                ].map((feature, i) => (
                  <motion.div
                    key={feature.label}
                    initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: reduceMotion ? 0 : i * 0.06, duration: reduceMotion ? 0 : 0.35, ease: easeOut }}
                    className="flex gap-3"
                  >
                    <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-brand-600 dark:bg-slate-800 dark:border-slate-600">
                      <feature.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{feature.label}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{feature.text}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div
              className="rounded-3xl overflow-hidden border border-slate-200 shadow-xl dark:border-slate-700"
              initial={reduceMotion ? false : { opacity: 0, x: 20, scale: 0.98 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: reduceMotion ? 0 : 0.5, ease: easeOut }}
            >
              <img
                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80"
                alt="Fashion preview"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-brand-600 text-center">
        <motion.div
          className="max-w-3xl mx-auto px-4"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reduceMotion ? 0 : 0.45, ease: easeOut }}
        >
          <h2 className="text-4xl font-bold text-white mb-4">Ready to try your next look?</h2>
          <p className="text-brand-100 text-lg mb-8">Jump into studio mode and generate your first try-on now.</p>
          <motion.div whileHover={reduceMotion ? {} : { scale: 1.02 }} whileTap={reduceMotion ? {} : { scale: 0.98 }} className="inline-block">
            <Link
              to="/studio"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-brand-700 font-semibold shadow-xl transition-colors hover:bg-brand-50"
            >
              Go to Try-On Studio <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
