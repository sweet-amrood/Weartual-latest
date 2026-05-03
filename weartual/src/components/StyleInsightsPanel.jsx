import React, { useEffect, useMemo, useState } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";

const INSIGHT_POOL = [
  "Good color contrast creates strong visual separation.",
  "The palette feels balanced and easy on the eyes.",
  "This combination complements common warm undertones.",
  "The look supports cooler undertones with a polished finish.",
  "Saturation level feels on-trend and wearable.",
  "The muted tone pairing matches modern minimal styling.",
  "Hue separation adds depth and dimension in photos.",
  "The outfit keeps a clean silhouette without visual clutter.",
  "This pairing feels fashion-forward for casual streetwear.",
  "The overall look remains sharp under different lighting.",
  "The color energy is cohesive from top to bottom.",
  "This styling direction matches current social trend aesthetics.",
  "The outfit preserves focus on the face and posture.",
  "The look feels premium while staying everyday-practical."
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toHsl = ({ r, g, b }) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  return { h, s, l };
};

const luminance = ({ r, g, b }) => {
  const toLinear = (v) => {
    const x = v / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
};

const colorDistance = (a, b) => Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);

const pickRandomInsights = (items, count = 4) => {
  const source = [...items];
  for (let i = source.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [source[i], source[j]] = [source[j], source[i]];
  }
  return source.slice(0, count);
};

const getDominantColor = async (imageUrl) => {
  if (!imageUrl) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 24;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);

        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha < 20) continue;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count += 1;
        }
        if (count === 0) return resolve(null);
        resolve({
          r: Math.round(r / count),
          g: Math.round(g / count),
          b: Math.round(b / count)
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
};

const buildInsights = (personColor, clothColor) => {
  if (!personColor || !clothColor) return pickRandomInsights(INSIGHT_POOL, 4);

  const personHsl = toHsl(personColor);
  const clothHsl = toHsl(clothColor);
  const hueGap = Math.abs(personHsl.h - clothHsl.h);
  const hueDelta = Math.min(hueGap, 360 - hueGap);
  const contrast = Math.abs(luminance(personColor) - luminance(clothColor));
  const dist = colorDistance(personColor, clothColor);

  const points = [];

  if (contrast > 0.18 || dist > 90) {
    points.push("Good color contrast creates clear visual separation.");
  } else {
    points.push("Color harmony feels cohesive and easy on the eyes.");
  }

  if ((personHsl.h >= 15 && personHsl.h <= 70) || personHsl.s < 0.22) {
    points.push("The cloth tone complements warm and neutral skin undertones.");
  } else {
    points.push("The palette balances cooler tones with a polished finish.");
  }

  if (clothHsl.s >= 0.28 && clothHsl.s <= 0.68) {
    points.push("Saturation is on-trend: vibrant enough without overpowering.");
  } else {
    points.push("The muted palette matches current minimal fashion trends.");
  }

  if (hueDelta >= 35 && hueDelta <= 140) {
    points.push("Hue separation adds depth, making the outfit pop in photos.");
  } else {
    points.push("Close hue matching delivers a clean monochrome-inspired look.");
  }

  const mergedPool = [...new Set([...points, ...INSIGHT_POOL])];
  return pickRandomInsights(mergedPool, 4);
};

export default function StyleInsightsPanel({ personImageUrl, clothImageUrl }) {
  const [insights, setInsights] = useState(() => pickRandomInsights(INSIGHT_POOL, 4));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!personImageUrl && !clothImageUrl) {
        setInsights(pickRandomInsights(INSIGHT_POOL, 4));
        return;
      }

      setLoading(true);
      const [personColor, clothColor] = await Promise.all([getDominantColor(personImageUrl), getDominantColor(clothImageUrl)]);
      if (!cancelled) {
        setInsights(buildInsights(personColor, clothColor));
        setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [personImageUrl, clothImageUrl]);

  const cardClassName = useMemo(
    () =>
      `rounded-3xl border border-slate-200 bg-white p-4 shadow-xl transition-all duration-500 ${
        loading ? "opacity-85" : "opacity-100"
      }`,
    [loading]
  );

  return (
    <div className={cardClassName}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-brand-600" />
        <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-600">This outfit works because:</h4>
      </div>

      <ul className="space-y-2.5 animate-fade-in-up">
        {insights.map((point) => (
          <li key={point} className="flex items-start gap-2 text-sm text-slate-700">
            <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
