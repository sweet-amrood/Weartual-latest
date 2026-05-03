const FALLBACK_USER_ID = "anonymous";

export const getAuthenticatedUserId = (user) => {
  const candidate =
    user?.id ||
    user?._id ||
    user?.userId ||
    user?.uid ||
    user?.sub ||
    user?.googleId ||
    user?.supabaseId;

  const value = String(candidate || "").trim();
  return value || FALLBACK_USER_ID;
};

export const getOutfitHistoryKey = (userId) => `history_${userId}`;

export const getOutfitHistory = (userId) => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(getOutfitHistoryKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const addOutfitHistoryEntry = (userId, entry) => {
  if (typeof window === "undefined") return [];
  const current = getOutfitHistory(userId);
  const next = [entry, ...current];
  window.localStorage.setItem(getOutfitHistoryKey(userId), JSON.stringify(next));
  return next;
};

export const getOutfitRatingsKey = (userId) => `outfit_ratings_${userId}`;

export const getOutfitRatings = (userId) => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(getOutfitRatingsKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getOutfitRating = (userId, outfitId) => {
  if (!outfitId) return null;
  const ratings = getOutfitRatings(userId);
  return ratings.find((item) => item.outfitId === outfitId) || null;
};

export const saveOutfitRating = ({ userId, outfitId, rating, stars, allowUpdate = false }) => {
  if (typeof window === "undefined" || !outfitId) return { saved: false };
  const hasRating = typeof rating === "string" && rating.length > 0;
  const hasStars = Number.isInteger(stars) && stars >= 1 && stars <= 5;
  if (!hasRating && !hasStars) return { saved: false };

  const ratings = getOutfitRatings(userId);
  const existingIndex = ratings.findIndex((item) => item.outfitId === outfitId);
  const existing = existingIndex >= 0 ? ratings[existingIndex] : null;

  if (existing && !allowUpdate) return { saved: false, rating: existing };

  if (existing && allowUpdate) {
    const updated = {
      ...existing,
      ...(hasRating ? { rating } : {}),
      ...(hasStars ? { stars } : {}),
      updatedAt: new Date().toISOString()
    };
    const next = [...ratings];
    next[existingIndex] = updated;
    window.localStorage.setItem(getOutfitRatingsKey(userId), JSON.stringify(next));
    return { saved: true, rating: updated };
  }

  const entry = {
    userId,
    outfitId,
    ...(hasRating ? { rating } : {}),
    ...(hasStars ? { stars } : {}),
    timestamp: new Date().toISOString()
  };
  const next = [entry, ...ratings];
  window.localStorage.setItem(getOutfitRatingsKey(userId), JSON.stringify(next));
  return { saved: true, rating: entry };
};
