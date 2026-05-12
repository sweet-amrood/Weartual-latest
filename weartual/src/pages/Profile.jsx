import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import {
  Camera,
  History,
  Info,
  LayoutGrid,
  Lightbulb,
  Loader2,
  LogIn,
  Mail,
  Save,
  Sparkles,
  Trash2,
  User,
  Shield
} from "lucide-react";
import { getMe, patchMe, uploadMyAvatar, linkGoogleAccount } from "../services/authApi";
import FashionShareCardsSection from "../components/FashionShareCardsSection";

/** Built-in illustrated avatars (DiceBear); stored as `avatarUrl` via PATCH. */
const DEFAULT_AVATAR_OPTIONS = [
  { id: "aurora", label: "Aurora", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=WeartualAurora&radius=50&backgroundColor=b6e3f4" },
  { id: "river", label: "River", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=WeartualRiver&radius=50&backgroundColor=c0aede" },
  { id: "sage", label: "Sage", url: "https://api.dicebear.com/7.x/notionists/svg?seed=WeartualSage&radius=50" },
  { id: "nova", label: "Nova", url: "https://api.dicebear.com/7.x/notionists/svg?seed=WeartualNova&radius=50" },
  { id: "orbit", label: "Orbit", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=WeartualOrbit&radius=50&backgroundColor=ffd5dc" },
  { id: "pixel", label: "Pixel", url: "https://api.dicebear.com/7.x/pixel-art/svg?seed=WeartualPixel&radius=50" }
];

export default function Profile({ user, onUserUpdated }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [username, setUsername] = useState(() => user?.username ?? "");
  const [email, setEmail] = useState(() => user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [googleLinkBusy, setGoogleLinkBusy] = useState(false);
  const [googleLinkError, setGoogleLinkError] = useState("");
  const [googleLinkMessage, setGoogleLinkMessage] = useState("");

  const applyUser = useCallback((u) => {
    if (!u) return;
    setUsername(u.username || "");
    setEmail(u.email || "");
  }, []);

  useEffect(() => {
    if (user) applyUser(user);
  }, [user, applyUser]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoadError("");
      setLoading(true);
      try {
        const res = await getMe();
        if (!cancelled) {
          applyUser(res.user);
          onUserUpdated?.(res.user);
        }
      } catch (e) {
        if (!cancelled) setLoadError(e?.message || "Could not load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [applyUser, onUserUpdated]);

  useEffect(() => {
    if (user?.googleLinked) {
      setGoogleLinkError("");
      setGoogleLinkMessage("");
    }
  }, [user?.googleLinked]);

  const displayUser = user;

  const handleLinkGoogle = async (credentialResponse) => {
    const token = credentialResponse?.credential;
    if (!token) {
      setGoogleLinkError("Google did not return a credential.");
      return;
    }
    setGoogleLinkError("");
    setGoogleLinkMessage("");
    setGoogleLinkBusy(true);
    try {
      const res = await linkGoogleAccount({ token });
      if (res?.user) onUserUpdated?.(res.user);
      setGoogleLinkMessage(res?.message || "Google account linked.");
    } catch (err) {
      setGoogleLinkError(err?.message || "Could not link Google account.");
    } finally {
      setGoogleLinkBusy(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileMessage("");
    const nextUser = {
      username: username.trim(),
      email: email.trim().toLowerCase()
    };
    const payload = {};
    if (nextUser.username !== (displayUser?.username || "")) payload.username = nextUser.username;
    if (nextUser.email !== (displayUser?.email || "").toLowerCase()) payload.email = nextUser.email;

    if (Object.keys(payload).length === 0) {
      setProfileMessage("Nothing to save.");
      return;
    }

    if (payload.username || payload.email) {
      if (!currentPassword) {
        setProfileError("Enter your current password to change username or email.");
        return;
      }
      payload.currentPassword = currentPassword;
    }

    setSavingProfile(true);
    try {
      const res = await patchMe(payload);
      if (res?.user) onUserUpdated?.(res.user);
      applyUser(res.user);
      setCurrentPassword("");
      setProfileMessage("Profile updated.");
    } catch (err) {
      setProfileError(err?.message || "Could not update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarError("");
    setAvatarMessage("");
    setAvatarBusy(true);
    try {
      const res = await uploadMyAvatar(file);
      if (res?.user) {
        onUserUpdated?.(res.user);
        applyUser(res.user);
      }
      setAvatarMessage("Photo updated.");
    } catch (err) {
      setAvatarError(err?.message || "Upload failed");
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleSelectDefaultAvatar = async (url) => {
    setAvatarError("");
    setAvatarMessage("");
    setAvatarBusy(true);
    try {
      const res = await patchMe({ avatarUrl: url });
      if (res?.user) {
        onUserUpdated?.(res.user);
        applyUser(res.user);
      }
      setAvatarMessage("Default avatar applied.");
    } catch (err) {
      setAvatarError(err?.message || "Could not set avatar");
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarError("");
    setAvatarMessage("");
    setAvatarBusy(true);
    try {
      const res = await patchMe({ avatarUrl: null });
      if (res?.user) {
        onUserUpdated?.(res.user);
        applyUser(res.user);
      }
      setAvatarMessage("Photo removed.");
    } catch (err) {
      setAvatarError(err?.message || "Could not remove photo");
    } finally {
      setAvatarBusy(false);
    }
  };

  if (loading && !displayUser) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-slate-600">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" aria-hidden />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950 dark:text-slate-100">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Profile</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage your account, photo, and explore the app.</p>
          </div>
        </div>

        {loadError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{loadError}</div>
        )}

        {/* Avatar */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
            <Camera className="w-4 h-4" /> Photo
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="shrink-0">
              {displayUser?.avatarUrl ? (
                <img
                  src={displayUser.avatarUrl}
                  alt=""
                  className="w-28 h-28 rounded-2xl object-cover border border-slate-200 shadow-sm"
                />
              ) : (
                <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-brand-100 to-indigo-100 border border-slate-200 flex items-center justify-center text-3xl font-bold text-brand-800">
                  {(displayUser?.username || displayUser?.email || "?").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 space-y-4">
              <p className="text-sm text-slate-600">Upload a square-ish image for best results (max 5MB, JPEG/PNG/WebP/GIF).</p>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Default avatars</p>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_AVATAR_OPTIONS.map((opt) => {
                    const selected = displayUser?.avatarUrl === opt.url;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        title={opt.label}
                        disabled={avatarBusy}
                        onClick={() => handleSelectDefaultAvatar(opt.url)}
                        className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 transition-all disabled:opacity-50 ${
                          selected ? "border-brand-600 ring-2 ring-brand-200" : "border-slate-200 hover:border-brand-400"
                        }`}
                      >
                        <img src={opt.url} alt="" className="h-full w-full object-cover bg-slate-100" loading="lazy" />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold cursor-pointer hover:bg-slate-800 disabled:opacity-50">
                  {avatarBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  {avatarBusy ? "Uploading…" : "Upload photo"}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleAvatarChange} disabled={avatarBusy} />
                </label>
                {displayUser?.avatarUrl ? (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={avatarBusy}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                ) : null}
              </div>
              {avatarMessage && <p className="text-sm text-emerald-600">{avatarMessage}</p>}
              {avatarError && <p className="text-sm text-red-600">{avatarError}</p>}
            </div>
          </div>
        </section>

        {/* Account */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Account details
          </h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="profile-username">
                Username
              </label>
              <input
                id="profile-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="profile-email">
                Email
              </label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="profile-current-password">
                Current password
              </label>
              <input
                id="profile-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Required only when changing username or email"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                autoComplete="current-password"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-brand-500 disabled:opacity-60"
              >
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save changes
              </button>
              <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
                Forgot password?
              </Link>
            </div>
            {profileMessage && <p className="text-sm text-emerald-600 dark:text-emerald-400">{profileMessage}</p>}
            {profileError && <p className="text-sm text-red-600 dark:text-red-400">{profileError}</p>}
          </form>
        </section>

        {displayUser ? <FashionShareCardsSection username={displayUser.username} /> : null}

        {displayUser && !displayUser.googleLinked && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-3 flex items-center gap-2">
              <LogIn className="w-4 h-4" /> Link Google account
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              Connect a Google account to this profile. The Google email <span className="font-medium text-slate-800 dark:text-slate-200">does not need to match</span> your Weartual login email (
              <span className="font-medium text-slate-800 dark:text-slate-200">{displayUser.email}</span>
              ). After linking, signing in with <span className="font-medium text-slate-800 dark:text-slate-200">email and password</span> or with{" "}
              <span className="font-medium text-slate-800 dark:text-slate-200">that Google account</span> opens the same account, history, and settings.
            </p>
            <div
              className={`flex flex-wrap items-center gap-3 ${googleLinkBusy ? "pointer-events-none opacity-60" : ""}`}
            >
              <GoogleLogin
                onSuccess={handleLinkGoogle}
                onError={() => setGoogleLinkError("Google sign-in was cancelled or failed to start.")}
                useOneTap={false}
                text="continue_with"
                shape="rectangular"
                theme="outline"
                size="large"
              />
              {googleLinkBusy ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" aria-hidden /> : null}
            </div>
            {googleLinkMessage ? (
              <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{googleLinkMessage}</p>
            ) : null}
            {googleLinkError ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{googleLinkError}</p> : null}
          </section>
        )}

        {/* Explore & tips */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" /> Explore Weartual
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 mb-8">
            <Link
              to="/studio"
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-800 hover:border-brand-300 hover:bg-brand-50/60 transition-colors dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:border-brand-500 dark:hover:bg-brand-950/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                <Sparkles className="w-5 h-5" aria-hidden />
              </span>
              <span>
                Try-On Studio
                <span className="block text-xs font-normal text-slate-500 mt-0.5">Virtual outfit try-on</span>
              </span>
            </Link>
            <Link
              to="/history"
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-800 hover:border-brand-300 hover:bg-brand-50/60 transition-colors dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:border-brand-500 dark:hover:bg-brand-950/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <History className="w-5 h-5" aria-hidden />
              </span>
              <span>
                Outfit history
                <span className="block text-xs font-normal text-slate-500 mt-0.5">Revisit saved looks</span>
              </span>
            </Link>
            <Link
              to="/contact"
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-800 hover:border-brand-300 hover:bg-brand-50/60 transition-colors dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:border-brand-500 dark:hover:bg-brand-950/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Mail className="w-5 h-5" aria-hidden />
              </span>
              <span>
                Contact
                <span className="block text-xs font-normal text-slate-500 mt-0.5">Questions or feedback</span>
              </span>
            </Link>
            <Link
              to="/about"
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-800 hover:border-brand-300 hover:bg-brand-50/60 transition-colors dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:border-brand-500 dark:hover:bg-brand-950/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                <Info className="w-5 h-5" aria-hidden />
              </span>
              <span>
                About
                <span className="block text-xs font-normal text-slate-500 mt-0.5">What Weartual is for</span>
              </span>
            </Link>
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" /> Try-on tips
          </h3>
          <ul className="space-y-2.5 text-sm text-slate-600 list-disc pl-5 marker:text-brand-400">
            <li>Use a clear, front-facing photo with even lighting so garments map more accurately.</li>
            <li>Full-body shots usually work better than tight crops for clothing placement.</li>
            <li>After a session, check <span className="font-medium text-slate-700">Outfit history</span> to compare results.</li>
          </ul>
        </section>

        <p className="text-center text-xs text-slate-400">
          Signed in as <span className="font-medium text-slate-600 dark:text-slate-300">{displayUser?.email}</span>
          {displayUser?.googleLinked && displayUser?.linkedGoogleEmail ? (
            <span className="block mt-1">
              Google linked: <span className="font-medium text-slate-600 dark:text-slate-300">{displayUser.linkedGoogleEmail}</span>
            </span>
          ) : null}
          {typeof displayUser?.totalLookCount === "number" ? (
            <span className="block mt-1">Saved try-ons: {displayUser.totalLookCount}</span>
          ) : null}
        </p>
      </div>
    </div>
  );
}
