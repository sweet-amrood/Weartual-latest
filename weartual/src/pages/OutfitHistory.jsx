import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  Maximize2,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Star,
  Trash2,
  X,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import {
  getAuthenticatedUserId,
  getOutfitHistory,
  getOutfitRatings,
  removeOutfitHistoryEntryAt,
  removeOutfitRatingByOutfitId,
  setOutfitHistory,
  tryMigrateAnonymousOutfitHistory
} from "../services/outfitHistory";
import { deleteMyImage, deleteMyImageByResultUrl, getMyLookCount, listMyImages } from "../services/imageApi";

const HISTORY_PAGE_SIZE = 24;
const HISTORY_JOB_ID_RE = /^[a-f0-9]{24}$/i;

function HistoryPagination({ page, totalPages, totalItems, onPageChange }) {
  const start = (page - 1) * HISTORY_PAGE_SIZE + 1;
  const end = Math.min(page * HISTORY_PAGE_SIZE, totalItems);

  return (
    <nav
      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
      aria-label="History pages"
    >
      <p className="text-center text-sm text-slate-600 dark:text-slate-400 sm:text-left tabular-nums">
        Showing <span className="font-medium text-slate-800 dark:text-slate-200">{start}–{end}</span> of{" "}
        <span className="font-medium text-slate-800 dark:text-slate-200">{totalItems}</span>
      </p>
      {totalPages > 1 ? (
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-brand-500 dark:hover:bg-slate-700"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
          Previous
        </button>
        <span className="min-w-[7rem] text-center text-sm font-medium text-slate-700 tabular-nums dark:text-slate-300">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-brand-500 dark:hover:bg-slate-700"
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        </button>
      </div>
      ) : null}
    </nav>
  );
}

const normalizeHistoryJobId = (entry) => {
  const raw = entry?.jobId ?? entry?.job_id;
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!HISTORY_JOB_ID_RE.test(s)) return null;
  return s;
};

const isRemoteResultImage = (entry) => {
  const u = String(entry?.image || "").trim();
  return /^https?:\/\//i.test(u) && !u.startsWith("blob:");
};

const isNotFoundServerDelete = (err) => /not found|404|Result not found/i.test(String(err?.message || ""));

const formatTimestamp = (iso) => {
  if (!iso) return "Unknown time";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString();
};

const VIDEO_NAME_RE = /\.(mp4|webm|mov|m4v)$/i;

