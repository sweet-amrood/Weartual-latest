import { motion, useReducedMotion } from "motion/react";
import { easeOut } from "../lib/motionPresets";

export default function RollingText({
  text,
  className = "",
  split = "chars",
  speed = 0.045,
  duration = 0.48,
  delay = 0
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <span className={className}>{text}</span>;
  }

  if (split === "word") {
    return (
      <span className="inline-block overflow-hidden align-bottom [perspective:480px]" aria-hidden="true">
        <motion.span
          className={`inline-block ${className}`}
          initial={{ rotateX: 90, y: "35%", opacity: 0 }}
          animate={{ rotateX: 0, y: "0%", opacity: 1 }}
          transition={{ duration, delay, ease: easeOut }}
          style={{ transformOrigin: "50% 100%", backfaceVisibility: "hidden" }}
        >
          {text}
        </motion.span>
      </span>
    );
  }

  const chars = Array.from(text);
  const mid = (chars.length - 1) / 2;
  const words = text.split(" ");
  let index = 0;

  return (
    <span className={className} aria-hidden="true">
      {words.map((word, wi) => {
        const start = index;
        index += word.length + 1;

        return (
          <span key={`${word}-${wi}`} className="inline-block whitespace-nowrap">
            {Array.from(word).map((char, ci) => {
              const i = start + ci;
              return (
                <span
                  key={`${char}-${i}`}
                  className="inline-block overflow-hidden align-bottom [perspective:480px]"
                >
                  <motion.span
                    className="inline-block"
                    initial={{ rotateX: 90, y: "40%", opacity: 0 }}
                    animate={{ rotateX: 0, y: "0%", opacity: 1 }}
                    transition={{
                      duration,
                      delay: delay + Math.abs(i - mid) * speed,
                      ease: easeOut
                    }}
                    style={{ transformOrigin: "50% 100%", backfaceVisibility: "hidden" }}
                  >
                    {char}
                  </motion.span>
                </span>
              );
            })}
            {wi < words.length - 1 ? <span className="inline-block w-[0.28em]">{"\u00A0"}</span> : null}
          </span>
        );
      })}
    </span>
  );
}
