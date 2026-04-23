import React from "react";

export default function AboutUs() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-14 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">About Virtual Try-On</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Virtual Try-On helps users preview how a garment may look on a person image before purchase.
          It streamlines decision-making and makes online shopping more confident.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-4">
            1
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload your photo</h3>
          <p className="text-slate-600 text-sm">
            Add a clear person image (front-facing is best) so the system has a strong base for fitting.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-4">
            2
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload a garment</h3>
          <p className="text-slate-600 text-sm">
            Add a garment image (flat lay or model image). The system extracts the item and prepares it for blending.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-4">
            3
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Generate result</h3>
          <p className="text-slate-600 text-sm">
            The pipeline aligns the garment and generates a final preview image. You can download or try another garment.
          </p>
        </div>
      </div>
    </div>
  );
}

