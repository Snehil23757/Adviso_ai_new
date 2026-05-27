import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Lightbulb, MessageSquare, Send, Sparkles, X } from "lucide-react";

import { apiFailureMessage, authorizedFetch, readApiJson } from "../../config";

const SCORE_OPTIONS = [1, 2, 3, 4, 5] as const;

const FEATURE_OPTIONS = [
  "Overview",
  "Visual Analytics",
  "AI Insights",
  "Data Chat",
  "Ideas",
  "Profit",
  "Forecast",
  "Budget",
  "ESG",
  "Other",
] as const;

interface FeedbackWidgetProps {
  userEmail: string;
  workspaceId?: number | null;
  activePage?: string;
}

interface FeedbackFormState {
  satisfactionScore: number;
  likesText: string;
  insightEaseScore: number;
  insightAccuracyScore: number;
  featuresUsed: string[];
  improvementText: string;
  additionalFeedback: string;
}

interface FeedbackApiResponse {
  success: boolean;
  feedback: {
    id?: number;
  };
}

const initialForm: FeedbackFormState = {
  satisfactionScore: 0,
  likesText: "",
  insightEaseScore: 0,
  insightAccuracyScore: 0,
  featuresUsed: [],
  improvementText: "",
  additionalFeedback: "",
};

function feedbackStorageKey(userEmail: string) {
  return `adviso_feedback_submitted_${userEmail.toLowerCase().replace(/[^a-z0-9@._-]/g, "_")}`;
}

function randomDelay(minMs: number, maxMs: number) {
  return Math.floor(minMs + Math.random() * (maxMs - minMs));
}

