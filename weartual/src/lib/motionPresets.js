/** Shared Motion presets — pair with `useReducedMotion()` from `"motion/react"`. */

export const easeOut = [0.22, 1, 0.36, 1];

/**
 * Container variants for staggered children.
 * Parent `hidden` / `show` must differ so Motion actually runs the transition; otherwise
 * children with `variants={fadeUpItem}` stay on `hidden` (opacity 0) forever.
 * Keep parent visually unchanged: micro scale only, full opacity always.
 */
export function staggerChildren(reduceMotion, stagger = 0.06) {
  if (reduceMotion) {
    return {
      hidden: { opacity: 1 },
      show: { opacity: 1, transition: { duration: 0 } }
    };
  }
  return {
    hidden: { opacity: 1, scale: 0.998 },
    show: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.25,
        ease: easeOut,
        staggerChildren: stagger,
        delayChildren: 0.04
      }
    }
  };
}

export function fadeUpItem(reduceMotion) {
  if (reduceMotion) {
    return { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0, transition: { duration: 0 } } };
  }
  return {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: easeOut } }
  };
}
