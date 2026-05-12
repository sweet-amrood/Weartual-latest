import { Outlet, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { easeOut } from "../lib/motionPresets";

/**
 * Subtle route-level enter animation for all main pages (Outlet children).
 */
export default function AnimatedRoutesLayout() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      key={location.pathname}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: easeOut }}
      className="min-h-[calc(100dvh-4rem)]"
    >
      <Outlet />
    </motion.div>
  );
}
