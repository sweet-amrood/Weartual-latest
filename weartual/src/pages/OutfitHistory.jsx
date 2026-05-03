import React, { useEffect, useMemo, useState } from "react";
import { Clock3, History, Sparkles, ThumbsDown, ThumbsUp, Star } from "lucide-react";
import { getAuthenticatedUserId, getOutfitHistory, getOutfitRatings } from "../services/outfitHistory";

const formatTimestamp = (iso) => {
  if (!iso) return "Unknown time";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString();
};

export default function OutfitHistory({ user }) {
  const userId = useMemo(() => getAuthenticatedUserId(user), [user]);
  const [items, setItems] = useState([]);
  const [ratingsByOutfitId, setRatingsByOutfitId] = useState({});

  useEffect(() => {
    setItems(getOutfitHistory(userId));
    const ratings = getOutfitRatings(userId);
    setRatingsByOutfitId(
      ratings.reduce((acc, item) => {
        if (item?.outfitId) acc[item.outfitId] = item;
        return acc;
      }, {})
    );
  }, [userId]);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="max-w-5xl mx-auto rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <History className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Outfit History</h1>
          <p className="text-slate-600">Please log in to view your saved try-on history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Outfit History</h1>
            <p className="text-sm text-slate-500">Saved looks for user ID: {userId}</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <History className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h2 className="text-lg font-semibold text-slate-800 mb-1">No outfits yet</h2>
            <p className="text-slate-500">Generate a try-on result in Studio to start building your history.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((entry, idx) => (
              <article key={`${entry.timestamp}-${idx}`} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="aspect-[4/5] bg-slate-100">
                  <img src={entry.image} alt={entry.name || "Saved outfit"} className="w-full h-full object-cover" loading="lazy" />
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
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
