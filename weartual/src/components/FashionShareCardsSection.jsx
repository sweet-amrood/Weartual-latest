import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ImageIcon,
  Link2,
  Loader2,
  Share2,
  Sparkles,
  MessageCircle
} from "lucide-react";
import { listMyImages } from "../services/imageApi";

const CARD_W = 1080;
const CARD_H = 1350;

/** English possessive for card titles (e.g. "Mushi's Outfit of the Day"). */
const possessiveName = (name) => {
  const s = String(name || "Stylist").trim() || "Stylist";
  const last = s.slice(-1).toLowerCase();
  if (last === "s") return `${s}'`;
  return `${s}'s`;
};

/** Inner card layout — rendered twice (preview scale + off-screen export). */
function FashionCardInterior({ imageUrl, username, logoSrc, onResultImageLoad, onResultImageError }) {
  const title = `${possessiveName(username)} Outfit of the Day`;
  const handle = `@${String(username || "weartual").replace(/\s+/g, "")}`;

  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-none bg-gradient-to-br from-[#12081f] via-[#2a1545] to-[#0a0612] text-white"
      style={{ width: CARD_W, height: CARD_H }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 20% 0%, rgba(167,139,250,0.35), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 20%, rgba(244,114,182,0.22), transparent 50%)"
        }}
      />

      <header className="relative z-10 flex shrink-0 items-start justify-between px-12 pb-4 pt-10">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 shadow-xl ring-2 ring-white/25 backdrop-blur-sm">
            <img src={logoSrc} alt="" width={48} height={48} className="h-12 w-12 rounded-xl object-contain" />
          </div>
          <div>
            <p className="font-serif text-4xl font-bold leading-none tracking-tight text-white">Weartual</p>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.42em] text-violet-200/90">Virtual Try-On</p>
          </div>
        </div>
        <Sparkles className="h-10 w-10 shrink-0 text-amber-200/90 drop-shadow-md" strokeWidth={1.25} aria-hidden />
      </header>

      <div className="relative z-10 mx-12 mb-6 min-h-0 flex-1">
        <div
          className="relative h-full w-full overflow-hidden rounded-[2.25rem] shadow-[0_32px_80px_-12px_rgba(0,0,0,0.75)] ring-1 ring-white/15"
          style={{ minHeight: 720 }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              crossOrigin="anonymous"
              className="h-full min-h-[720px] w-full object-contain"
              draggable={false}
              onLoad={onResultImageLoad}
              onError={onResultImageError}
            />
          ) : (
            <div className="flex h-full min-h-[720px] w-full items-center justify-center bg-gradient-to-b from-violet-950/80 to-slate-950">
              <ImageIcon className="h-24 w-24 text-violet-400/40" strokeWidth={1} />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/88 via-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-10 pt-28">
            <p className="font-serif text-[3.25rem] font-semibold italic leading-[1.12] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)]">
              {title}
            </p>
            <p className="mt-5 text-[13px] font-semibold uppercase tracking-[0.38em] text-amber-200/95">{handle}</p>
          </div>
        </div>
      </div>

      <footer className="relative z-10 shrink-0 px-12 pb-10 pt-2 text-center">
        <div className="mx-auto h-px max-w-md bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.45em] text-violet-200/75">Made with Weartual</p>
      </footer>
    </div>
  );
}

function InstagramIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function XIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TikTokIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

function SnapchatIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12.206.793c.99 0 4.347.276 5.524 3.434.11.309.19.65.24 1.018.23 1.868.12 3.016-.12 3.936.75.847 1.95 1.037 2.09 1.037.35 0 .61.287.61.619 0 .35-.29.63-.64.63-1.12 0-1.44.99-1.44 1.44 0 .87.5 1.31 1.31 1.31h.03c.61 0 1.09.48 1.09 1.09 0 .61-.48 1.09-1.09 1.09-.87 0-3.48.25-5.37 2.37-.87.99-2.12 1.5-3.75 1.5h-.25c-1.62 0-2.87-.51-3.75-1.5-1.89-2.12-4.5-2.37-5.37-2.37-.61 0-1.09-.48-1.09-1.09 0-.61.48-1.09 1.09-1.09h.03c.81 0 1.31-.44 1.31-1.31 0-.45-.32-1.44-1.44-1.44-.35 0-.64-.28-.64-.63 0-.33.26-.62.61-.62.14 0 1.34-.19 2.09-1.04-.24-.92-.35-2.07-.12-3.93.05-.37.13-.71.24-1.02C7.86 1.07 11.22.79 12.21.79l-.005.003z" />
    </svg>
  );
}

function WhatsAppIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

/** Link + copy affordance for “copy outfit URL”. */
function LinkCopyIcon({ className }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className || ""}`} aria-hidden>
      <Link2 className="h-5 w-5 shrink-0" strokeWidth={2} />
      <Copy className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2.5} />
    </span>
  );
}

async function cardNodeToPngFile(node, filename) {
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    width: CARD_W,
    height: CARD_H,
    filter: (n) => {
      if (!(n instanceof HTMLElement)) return true;
      return !n.classList.contains("data-html2image-skip");
    }
  });
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: "image/png" });
}

export default function FashionShareCardsSection({ username }) {
  const [jobs, setJobs] = useState([]);
  const [loadingLooks, setLoadingLooks] = useState(true);
  const [looksError, setLooksError] = useState("");
  /** Index into `jobs` (newest-first from API): 0 = latest generated look. */
  const [lookIndex, setLookIndex] = useState(0);
  const [imageReady, setImageReady] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [socialHint, setSocialHint] = useState("");
  const exportRef = useRef(null);
  const previewWrapRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(0.36);
  const [logoSrc, setLogoSrc] = useState("/favicon.svg");

  useEffect(() => {
    setLogoSrc(`${window.location.origin}/favicon.svg`);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLooksError("");
      setLoadingLooks(true);
      try {
        const data = await listMyImages();
        if (cancelled) return;
        const arr = Array.isArray(data?.images) ? data.images : [];
        const imageJobs = arr.filter((j) => j?.resultUrl && (j.resultType || "image") !== "video");
        setJobs(imageJobs);
        setLookIndex(0);
      } catch (e) {
        if (!cancelled) setLooksError(e?.message || "Could not load your looks.");
      } finally {
        if (!cancelled) setLoadingLooks(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(() => {
    if (jobs.length === 0) return null;
    const i = Math.min(Math.max(0, lookIndex), jobs.length - 1);
    return jobs[i];
  }, [jobs, lookIndex]);
  const imageUrl = selected?.resultUrl || "";

  const canGoNewer = lookIndex > 0;
  const canGoOlder = jobs.length > 0 && lookIndex < jobs.length - 1;

  const goNewer = () => {
    setLookIndex((i) => Math.max(0, i - 1));
  };

  const goOlder = () => {
    setLookIndex((i) => Math.min(jobs.length - 1, i + 1));
  };

  useEffect(() => {
    setLookIndex((i) => {
      if (jobs.length === 0) return 0;
      return Math.min(i, jobs.length - 1);
    });
  }, [jobs.length]);

  useEffect(() => {
    setImageReady(false);
    setSocialHint("");
  }, [imageUrl]);

  useEffect(() => {
    const el = previewWrapRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      setPreviewScale(Math.min(1, Math.max(0.24, w / CARD_W)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [jobs.length]);

  const safeUsername = username || "stylist";

  const bumpImageReady = useCallback(() => {
    setImageReady(true);
  }, []);

  const buildExportFile = useCallback(async () => {
    const node = exportRef.current;
    if (!node) throw new Error("Card not ready");
    const fname = `weartual-${String(safeUsername).replace(/[^\w-]+/g, "-")}-outfit-card.png`;
    return cardNodeToPngFile(node, fname);
  }, [safeUsername]);

  const saveFileToDownloads = useCallback((file) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleDownload = async () => {
    setSocialHint("");
    setExportBusy(true);
    try {
      const file = await buildExportFile();
      saveFileToDownloads(file);
      setSocialHint("Saved to your downloads — ready for feeds and stories.");
    } catch (e) {
      setSocialHint(e?.message || "Could not export image. If this persists, the host image may block cross-origin capture.");
    } finally {
      setExportBusy(false);
    }
  };

  const tryShareFile = async (extra = {}) => {
    const file = await buildExportFile();
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], ...extra });
      return true;
    }
    return false;
  };

  const handleNativeShare = async () => {
    setSocialHint("");
    setExportBusy(true);
    try {
      const text = `My look from Weartual — virtual try-on ✨ ${window.location.origin}`;
      const shared = await tryShareFile({ text, title: "Fashion card" });
      if (!shared) {
        const file = await buildExportFile();
        saveFileToDownloads(file);
        setSocialHint("System share not available — downloaded the card instead.");
      }
    } catch (e) {
      if (e?.name === "AbortError") return;
      try {
        const file = await buildExportFile();
        saveFileToDownloads(file);
        setSocialHint("Downloaded the card as fallback.");
      } catch (err) {
        setSocialHint(err?.message || "Share failed.");
      }
    } finally {
      setExportBusy(false);
    }
  };

  const handleShareX = async () => {
    setSocialHint("");
    setExportBusy(true);
    const tweet = `My look from Weartual ✨ Virtual try-on\n${window.location.origin}`;
    try {
      const shared = await tryShareFile({ text: tweet, title: "Share on X" });
      if (!shared) {
        const q = encodeURIComponent(tweet);
        window.open(`https://twitter.com/intent/tweet?text=${q}`, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      if (e?.name !== "AbortError") {
        const q = encodeURIComponent(tweet);
        window.open(`https://twitter.com/intent/tweet?text=${q}`, "_blank", "noopener,noreferrer");
      }
    } finally {
      setExportBusy(false);
    }
  };

  const openAfterExport = async (hint, webUrl) => {
    setSocialHint("");
    setExportBusy(true);
    try {
      const shared = await tryShareFile({ title: "Share look" });
      if (shared) {
        setSocialHint("Choose Instagram, TikTok, Snapchat, or Save Image from your share sheet.");
      } else {
        const file = await buildExportFile();
        saveFileToDownloads(file);
        setSocialHint(hint);
        if (webUrl) window.open(webUrl, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      if (e?.name !== "AbortError") {
        try {
          const file = await buildExportFile();
          saveFileToDownloads(file);
          setSocialHint(hint);
          if (webUrl) window.open(webUrl, "_blank", "noopener,noreferrer");
        } catch (err) {
          setSocialHint(err?.message || "Could not prepare image.");
        }
      }
    } finally {
      setExportBusy(false);
    }
  };

  const handleShareInstagram = () =>
    openAfterExport(
      "Image saved. In Instagram, tap + → Post and pick the card from your gallery.",
      "https://www.instagram.com/"
    );

  const handleShareTikTok = () =>
    openAfterExport(
      "Image saved. In TikTok, tap + → Upload and select the card from your device.",
      "https://www.tiktok.com/tiktokstudio/upload"
    );

  const handleShareSnapchat = () =>
    openAfterExport(
      "Image saved. Open Snapchat and add the card from your camera roll or memories.",
      "https://www.snapchat.com/"
    );

  const handleCopyOutfitLink = async () => {
    if (!imageUrl) return;
    setSocialHint("");
    try {
      await navigator.clipboard.writeText(imageUrl);
      setSocialHint("Outfit image link copied — paste it in chat, email, or notes.");
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = imageUrl;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setSocialHint("Outfit image link copied.");
      } catch {
        setSocialHint("Could not copy automatically — long-press the image or open it in a new tab to copy the URL.");
      }
    }
  };

  const handleShareWhatsApp = () => {
    if (!imageUrl) return;
    setSocialHint("");
    const text = `My look from Weartual — virtual try-on ✨\n${imageUrl}\n${window.location.origin}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const shareButtons = [
    {
      id: "instagram",
      label: "Instagram",
      onClick: handleShareInstagram,
      icon: InstagramIcon,
      className:
        "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white shadow-lg shadow-pink-500/25 hover:brightness-110"
    },
    {
      id: "tiktok",
      label: "TikTok",
      onClick: handleShareTikTok,
      icon: TikTokIcon,
      className: "bg-[#010101] text-white ring-1 ring-white/15 hover:bg-zinc-900"
    },
    {
      id: "snapchat",
      label: "Snapchat",
      onClick: handleShareSnapchat,
      icon: SnapchatIcon,
      className: "bg-[#FFFC00] text-black hover:bg-[#fff566] shadow-md shadow-yellow-400/20"
    },
    {
      id: "x",
      label: "X",
      onClick: handleShareX,
      icon: XIcon,
      className: "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      onClick: handleShareWhatsApp,
      icon: WhatsAppIcon,
      className: "bg-[#25D366] text-white shadow-md shadow-emerald-600/20 hover:bg-[#20bd5a]",
      requireCardReady: false
    },
    {
      id: "copylink",
      label: "Copy link",
      onClick: handleCopyOutfitLink,
      icon: LinkCopyIcon,
      className:
        "border border-slate-200 bg-slate-50 text-slate-800 hover:bg-white hover:border-brand-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-brand-500",
      requireCardReady: false
    }
  ];

  return (
    <section className="animate-share-card-section rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6 dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-1 flex items-center gap-2">
            <Share2 className="w-4 h-4" /> Shareable fashion cards
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
            Turn a saved try-on into a polished 4:5 card with Weartual branding, your handle, and an editorial title. On mobile,
            use platform buttons to open the system share sheet when available; otherwise the card downloads and the destination
            site opens for quick posting.
          </p>
        </div>
      </div>

      {looksError ? (
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{looksError}</p>
      ) : null}

      {loadingLooks ? (
        <div className="flex items-center gap-2 text-slate-500 py-8 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
          <span className="text-sm">Loading your looks…</span>
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center dark:border-slate-600 dark:bg-slate-800/50">
          <ImageIcon className="w-10 h-10 mx-auto text-slate-400 mb-3" strokeWidth={1.25} />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No saved outfit images yet</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Generate a look in Try-On Studio — it will appear here for sharing.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-center text-xs text-slate-500 dark:text-slate-400">
            Showing your latest look first. Use arrows to browse older try-ons.
          </p>

          <div className="fixed left-[-10000px] top-0 z-[-1] overflow-hidden opacity-0 pointer-events-none" aria-hidden>
            <div ref={exportRef}>
              <FashionCardInterior
                imageUrl={imageUrl}
                username={safeUsername}
                logoSrc={logoSrc}
                onResultImageLoad={bumpImageReady}
                onResultImageError={bumpImageReady}
              />
            </div>
          </div>

          <div className="mx-auto mb-6 flex w-full max-w-full items-center justify-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={goNewer}
              disabled={!canGoNewer}
              aria-label="Newer look"
              title="Newer look"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm transition-all duration-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 active:scale-95 disabled:pointer-events-none disabled:opacity-30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-brand-500 dark:hover:bg-slate-700"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden />
            </button>

            <div
              ref={previewWrapRef}
              className="relative min-w-0 flex-1 transition-[box-shadow] duration-500 ease-out"
            >
              <div
                className="mx-auto overflow-hidden rounded-2xl shadow-2xl shadow-violet-900/20 ring-1 ring-white/10 transition-all duration-500 ease-out hover:shadow-violet-900/35 hover:ring-violet-300/30"
                style={{
                  width: CARD_W * previewScale,
                  height: CARD_H * previewScale
                }}
              >
                <div
                  className="origin-top-left transition-opacity duration-500 ease-out"
                  style={{
                    transform: `scale(${previewScale})`,
                    opacity: imageReady ? 1 : 0.88
                  }}
                >
                  <FashionCardInterior
                    imageUrl={imageUrl}
                    username={safeUsername}
                    logoSrc={logoSrc}
                    onResultImageLoad={bumpImageReady}
                    onResultImageError={bumpImageReady}
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={goOlder}
              disabled={!canGoOlder}
              aria-label="Older look"
              title="Older look"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm transition-all duration-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 active:scale-95 disabled:pointer-events-none disabled:opacity-30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-brand-500 dark:hover:bg-slate-700"
            >
              <ChevronRight className="h-6 w-6" aria-hidden />
            </button>
          </div>

          <p className="mb-2 text-center text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {jobs.length > 0
              ? `${Math.min(Math.max(0, lookIndex), jobs.length - 1) + 1} / ${jobs.length}`
              : ""}{" "}
            · 1080×1350 card
          </p>
        </>
      )}

      {!loadingLooks && jobs.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-3">
            <button
              type="button"
              onClick={handleDownload}
              disabled={exportBusy || !imageUrl || !imageReady}
              className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:from-violet-500 hover:to-fuchsia-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {exportBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download card
            </button>
            {"share" in navigator ? (
              <button
                type="button"
                onClick={handleNativeShare}
                disabled={exportBusy || !imageUrl || !imageReady}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition-all duration-200 hover:bg-white hover:border-brand-300 active:scale-[0.98] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-brand-500 disabled:opacity-50"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                Share…
              </button>
            ) : null}
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Share to</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {shareButtons.map(({ id, label, onClick, icon: Icon, className, requireCardReady = true }) => {
              const needsReady = requireCardReady && !imageReady;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={onClick}
                  disabled={exportBusy || !imageUrl || needsReady}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-45 disabled:pointer-events-none ${className}`}
                >
                  {id === "copylink" ? <Icon /> : <Icon className="w-5 h-5 shrink-0" />}
                  {label}
                </button>
              );
            })}
          </div>

          {!imageReady && imageUrl ? (
            <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden />
              Loading outfit preview for export…
            </p>
          ) : null}

          {socialHint ? (
            <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400/90 transition-opacity duration-300">{socialHint}</p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
