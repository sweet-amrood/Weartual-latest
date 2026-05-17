import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { submitFeedback } from "../services/feedbackApi";
import { easeOut } from "../lib/motionPresets";

const team = [
  {
    name: "Anila Amjad",
    role: "Supervisor",
    photo: "https://ui-avatars.com/api/?name=Anila+Amjad&background=e0e7ff&color=3730a3&size=256",
    details:
      "Leads research direction, quality benchmarks, and project mentoring with focus on eastern-wear realism and evaluation standards.",
    email: "",
    phone: ""
  },
  {
    name: "Musharib Rehman",
    role: "Project Developer",
    photo: "/musharib.jpeg",
    details:
      "Builds backend pipeline integration, filename-preserving data flow, and StableVITON input bundle orchestration.",
    email: "",
    phone: ""
  },
  {
    name: "Muddasir Yaseen",
    role: "Project Developer",
    photo: "https://ui-avatars.com/api/?name=Muddasir+Yaseen&background=e0e7ff&color=3730a3&size=256",
    details:
      "Develops frontend experience and interaction flows to make virtual try-on understandable, fast, and user-friendly.",
    email: "",
    phone: ""
  }
];

export default function Contact() {
  const reduceMotion = useReducedMotion();
  const [activeMember, setActiveMember] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formElement = e.currentTarget;
    const formData = new FormData(formElement);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const message = String(formData.get("message") || "").trim();

    setFormError("");
    setFeedbackSent(false);
    setIsSubmitting(true);

    try {
      await submitFeedback({ name, email, message });
      setFeedbackSent(true);
      formElement.reset();
    } catch (err) {
      setFormError(err.message || "Could not submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-14 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100">
      <motion.div
        className="text-center mb-12"
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.45, ease: easeOut }}
      >
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">Contact</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed dark:text-slate-400">
          Have questions about the Virtual Try-On system? Reach out to our team.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {team.map((m, idx) => (
          <motion.button
            key={m.name}
            type="button"
            onClick={() => setActiveMember((prev) => (prev === idx ? -1 : idx))}
            layout
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.4, ease: easeOut, delay: idx * 0.06 }}
            whileHover={reduceMotion ? undefined : { y: -2 }}
            whileTap={reduceMotion ? undefined : { scale: 0.99 }}
            className={`rounded-2xl p-6 shadow-sm border text-center transition-colors duration-200 bg-white dark:bg-slate-900 ${
              activeMember === idx
                ? "border-brand-500 ring-2 ring-brand-500/30 dark:border-brand-400"
                : "border-slate-200 hover:border-brand-300 dark:border-slate-700 dark:hover:border-brand-500/50"
            }`}
          >
            <img
              src={m.photo}
              alt={m.name}
              className="mx-auto mb-4 h-20 w-20 rounded-full object-cover ring-2 ring-brand-400/40"
            />
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{m.name}</div>
            <div className="text-sm font-medium text-brand-600 mb-3 dark:text-brand-300">{m.role}</div>
            <div className="text-xs text-slate-500 mb-4 dark:text-slate-400">{activeMember === idx ? "Click to collapse" : "Click to view details"}</div>

            {activeMember === idx && (
              <p className="text-sm text-slate-700 leading-relaxed mb-5 text-left bg-slate-50 border border-slate-200 rounded-xl p-3 dark:bg-slate-800/80 dark:border-slate-600 dark:text-slate-300">
                {m.details}
              </p>
            )}

            <div className="space-y-3 text-sm">
              <a
                className="block text-slate-600 hover:text-brand-600 transition-colors dark:text-slate-300 dark:hover:text-brand-300"
                href={`mailto:${m.email}`}
              >
                {m.email}
              </a>
              <a
                className="block text-slate-600 hover:text-brand-600 transition-colors dark:text-slate-300 dark:hover:text-brand-300"
                href={`tel:${m.phone}`}
              >
                {m.phone}
              </a>
            </div>
          </motion.button>
        ))}
      </div>

      <motion.div
        className="mt-12 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.45, ease: easeOut }}
      >
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2 dark:text-slate-100">Share Your Feedback</h2>
          <p className="text-lg text-slate-600 leading-relaxed dark:text-slate-300">
            Your suggestions help us improve eastern-wear virtual try-on quality, fitting realism, and overall user
            experience. Tell us what worked well and what we should improve next.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Enter your full name"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300" htmlFor="subject">
              Subject
            </label>
            <input
              id="subject"
              name="subject"
              type="text"
              required
              placeholder="Ex: Fit quality for long kurtas"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300" htmlFor="message">
              Feedback Message
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={5}
              placeholder="Share your feedback, bug report, or feature request..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileHover={reduceMotion || isSubmitting ? undefined : { scale: 1.02 }}
            whileTap={reduceMotion || isSubmitting ? undefined : { scale: 0.98 }}
            transition={{ type: "spring", stiffness: 450, damping: 26 }}
            className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-6 py-2.5 font-semibold text-white hover:bg-brand-500 transition-colors disabled:opacity-60"
          >
            {isSubmitting ? "Sending..." : "Send Feedback"}
          </motion.button>

          <AnimatePresence>
            {formError ? (
              <motion.p
                key="contact-form-error"
                role="alert"
                initial={reduceMotion ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 dark:text-red-200 dark:bg-red-950/50 dark:border-red-800/80"
              >
                {formError}
              </motion.p>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {feedbackSent ? (
              <motion.p
                key="contact-form-success"
                initial={reduceMotion ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 dark:text-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/60"
              >
                Feedback submitted successfully
              </motion.p>
            ) : null}
          </AnimatePresence>
        </form>
      </motion.div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          className="rounded-2xl p-6 shadow-sm border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.4, ease: easeOut }}
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-2 dark:text-slate-100">Expected Response Time</h3>
          <p className="text-slate-600 text-sm leading-relaxed dark:text-slate-300">
            We usually review feedback within 24 to 48 hours. Priority is given to reproducible issues affecting
            eastern-wear fitting realism, garment alignment, and texture consistency.
          </p>
        </motion.div>
        <motion.div
          className="rounded-2xl p-6 shadow-sm border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.4, ease: easeOut, delay: 0.06 }}
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-2 dark:text-slate-100">Feedback That Helps Most</h3>
          <ul className="text-slate-600 text-sm leading-relaxed space-y-1 list-disc list-inside dark:text-slate-300">
            <li>Outfit category (kurta, festive top, layered look)</li>
            <li>What looked off (sleeves, hemline, drape, embroidery)</li>
            <li>Whether issue is repeated across multiple uploads</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}