/** Older history entries only stored `image` URL; infer video so thumbnails render. */
const entryIsVideo = (entry) => {
  if (entry?.resultType === "video" || entry?.mediaType === "video") return true;
  const url = String(entry?.image || "");
  if (VIDEO_NAME_RE.test(url)) return true;
  if (/\/video\/upload\//.test(url)) return true;
  return false;
};

const ratingsToMap = (ratings) =>
  ratings.reduce((acc, item) => {
    if (item?.outfitId) acc[item.outfitId] = item;
    return acc;
  }, {});

const sameHistoryEntry = (a, b) => {
  if (!a || !b) return false;
  if (a.outfitId && b.outfitId) return a.outfitId === b.outfitId;
  return a.timestamp === b.timestamp && String(a.image || "") === String(b.image || "");
};

const stripUrlQuery = (u) => String(u || "").trim().split("?")[0];

const pickJobResultUrl = (job) =>
  String(job?.resultUrl ?? job?.result_url ?? job?.result ?? "").trim();

/** Build a history row from an API job (`listMyImages`). */
const serverJobToHistoryEntry = (job) => {
  const image = pickJobResultUrl(job);
  if (!image) return null;

  const id = job?.id != null ? String(job.id).trim() : null;
  const rawTs = job?.processedAt || job?.processed_at || job?.createdAt || job?.created_at || job?.updatedAt || job?.updated_at;
  const timestamp =
    typeof rawTs === "string"
      ? rawTs
      : rawTs && typeof rawTs.toISOString === "function"
        ? rawTs.toISOString()
        : new Date().toISOString();
  const garment = String(job?.garmentFilename ?? job?.garment_filename ?? "").trim();
  const rType = job?.resultType ?? job?.result_type;
  return {
    image,
    timestamp,
    outfitId: id || timestamp,
    jobId: id || undefined,
    name: garment ? `Try-on: ${garment}` : "Generated outfit look",
    resultType: rType === "video" ? "video" : "image"
  };
};

/** Dedupe keys for one history row (job id, image URL, client outfit id). */
const historyDedupeKeys = (entry) => {
  const keys = [];
  const jid = normalizeHistoryJobId(entry);
  if (jid) keys.push(`job:${jid}`);
  const img = stripUrlQuery(entry?.image);
  if (img) keys.push(`img:${img}`);
  const oid = entry?.outfitId != null ? String(entry.outfitId).trim() : "";
  if (oid) keys.push(`outfit:${oid}`);
  return keys;
};

/** Merge server-backed jobs with any local-only rows so history works across browsers. */
const mergeServerAndLocalHistory = (serverJobs, localEntries) => {
  const seen = new Set();
  const merged = [];

  const consume = (entry) => {
    if (!entry?.image || String(entry.image).trim().length === 0) return;
    const klist = historyDedupeKeys(entry);
    if (klist.some((k) => seen.has(k))) return;
    klist.forEach((k) => seen.add(k));
    merged.push(entry);
  };

  const serverList = Array.isArray(serverJobs) ? serverJobs : [];
  for (const job of serverList) {
    const row = serverJobToHistoryEntry(job);
    if (!row) continue;
    consume(row);
  }

  for (const e of Array.isArray(localEntries) ? localEntries : []) {
    consume(e);
  }

  merged.sort((a, b) => {
    const ta = new Date(a.timestamp || 0).getTime();
    const tb = new Date(b.timestamp || 0).getTime();
    return tb - ta;
  });
  return merged;
};

const IMAGE_ZOOM_MIN = 0.5;
const IMAGE_ZOOM_MAX = 3;
const IMAGE_ZOOM_STEP = 0.25;

export default function OutfitHistory({ user }) {
  const userId = useMemo(() => getAuthenticatedUserId(user), [user]);
  const [items, setItems] = useState([]);
  const [ratingsByOutfitId, setRatingsByOutfitId] = useState({});
  const [deletingIndex, setDeletingIndex] = useState(null);
  const [fullscreenEntry, setFullscreenEntry] = useState(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [lookCount, setLookCount] = useState(null);
  const [page, setPage] = useState(1);
  const [fullscreenImageNatural, setFullscreenImageNatural] = useState(null);
  const [fullscreenImageViewport, setFullscreenImageViewport] = useState({ w: 0, h: 0 });
  const fullscreenImageScrollRef = useRef(null);

  const fullscreenImageSrc =
    fullscreenEntry && !entryIsVideo(fullscreenEntry) ? String(fullscreenEntry.image || "") : null;

  useEffect(() => {
    setFullscreenImageNatural(null);
    if (!fullscreenImageSrc) setFullscreenImageViewport({ w: 0, h: 0 });
  }, [fullscreenImageSrc]);

  const refreshFromStorage = useCallback(() => {
    setItems(getOutfitHistory(userId));
    setRatingsByOutfitId(ratingsToMap(getOutfitRatings(userId)));
  }, [userId]);

  /** Load local rows, then hydrate from server so count and list stay in sync across devices. */
  useEffect(() => {
    if (user && userId && userId !== "anonymous") {
      tryMigrateAnonymousOutfitHistory(userId);
    }

    const local = getOutfitHistory(userId);
    setItems(local);
    setRatingsByOutfitId(ratingsToMap(getOutfitRatings(userId)));

    if (!userId || userId === "anonymous") {
      return undefined;
    }

    let cancelled = false;
    listMyImages()
      .then((data) => {
        if (cancelled) return;
        const serverJobs = Array.isArray(data?.images)
          ? data.images
          : Array.isArray(data?.jobs)
            ? data.jobs
            : Array.isArray(data?.data)
              ? data.data
              : [];
        const merged = mergeServerAndLocalHistory(serverJobs, getOutfitHistory(userId));
        setItems(merged);
        setOutfitHistory(userId, merged);
        setLookCount(merged.length);
      })
      .catch(() => {
        if (!cancelled) {
          /* keep local-only list */
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId, user]);

  useEffect(() => {
    if (!user) {
      setLookCount(null);
      return undefined;
    }
    let cancelled = false;
    const seed =
      typeof user.totalLookCount === "number" && !Number.isNaN(user.totalLookCount)
        ? user.totalLookCount
        : null;
    if (seed !== null) setLookCount(seed);

    getMyLookCount()
      .then((data) => {
        if (!cancelled && typeof data?.lookCount === "number") setLookCount(data.lookCount);
      })
      .catch(() => {
        if (cancelled) return;
        if (seed !== null) setLookCount(seed);
        else setLookCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user, user?.totalLookCount]);

  useEffect(() => {
    if (!fullscreenEntry) return undefined;
    setImageZoom(1);
    const isImage = !entryIsVideo(fullscreenEntry);
    const onKey = (e) => {
      if (e.key === "Escape") setFullscreenEntry(null);
      if (!isImage) return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setImageZoom((z) => Math.min(IMAGE_ZOOM_MAX, Math.round((z + IMAGE_ZOOM_STEP) * 100) / 100));
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setImageZoom((z) => Math.max(IMAGE_ZOOM_MIN, Math.round((z - IMAGE_ZOOM_STEP) * 100) / 100));
      }
      if (e.key === "0" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setImageZoom(1);
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [fullscreenEntry]);

  useLayoutEffect(() => {
    if (!fullscreenImageSrc) return undefined;
    const el = fullscreenImageScrollRef.current;
    if (!el) return undefined;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setFullscreenImageViewport((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [fullscreenImageSrc]);

  const totalPages = Math.max(1, Math.ceil(items.length / HISTORY_PAGE_SIZE));

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * HISTORY_PAGE_SIZE;
    return items.slice(start, start + HISTORY_PAGE_SIZE);
  }, [items, page]);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const goToPage = useCallback((nextPage) => {
    const clamped = Math.min(Math.max(1, nextPage), totalPages);
    setPage(clamped);
    const root = document.getElementById("tour-history-root");
    if (root) {
      root.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [totalPages]);

  const fullscreenImageLayout = useMemo(() => {
    if (!fullscreenImageSrc || !fullscreenImageNatural) {
      return { ready: false, displayW: 0, displayH: 0, fitScale: 1 };
    }
    const nw = fullscreenImageNatural.w;
    const nh = fullscreenImageNatural.h;
    const vw = fullscreenImageViewport.w;
    const vh = fullscreenImageViewport.h;
    if (nw <= 0 || nh <= 0 || vw <= 0 || vh <= 0) {
      return { ready: false, displayW: 0, displayH: 0, fitScale: 1 };
    }
    const fitScale = Math.min(vw / nw, vh / nh);
    const displayW = nw * fitScale * imageZoom;
    const displayH = nh * fitScale * imageZoom;
    return { ready: true, displayW, displayH, fitScale };
  }, [fullscreenImageSrc, fullscreenImageNatural, fullscreenImageViewport, imageZoom]);

  const handleDeleteEntry = async (entry, index) => {
    if (!window.confirm("Remove this result from your history?")) return;
    if (fullscreenEntry && sameHistoryEntry(fullscreenEntry, entry)) setFullscreenEntry(null);
    setDeletingIndex(index);
    try {
      const accountId = getAuthenticatedUserId(user);
      let serverCountUpdated = false;

      if (accountId !== "anonymous") {
        const mongoId = normalizeHistoryJobId(entry);
        if (mongoId) {
          try {
            const data = await deleteMyImage(mongoId);
            if (typeof data?.lookCount === "number") setLookCount(data.lookCount);
            serverCountUpdated = true;
          } catch (err) {
            if (!isNotFoundServerDelete(err)) throw err;
          }
        }
        if (!serverCountUpdated && isRemoteResultImage(entry)) {
          try {
            const data = await deleteMyImageByResultUrl(String(entry.image).trim());
            if (typeof data?.lookCount === "number") setLookCount(data.lookCount);
            serverCountUpdated = true;
          } catch (err) {
            if (!isNotFoundServerDelete(err)) throw err;
          }
        }
      }

      if (entry.outfitId) removeOutfitRatingByOutfitId(userId, entry.outfitId);
      removeOutfitHistoryEntryAt(userId, index);
      refreshFromStorage();

      try {
        const c = await getMyLookCount();
        if (typeof c?.lookCount === "number") setLookCount(c.lookCount);
      } catch {
        /* ignore */
      }
    } catch (err) {
      window.alert(err?.message || "Could not delete this result.");
    } finally {
      setDeletingIndex(null);
    }
  };

  if (!user) {
    return (
      <div id="tour-history-root" className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950 dark:text-slate-100">
        <div className="max-w-5xl mx-auto rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <History className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Outfit History</h1>
          <p className="text-slate-600 dark:text-slate-400">Please log in to view your saved try-on history.</p>
        </div>
      </div>
    );
  }

  return (
    <div id="tour-history-root" className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950 dark:text-slate-100">
      {fullscreenEntry ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/92 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen result"
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5 text-white sm:gap-3 sm:px-4 sm:py-3">
            <p className="order-1 min-w-0 flex-1 basis-full text-sm font-medium sm:order-none sm:basis-auto sm:pr-2">
              {fullscreenEntry.name || "Saved result"}
            </p>
            {!entryIsVideo(fullscreenEntry) ? (
              <div className="order-3 flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-1 py-0.5 sm:order-none">
                <button
                  type="button"
                  onClick={() =>
                    setImageZoom((z) => Math.max(IMAGE_ZOOM_MIN, Math.round((z - IMAGE_ZOOM_STEP) * 100) / 100))
                  }
                  disabled={imageZoom <= IMAGE_ZOOM_MIN}
                  className="rounded-md p-2 text-white/90 hover:bg-white/15 hover:text-white disabled:pointer-events-none disabled:opacity-35 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="min-w-[3rem] select-none text-center text-xs tabular-nums text-white/85">
                  {Math.round(imageZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setImageZoom((z) => Math.min(IMAGE_ZOOM_MAX, Math.round((z + IMAGE_ZOOM_STEP) * 100) / 100))
                  }
                  disabled={imageZoom >= IMAGE_ZOOM_MAX}
                  className="rounded-md p-2 text-white/90 hover:bg-white/15 hover:text-white disabled:pointer-events-none disabled:opacity-35 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageZoom(1)}
                  disabled={imageZoom === 1}
                  className="ml-0.5 rounded-md p-2 text-white/90 hover:bg-white/15 hover:text-white disabled:pointer-events-none disabled:opacity-35 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:ml-1"
                  aria-label="Reset zoom"
                  title="Reset zoom"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setFullscreenEntry(null)}
              className="order-2 ml-auto shrink-0 rounded-lg p-2 text-white/90 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:order-none sm:ml-0"
              aria-label="Close fullscreen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            className="flex min-h-0 flex-1 cursor-default flex-col px-4 pb-4 pt-0 sm:px-8 sm:pb-8"
            onClick={() => setFullscreenEntry(null)}
            role="presentation"
          >
            {entryIsVideo(fullscreenEntry) ? (
              <div
                className="mx-auto flex min-h-0 w-full flex-1 cursor-default items-center justify-center p-2 sm:p-4"
                onClick={(e) => e.stopPropagation()}
                role="presentation"
              >
                <video
                  key={fullscreenEntry.image}
                  src={fullscreenEntry.image}
                  className="weartual-native-fs-fit block h-auto w-auto max-h-[calc(100dvh-7rem)] max-w-[min(100%,calc(100vw-2rem))] rounded-lg object-contain shadow-2xl"
                  controls
                  muted
                  playsInline
                  autoPlay
                  preload="metadata"
                  aria-label={fullscreenEntry.name || "Saved outfit video"}
                />
              </div>
            ) : (
              <div
                ref={fullscreenImageScrollRef}
                className="mx-auto min-h-0 w-full flex-1 cursor-default overflow-auto"
                onClick={(e) => e.stopPropagation()}
                role="presentation"
              >
                <div className="flex min-h-full min-w-full items-center justify-center p-2 sm:p-4">
                  <img
                    src={fullscreenEntry.image}
                    alt={fullscreenEntry.name || "Saved outfit"}
                    onLoad={(e) => {
                      const t = e.currentTarget;
                      setFullscreenImageNatural({
                        w: t.naturalWidth,
                        h: t.naturalHeight
                      });
                    }}
                    style={
                      fullscreenImageLayout.ready
                        ? {
                            width: fullscreenImageLayout.displayW,
                            height: fullscreenImageLayout.displayH,
                            transition: "width 0.12s ease-out, height 0.12s ease-out"
                          }
                        : undefined
                    }
                    className={`block rounded-lg shadow-2xl select-none ${
                      fullscreenImageLayout.ready
                        ? ""
                        : "max-h-[calc(100vh-10rem)] max-w-[min(100vw-2rem,100%)] object-contain"
                    }`}
                    draggable={false}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Outfit History</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Saved looks for{" "}
              <span className="font-medium text-slate-700">
                {user?.username?.trim() || user?.email || "your account"}
              </span>
              {items.length > 0 || lookCount !== null ? (
                <span className="text-slate-600">
                  {" "}
                  · Your looks: {items.length > 0 ? items.length : lookCount}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <History className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">No outfits yet</h2>
            <p className="text-slate-500 dark:text-slate-400">Generate a try-on result in Studio to start building your history.</p>
          </div>
        ) : (
          <div className="space-y-5">
            <HistoryPagination
              page={page}
              totalPages={totalPages}
              totalItems={items.length}
              onPageChange={goToPage}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedItems.map((entry, pageIdx) => {
              const globalIdx = (page - 1) * HISTORY_PAGE_SIZE + pageIdx;
              return (
              <article
                key={entry.outfitId || `${entry.timestamp}-${globalIdx}`}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-transform hover:-translate-y-0.5 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="relative aspect-[4/5] bg-slate-100 group">
                  {entryIsVideo(entry) ? (
                    <video
                      src={entry.image}
                      className="weartual-native-fs-fit h-full w-full object-cover"
                      controls
                      muted
                      playsInline
                      preload="metadata"
                      aria-label={entry.name || "Saved outfit video"}
                    />
                  ) : (
                    <img src={entry.image} alt={entry.name || "Saved outfit"} className="w-full h-full object-cover" loading="lazy" />
                  )}
                  <button
                    type="button"
                    onClick={() => setFullscreenEntry(entry)}
                    className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-black/55 px-2 py-1.5 text-xs font-medium text-white opacity-100 shadow-md backdrop-blur-sm transition-opacity hover:bg-black/70 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                    aria-label="View fullscreen"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    Full screen
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2 line-clamp-2">{entry.name || "Generated outfit look"}</h3>
                  <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                    <Clock3 className="w-3.5 h-3.5" />
                    {formatTimestamp(entry.timestamp)}
                  </p>
                  {(() => {
                    const rating = entry?.outfitId ? ratingsByOutfitId[entry.outfitId] : null;
                    if (!rating) return null;
                    return (
                      <div className="mt-3 flex items-center gap-2 text-xs">
                        {rating.rating === "like" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-1 border border-emerald-200">
                            <ThumbsUp className="w-3.5 h-3.5" /> Liked
                          </span>
                        )}
                        {rating.rating === "dislike" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 px-2 py-1 border border-rose-200">
                            <ThumbsDown className="w-3.5 h-3.5" /> Disliked
                          </span>
                        )}
                        {Number.isInteger(rating.stars) && rating.stars > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-1 border border-amber-200">
                            <Star className="w-3.5 h-3.5 fill-current" /> {rating.stars}/5
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry, globalIdx)}
                      disabled={deletingIndex === globalIdx}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {deletingIndex === globalIdx ? "Removing…" : "Delete result"}
                    </button>
                  </div>
                </div>
              </article>
            );
            })}
            </div>

            <HistoryPagination
              page={page}
              totalPages={totalPages}
              totalItems={items.length}
              onPageChange={goToPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