function RatingRow({
  label,
  lowLabel,
  highLabel,
  value,
  onChange,
}: {
  label: string;
  lowLabel: string;
  highLabel: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-2xl border bg-[var(--ap-surface)] p-4 sm:p-5 shadow-sm" style={{ borderColor: "var(--ap-border)" }}>
      <div className="text-sm font-black text-[var(--ap-text)]">{label}</div>
      <div className="mt-4 grid grid-cols-5 gap-2 sm:gap-3">
        {SCORE_OPTIONS.map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`h-10 rounded-xl border text-sm font-black transition ${
              value === score
                ? "border-[#145DFF] bg-[#145DFF] text-white shadow-[0_12px_30px_rgba(20,93,255,0.22)]"
                : "bg-[var(--ap-surface-2)] text-[var(--ap-text)] hover:border-[#145DFF]/50"
            }`}
            style={{ borderColor: value === score ? "#145DFF" : "var(--ap-border)" }}
            aria-pressed={value === score}
          >
            {score}
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-xs font-semibold text-[var(--ap-muted)]">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

export default function FeedbackWidget({ userEmail, workspaceId, activePage = "Overview" }: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [promptVisible, setPromptVisible] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [form, setForm] = useState<FeedbackFormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const promptTimerRef = useRef<number | null>(null);

  const submittedKey = useMemo(() => feedbackStorageKey(userEmail), [userEmail]);

  useEffect(() => {
    try {
      setHasSubmitted(localStorage.getItem(submittedKey) === "true");
    } catch {
      setHasSubmitted(false);
    }
  }, [submittedKey]);

  useEffect(() => {
    const clearPromptTimer = () => {
      if (promptTimerRef.current) {
        window.clearTimeout(promptTimerRef.current);
        promptTimerRef.current = null;
      }
    };

    clearPromptTimer();

    if (hasSubmitted || isOpen) return clearPromptTimer;

    const delay = randomDelay(promptVisible ? 90000 : 14000, promptVisible ? 150000 : 30000);
    promptTimerRef.current = window.setTimeout(() => {
      setPromptVisible(true);
    }, delay);

    return clearPromptTimer;
  }, [hasSubmitted, isOpen, promptVisible]);

  const updateForm = <K extends keyof FeedbackFormState>(key: K, value: FeedbackFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (errorMessage) setErrorMessage("");
  };

  const toggleFeature = (feature: string) => {
    setForm((current) => {
      const exists = current.featuresUsed.includes(feature);
      return {
        ...current,
        featuresUsed: exists
          ? current.featuresUsed.filter((item) => item !== feature)
          : [...current.featuresUsed, feature],
      };
    });
    if (errorMessage) setErrorMessage("");
  };

  const openForm = () => {
    setPromptVisible(false);
    setIsOpen(true);
  };

  const closeForm = () => {
    if (isSubmitting) return;
    setIsOpen(false);
    setErrorMessage("");
  };

  const submitFeedback = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.satisfactionScore || !form.insightEaseScore || !form.insightAccuracyScore) {
      setErrorMessage("Please rate the required questions before submitting.");
      return;
    }
    if (form.likesText.trim().length < 3) {
      setErrorMessage("Please share what you liked most about the platform.");
      return;
    }
    if (!form.featuresUsed.length) {
      setErrorMessage("Please select at least one feature you use.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authorizedFetch("/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          workspace_id: workspaceId || null,
          satisfaction_score: form.satisfactionScore,
          likes_text: form.likesText.trim(),
          insight_ease_score: form.insightEaseScore,
          insight_accuracy_score: form.insightAccuracyScore,
          features_used: form.featuresUsed,
          improvement_text: form.improvementText.trim(),
          additional_feedback: form.additionalFeedback.trim(),
          active_page: activePage,
          metadata: {
            pathname: window.location.pathname,
            viewport_width: window.innerWidth,
            viewport_height: window.innerHeight,
          },
        }),
      });
      await readApiJson<FeedbackApiResponse>(response);
      setSuccessMessage("Thanks. Your feedback is saved.");
      setHasSubmitted(true);
      setForm(initialForm);
      try {
        localStorage.setItem(submittedKey, "true");
      } catch {
        // Ignore storage issues. The backend has the durable record.
      }
    } catch (error) {
      setErrorMessage(apiFailureMessage(error, "Feedback could not be saved. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col items-end gap-3">
        <AnimatePresence>
          {promptVisible && !isOpen && !hasSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="relative max-w-[260px] rounded-2xl border bg-[var(--ap-surface)] p-4 pr-10 shadow-[0_22px_70px_rgba(15,23,42,0.2)]"
              style={{ borderColor: "var(--ap-border)" }}
            >
              <button
                type="button"
                onClick={() => setPromptVisible(false)}
                className="absolute right-2 top-2 rounded-lg p-1 text-[var(--ap-muted)] transition hover:bg-[var(--ap-surface-2)] hover:text-[var(--ap-text)]"
                aria-label="Dismiss feedback prompt"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#145DFF]/10 text-[#145DFF]">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-black text-[var(--ap-text)]">Quick feedback?</div>
                  <button type="button" onClick={openForm} className="mt-1 text-left text-xs font-semibold leading-5 text-[var(--ap-muted)] hover:text-[#145DFF]">
                    Tell us what to improve in Adviso AI.
                  </button>
                </div>
              </div>
              <span className="absolute bottom-[-7px] right-8 h-3.5 w-3.5 rotate-45 border-b border-r bg-[var(--ap-surface)]" style={{ borderColor: "var(--ap-border)" }} />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={openForm}
          whileHover={{ y: -2, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="group relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#145DFF] to-[#0B3FCC] text-white shadow-[0_22px_55px_rgba(20,93,255,0.35)]"
          aria-label="Open feedback form"
        >
          <MessageSquare className="h-6 w-6 transition-transform group-hover:scale-110" />
          {!hasSubmitted && (
            <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#20D7FF]" />
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[140] overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="mx-auto min-h-[calc(100vh-2rem)] w-full max-w-6xl rounded-[1.6rem] border bg-[var(--ap-bg)] p-4 shadow-[0_30px_120px_rgba(15,23,42,0.34)] sm:min-h-[calc(100vh-3rem)] sm:p-6"
              style={{ borderColor: "var(--ap-border)" }}
              initial={{ opacity: 0, y: 48, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 26, scale: 0.985 }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                className="pointer-events-none fixed bottom-4 left-4 right-4 top-4 rounded-[1.6rem] sm:bottom-6 sm:left-6 sm:right-6 sm:top-6"
                aria-hidden="true"
              >
                <motion.span
                  className="absolute bottom-0 left-0 h-px bg-[#145DFF]"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }}
                />
                <motion.span
                  className="absolute bottom-0 left-0 w-px bg-[#145DFF]"
                  initial={{ height: 0 }}
                  animate={{ height: "100%" }}
                  transition={{ duration: 0.42, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                />
                <motion.span
                  className="absolute bottom-0 right-0 w-px bg-[#145DFF]"
                  initial={{ height: 0 }}
                  animate={{ height: "100%" }}
                  transition={{ duration: 0.42, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                />
              </motion.div>

              <div className="relative mx-auto max-w-5xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border bg-[var(--ap-surface)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[#145DFF]" style={{ borderColor: "var(--ap-border)" }}>
                      <Sparkles className="h-3.5 w-3.5" />
                      Platform feedback
                    </div>
                    <h2 className="mt-4 text-3xl font-black tracking-tight text-[var(--ap-text)]">Feedback Form</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ap-muted)]">
                      Please take a few minutes to share your feedback. Your responses help us improve the platform.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeForm}
                    className="rounded-xl border bg-[var(--ap-surface)] p-2.5 text-[var(--ap-muted)] transition hover:text-[var(--ap-text)]"
                    style={{ borderColor: "var(--ap-border)" }}
                    aria-label="Close feedback form"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {successMessage ? (
                  <motion.div
                    className="rounded-3xl border bg-[var(--ap-surface)] p-8 text-center shadow-sm"
                    style={{ borderColor: "var(--ap-border)" }}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="mt-5 text-2xl font-black text-[var(--ap-text)]">Feedback received</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--ap-muted)]">{successMessage}</p>
                    <button type="button" onClick={closeForm} className="ap-btn-primary mt-6 rounded-xl px-5 py-3 text-sm font-black">
                      Back to workspace
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={submitFeedback} className="space-y-4">
                    <RatingRow
                      label="1. How satisfied are you with our platform? *"
                      lowLabel="Very dissatisfied"
                      highLabel="Very satisfied"
                      value={form.satisfactionScore}
                      onChange={(score) => updateForm("satisfactionScore", score)}
                    />

                    <div className="rounded-2xl border bg-[var(--ap-surface)] p-4 sm:p-5 shadow-sm" style={{ borderColor: "var(--ap-border)" }}>
                      <label className="text-sm font-black text-[var(--ap-text)]" htmlFor="feedback-likes">
                        2. What do you like most about our platform? *
                      </label>
                      <textarea
                        id="feedback-likes"
                        value={form.likesText}
                        onChange={(event) => updateForm("likesText", event.target.value)}
                        className="mt-4 min-h-24 w-full resize-y rounded-xl border bg-[var(--ap-surface-2)] px-4 py-3 text-sm text-[var(--ap-text)] outline-none transition placeholder:text-[var(--ap-muted)] focus:border-[#145DFF]"
                        style={{ borderColor: "var(--ap-border)" }}
                        placeholder="Share your thoughts..."
                      />
                    </div>

                    <RatingRow
                      label="3. How easy is it to find the insights you need? *"
                      lowLabel="Very difficult"
                      highLabel="Very easy"
                      value={form.insightEaseScore}
                      onChange={(score) => updateForm("insightEaseScore", score)}
                    />

                    <RatingRow
                      label="4. How would you rate the accuracy of the insights? *"
                      lowLabel="Not accurate"
                      highLabel="Very accurate"
                      value={form.insightAccuracyScore}
                      onChange={(score) => updateForm("insightAccuracyScore", score)}
                    />

                    <div className="rounded-2xl border bg-[var(--ap-surface)] p-4 sm:p-5 shadow-sm" style={{ borderColor: "var(--ap-border)" }}>
                      <div className="text-sm font-black text-[var(--ap-text)]">
                        5. Which features do you use the most? *
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                        {FEATURE_OPTIONS.map((feature) => {
                          const checked = form.featuresUsed.includes(feature);
                          return (
                            <label key={feature} className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[var(--ap-text)]">
                              <span
                                className={`grid h-5 w-5 place-items-center rounded border transition ${checked ? "border-[#145DFF] bg-[#145DFF] text-white" : "bg-[var(--ap-surface-2)]"}`}
                                style={{ borderColor: checked ? "#145DFF" : "var(--ap-border)" }}
                              >
                                {checked && <CheckCircle2 className="h-3.5 w-3.5" />}
                              </span>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleFeature(feature)}
                                className="sr-only"
                              />
                              {feature}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border bg-[var(--ap-surface)] p-4 sm:p-5 shadow-sm" style={{ borderColor: "var(--ap-border)" }}>
                        <label className="text-sm font-black text-[var(--ap-text)]" htmlFor="feedback-improve">
                          6. What should we improve next?
                        </label>
                        <textarea
                          id="feedback-improve"
                          value={form.improvementText}
                          onChange={(event) => updateForm("improvementText", event.target.value)}
                          className="mt-4 min-h-28 w-full resize-y rounded-xl border bg-[var(--ap-surface-2)] px-4 py-3 text-sm text-[var(--ap-text)] outline-none transition placeholder:text-[var(--ap-muted)] focus:border-[#145DFF]"
                          style={{ borderColor: "var(--ap-border)" }}
                          placeholder="Tell us what would make your workflow better..."
                        />
                      </div>
                      <div className="rounded-2xl border bg-[var(--ap-surface)] p-4 sm:p-5 shadow-sm" style={{ borderColor: "var(--ap-border)" }}>
                        <label className="text-sm font-black text-[var(--ap-text)]" htmlFor="feedback-more">
                          7. Anything else you want to add?
                        </label>
                        <textarea
                          id="feedback-more"
                          value={form.additionalFeedback}
                          onChange={(event) => updateForm("additionalFeedback", event.target.value)}
                          className="mt-4 min-h-28 w-full resize-y rounded-xl border bg-[var(--ap-surface-2)] px-4 py-3 text-sm text-[var(--ap-text)] outline-none transition placeholder:text-[var(--ap-muted)] focus:border-[#145DFF]"
                          style={{ borderColor: "var(--ap-border)" }}
                          placeholder="Feature ideas, bugs, confusion points, or praise..."
                        />
                      </div>
                    </div>

                    {errorMessage && (
                      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">
                        {errorMessage}
                      </div>
                    )}

                    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs text-[var(--ap-muted)]">
                        Saved with your account: <span className="font-bold text-[var(--ap-text)]">{userEmail}</span>
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="ap-btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-black disabled:opacity-70"
                      >
                        {isSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" /> : <Send className="h-4 w-4" />}
                        Submit feedback
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
