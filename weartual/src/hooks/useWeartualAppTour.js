import { useEffect, useRef } from "react";
import { driver } from "driver.js";

const TOUR_DONE_KEY = "weartual_app_tour_v1_done";
const TOUR_LEG_KEY = "weartual_app_tour_v1_leg";

/** First visible matching node (prefers desktop nav over hidden mobile duplicates). */
function pickTourElement(selector) {
  const nodes = document.querySelectorAll(selector);
  for (const n of nodes) {
    if (n instanceof HTMLElement && n.offsetParent !== null) return n;
  }
  return nodes[0] instanceof HTMLElement ? nodes[0] : document.body;
}

function markTourFinished(reason = "done") {
  try {
    localStorage.setItem(TOUR_DONE_KEY, reason);
    sessionStorage.removeItem(TOUR_LEG_KEY);
    sessionStorage.removeItem("weartual_just_signed_up");
  } catch {
    /* ignore */
  }
}

function readLeg() {
  try {
    return sessionStorage.getItem(TOUR_LEG_KEY);
  } catch {
    return null;
  }
}

function writeLeg(value) {
  try {
    sessionStorage.setItem(TOUR_LEG_KEY, value);
  } catch {
    /* ignore */
  }
}

/**
 * First-time app walkthrough: Home → Try-On Studio → History → Profile (profile only if logged in).
 * Persists completion in localStorage; uses sessionStorage for multi-route leg index.
 */
export function useWeartualAppTour({ pathname, navigate, user, authLoading }) {
  const driverRef = useRef(null);

  useEffect(() => {
    return () => {
      try {
        driverRef.current?.destroy();
      } catch {
        /* ignore */
      }
      driverRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (authLoading) return;

    let cancelled = false;

    try {
      if (localStorage.getItem(TOUR_DONE_KEY)) return;
      if (!sessionStorage.getItem("weartual_just_signed_up")) return;
    } catch {
      return;
    }

    const leg = readLeg();

    const startDriver = (config) => {
      if (cancelled) return;
      try {
        driverRef.current?.destroy();
      } catch {
        /* ignore */
      }
      const d = driver(config);
      driverRef.current = d;
      d.drive(0);
    };

    const timer = window.setTimeout(() => {
      if (cancelled) return;
      if (driverRef.current?.isActive?.()) return;

      if (pathname === "/" && (leg === null || leg === "0")) {
        writeLeg("0");
        startDriver({
          showProgress: true,
          smoothScroll: true,
          nextBtnText: "Next",
          prevBtnText: "Back",
          doneBtnText: "Continue",
          popoverClass: "weartual-driver-popover",
          onCloseClick: (_el, _step, { driver: d }) => {
            markTourFinished("dismissed");
            d.destroy();
          },
          steps: [
            {
              element: "#tour-landing-hero",
              popover: {
                title: "Welcome to Weartual",
                description:
                  "Try outfits on your own photos with AI. This short tour walks you through Home, the Try-On Studio, your History, and your Profile.",
                side: "bottom",
                align: "center"
              }
            },
            {
              element: () => pickTourElement('[data-tour="nav-studio"]'),
              popover: {
                title: "Try-On Studio",
                description: "Jump here anytime from the top navigation. Next, we will open the studio page.",
                side: "bottom",
                align: "start",
                onNextClick: (_el, _step, { driver: d }) => {
                  d.destroy();
                  writeLeg("1");
                  navigate("/studio");
                }
              }
            }
          ]
        });
        return;
      }

      if (pathname === "/studio" && leg === "1") {
        startDriver({
          showProgress: true,
          smoothScroll: true,
          doneBtnText: "Continue",
          popoverClass: "weartual-driver-popover",
          onCloseClick: (_el, _step, { driver: d }) => {
            markTourFinished("dismissed");
            d.destroy();
          },
          steps: [
            {
              element: "#tour-studio-root",
              popover: {
                title: "Try-On Studio",
                description:
                  "Upload a person photo (or video where supported) and a garment, then generate your look. Saved results sync to History.",
                side: "bottom",
                align: "center",
                onNextClick: (_el, _step, { driver: d }) => {
                  d.destroy();
                  writeLeg("2");
                  navigate("/history");
                }
              }
            }
          ]
        });
        return;
      }

      if (pathname === "/history" && leg === "2") {
        startDriver({
          showProgress: true,
          smoothScroll: true,
          doneBtnText: user ? "Continue" : "Finish",
          popoverClass: "weartual-driver-popover",
          onCloseClick: (_el, _step, { driver: d }) => {
            markTourFinished("dismissed");
            d.destroy();
          },
          steps: [
            {
              element: "#tour-history-root",
              popover: {
                title: "Outfit History",
                description: user
                  ? "Browse, rate, and reopen your saved try-ons. Next: your account and shareable cards on Profile."
                  : "Log in to sync try-ons across devices. You can finish the tour here — Profile unlocks after sign-in.",
                side: "bottom",
                align: "center",
                onNextClick: (_el, _step, { driver: d }) => {
                  d.destroy();
                  if (user) {
                    writeLeg("3");
                    navigate("/profile");
                  } else {
                    markTourFinished("done");
                  }
                }
              }
            }
          ]
        });
        return;
      }

      if (pathname === "/profile" && leg === "3" && user) {
        startDriver({
          showProgress: true,
          smoothScroll: true,
          doneBtnText: "Done",
          popoverClass: "weartual-driver-popover",
          onCloseClick: (_el, _step, { driver: d }) => {
            markTourFinished("dismissed");
            d.destroy();
          },
          steps: [
            {
              element: "#tour-profile-root",
              popover: {
                title: "Profile",
                description:
                  "Update your photo, account details, link Google, and create shareable fashion cards from your saved looks.",
                side: "bottom",
                align: "center",
                onNextClick: (_el, _step, { driver: d }) => {
                  d.destroy();
                  markTourFinished("done");
                }
              }
            }
          ]
        });
      }
    }, 520);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pathname, navigate, user, authLoading]);
}

export { TOUR_DONE_KEY };
