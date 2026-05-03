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
