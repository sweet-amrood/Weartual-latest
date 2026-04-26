import { useState } from "react";

export default function AboutUs() {
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-14 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold tracking-widest uppercase mb-5">
          Weartual Research Track
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">About Our Eastern-Wear Virtual Try-On System</h1>
        <p className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
          We are building a virtual try-on platform focused on eastern wear, where graceful drape, intricate detailing,
          and culturally specific silhouettes matter as much as fit. Our work combines robust input handling, dataset-aware
          asset mapping, and StableVITON-ready bundling to deliver realistic previews users can trust.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-3xl font-bold text-slate-900">01</p>
          <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Core domain</p>
          <p className="mt-3 text-slate-700">Eastern wear: kurtas, festive tops, embroidered garments, and layered silhouettes.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-3xl font-bold text-slate-900">02</p>
          <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Technical focus</p>
          <p className="mt-3 text-slate-700">StableVITON-compatible multimodal bundle generation with deterministic file mapping.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-3xl font-bold text-slate-900">03</p>
          <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Product goal</p>
          <p className="mt-3 text-slate-700">Reduce uncertainty in online purchase decisions with reliable visual fit previews.</p>
        </div>
      </div>

      <section className="mb-14">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Interactive System Walkthrough</h2>
        <p className="text-slate-600 mb-6">Select a stage to explore how our pipeline works in production.</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {pipelineStages.map((stage, idx) => (
            <button
              key={stage.id}
              onClick={() => setActiveStage(idx)}
              className={`text-left rounded-2xl border p-5 transition-all ${
                activeStage === idx
                  ? "border-indigo-500 bg-indigo-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50"
              }`}
            >
              <p className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-2">Stage {idx + 1}</p>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{stage.title}</h3>
              <p className="text-sm text-slate-600">{stage.short}</p>
            </button>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-indigo-200 bg-white p-6">
          <h3 className="text-xl font-semibold text-slate-900 mb-3">{pipelineStages[activeStage].title}</h3>
          <p className="text-slate-700 leading-relaxed">{pipelineStages[activeStage].detail}</p>
        </div>
      </section>

      <section className="mb-14">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">What Makes Eastern Wear Harder</h2>
        <p className="text-slate-600 mb-5">Switch between focus areas to see where our team is investing effort.</p>
        <div className="flex flex-wrap gap-3 mb-5">
          <button
            onClick={() => setActiveChallenge("drape")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              activeChallenge === "drape" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Fabric Drape
          </button>
          <button
            onClick={() => setActiveChallenge("embroidery")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              activeChallenge === "embroidery"
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Embroidery
          </button>
          <button
            onClick={() => setActiveChallenge("fit")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              activeChallenge === "fit" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Regional Fit
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">{challengeFocus[activeChallenge].title}</h3>
          <div className="space-y-3">
            {challengeFocus[activeChallenge].points.map((point) => (
              <p key={point} className="text-slate-700 leading-relaxed">
                {point}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqs.map((item, idx) => (
            <div key={item.q} className="rounded-2xl border border-slate-200 bg-white">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                className="w-full text-left px-5 py-4 flex items-center justify-between"
              >
                <span className="font-semibold text-slate-900">{item.q}</span>
                <span className="text-slate-500">{openFaq === idx ? "−" : "+"}</span>
              </button>
              {openFaq === idx && <p className="px-5 pb-5 text-slate-700 leading-relaxed">{item.a}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

