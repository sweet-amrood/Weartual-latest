import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { easeOut, staggerChildren, fadeUpItem } from "../lib/motionPresets";

const viewPort = { once: true, margin: "-48px" };

export default function AboutUs() {
  const reduceMotion = useReducedMotion();
  const [activeStage, setActiveStage] = useState(0);
  const [activeChallenge, setActiveChallenge] = useState("drape");
  const [openFaq, setOpenFaq] = useState(0);

  const pipelineStages = [
    {
      id: "capture",
      title: "Identity-Preserving Input Capture",
      short: "Exact filenames and paired subject-garment intake.",
      detail:
        "Our intake flow keeps the original filename unchanged across local storage, MongoDB metadata, and cloud assets. This lets us map each person and garment image to the correct dataset references without fragile renaming rules."
    },
    {
      id: "mapping",
      title: "Eastern-Wear Asset Mapping",
      short: "Prefix-based retrieval for culturally specific silhouettes.",
      detail:
        "After upload, we map filename prefixes to curated dataset folders like image, agnostic-v3.2, agnostic-mask, densepose, cloth, and cloth-mask. This is especially important for eastern garments where drape lines, sleeve length, and layering differ from western tops."
    },
    {
      id: "bundle",
      title: "StableVITON Input Bundle Assembly",
      short: "Automatic collection of all required modalities.",
      detail:
        "The system automatically gathers jpg, jpeg, png, webp, and json files required by StableVITON. Only required files are uploaded to cloud storage while preserving names and folder-level references for traceability."
    },
    {
      id: "generation",
      title: "Try-On Generation and Iteration",
      short: "Fast preview loop for practical outfit decisions.",
      detail:
        "Generated results are stored with the same naming lineage, making repeated experiments easy. Teams can later swap in real Graphonomy, DensePose, and OpenPose outputs without changing the overall architecture."
    }
  ];

  const challengeFocus = {
    drape: {
      title: "Complex Fabric Drape",
      points: [
        "Eastern wear often uses flowing fabrics and layered folds that move differently than rigid western garments.",
        "Our mapping-first pipeline helps preserve visually natural fall lines around torso and sleeves.",
        "By retaining dataset-relative references, we can continuously improve drape modules without breaking integration."
      ]
    },
    embroidery: {
      title: "Embroidery and Surface Detail",
      points: [
        "Kurtas and festive pieces include dense motifs that are easy to blur in generic try-on systems.",
        "We optimize for preserving high-frequency detail so borders, neckwork, and motifs remain recognizable.",
        "This creates previews that are closer to what users expect when shopping eastern wear online."
      ]
    },
    fit: {
      title: "Regional Fit Variations",
      points: [
        "Eastern silhouettes vary significantly: straight cut, A-line, layered styles, and longer hemlines.",
        "Our modular architecture allows region-specific fit refinement without rewriting upload or storage logic.",
        "That makes the platform practical for scaling to more categories and local brands."
      ]
    }
  };

  const faqs = [
    {
      q: "Why is filename preservation important?",
      a: "It guarantees deterministic mapping between uploaded inputs and related preprocessing assets. This removes ambiguity and makes debugging, reproducibility, and auditability much easier."
    },
    {
      q: "Can this pipeline move beyond dataset-backed inputs?",
      a: "Yes. The architecture is modular. Dataset-based assets can be replaced by live outputs from Graphonomy, DensePose, and OpenPose while keeping the same bundle contract."
    },
    {
      q: "What is the main product focus right now?",
      a: "Our current focus is eastern wear virtual try-on where drape quality, cultural silhouette fidelity, and texture detail preservation are critical to user trust."
    }
  ];

  const stageVariants = fadeUpItem(reduceMotion);
  const tapHover = reduceMotion ? {} : { whileHover: { y: -2 }, whileTap: { scale: 0.99 } };

  return (
    <div className="max-w-6xl mx-auto px-4 py-14 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100">
      <div className="text-center mb-12">
        <motion.div
          className="inline-flex items-center px-4 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold tracking-widest uppercase mb-5 dark:border-indigo-500/35 dark:bg-indigo-950/60 dark:text-indigo-200"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion ? { duration: 0 } : { duration: 0.38, ease: easeOut, delay: 0 }
          }
        >
          Weartual Research Track
        </motion.div>
        <motion.h1
          className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion ? { duration: 0 } : { duration: 0.45, ease: easeOut, delay: 0.06 }
          }
        >
          About Our Eastern-Wear Virtual Try-On System
        </motion.h1>
        <motion.p
          className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed dark:text-slate-400"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion ? { duration: 0 } : { duration: 0.45, ease: easeOut, delay: 0.12 }
          }
        >
          We are building a virtual try-on platform focused on eastern wear, where graceful drape, intricate detailing,
          and culturally specific silhouettes matter as much as fit. Our work combines robust input handling, dataset-aware
          asset mapping, and StableVITON-ready bundling to deliver realistic previews users can trust.
        </motion.p>
      </div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12"
        initial="hidden"
        whileInView="show"
        viewport={viewPort}
        variants={staggerChildren(reduceMotion, 0.09)}
      >
        {[
          {
            n: "01",
            label: "Core domain",
            body: "Eastern wear: kurtas, festive tops, embroidered garments, and layered silhouettes."
          },
          {
            n: "02",
            label: "Technical focus",
            body: "StableVITON-compatible multimodal bundle generation with deterministic file mapping."
          },
          {
            n: "03",
            label: "Product goal",
            body: "Reduce uncertainty in online purchase decisions with reliable visual fit previews."
          }
        ].map((card) => (
          <motion.div
            key={card.n}
            variants={stageVariants}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            {...(reduceMotion ? {} : { whileHover: { y: -3, transition: { duration: 0.2 } } })}
          >
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{card.n}</p>
            <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className="mt-3 text-slate-600 leading-relaxed dark:text-slate-300">{card.body}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.section
        className="mb-14"
        initial="hidden"
        whileInView="show"
        viewport={viewPort}
        variants={staggerChildren(reduceMotion, 0.06)}
      >
        <motion.h2
          variants={stageVariants}
          className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2"
        >
          Interactive System Walkthrough
        </motion.h2>
        <motion.p
          variants={stageVariants}
          className="text-lg text-slate-600 max-w-3xl leading-relaxed dark:text-slate-400 mb-6"
        >
          Select a stage to explore how our pipeline works in production.
        </motion.p>
        <motion.div variants={stageVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {pipelineStages.map((stage, idx) => (
            <motion.button
              key={stage.id}
              type="button"
              onClick={() => setActiveStage(idx)}
              {...tapHover}
              className={`text-left rounded-2xl border p-5 transition-colors ${
                activeStage === idx
                  ? "border-brand-500 bg-brand-50 shadow-sm ring-1 ring-brand-500/30 dark:border-indigo-400 dark:bg-indigo-950/60 dark:ring-indigo-400/40"
                  : "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/80 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500/50 dark:hover:bg-slate-800/90"
              }`}
            >
              <p className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-2 dark:text-slate-400">Stage {idx + 1}</p>
              <h3 className="text-lg font-semibold text-slate-900 mb-2 dark:text-slate-100">{stage.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed dark:text-slate-300">{stage.short}</p>
            </motion.button>
          ))}
        </motion.div>
        <motion.div variants={stageVariants}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStage}
              layout
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: easeOut }}
              className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
            >
              <h3 className="text-xl font-semibold text-slate-900 mb-3 dark:text-slate-100">{pipelineStages[activeStage].title}</h3>
              <p className="text-slate-600 leading-relaxed dark:text-slate-300">{pipelineStages[activeStage].detail}</p>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.section>

      <motion.section
        className="mb-14"
        initial="hidden"
        whileInView="show"
        viewport={viewPort}
        variants={staggerChildren(reduceMotion, 0.06)}
      >
        <motion.h2
          variants={stageVariants}
          className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2"
        >
          What Makes Eastern Wear Harder
        </motion.h2>
        <motion.p
          variants={stageVariants}
          className="text-lg text-slate-600 max-w-3xl leading-relaxed dark:text-slate-400 mb-5"
        >
          Switch between focus areas to see where our team is investing effort.
        </motion.p>
        <motion.div variants={stageVariants} className="flex flex-wrap gap-3 mb-5">
          {[
            { id: "drape", label: "Fabric Drape" },
            { id: "embroidery", label: "Embroidery" },
            { id: "fit", label: "Regional Fit" }
          ].map((tab) => (
            <motion.button
              key={tab.id}
              type="button"
              onClick={() => setActiveChallenge(tab.id)}
              {...tapHover}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeChallenge === tab.id
                  ? "bg-brand-600 text-white shadow-md dark:bg-indigo-500"
                  : "bg-white border border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-brand-50 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200 dark:hover:border-indigo-400/50 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </motion.button>
          ))}
        </motion.div>
        <motion.div variants={stageVariants}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeChallenge}
              layout
              initial={reduceMotion ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: -10 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: easeOut }}
              className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
            >
              <h3 className="text-xl font-semibold text-slate-900 mb-4 dark:text-slate-100">{challengeFocus[activeChallenge].title}</h3>
              <div className="space-y-3">
                {challengeFocus[activeChallenge].points.map((point) => (
                  <p key={point} className="text-slate-600 leading-relaxed dark:text-slate-300">
                    {point}
                  </p>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={viewPort}
        variants={staggerChildren(reduceMotion, 0.05)}
      >
        <motion.h2 variants={stageVariants} className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
          Frequently Asked Questions
        </motion.h2>
        <div className="space-y-3">
          {faqs.map((item, idx) => (
            <motion.div
              key={item.q}
              variants={stageVariants}
              className="rounded-2xl border border-slate-200 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-900"
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors dark:hover:bg-slate-800/80"
              >
                <span className="font-semibold text-slate-900 dark:text-slate-100">{item.q}</span>
                <span className="text-slate-500 dark:text-slate-400">{openFaq === idx ? "−" : "+"}</span>
              </button>
              <AnimatePresence initial={false}>
                {openFaq === idx ? (
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: easeOut }}
                  >
                    <p className="px-5 pb-5 text-slate-600 leading-relaxed dark:text-slate-300">{item.a}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
