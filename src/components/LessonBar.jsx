/**
 * The slim instruction bar shown at the bottom of the stage during a lesson.
 *
 * Deliberately small: one sentence, step dots, a skip and an exit. It must
 * never cover the wall or compete with the readout.
 */

import { useEffect, useRef, useState } from "react";
import { ICONS } from "../lib/icons.js";

export default function LessonBar({
  lesson,
  step,
  stepIndex,
  done,
  praise,
  onSkip,
  onExit,
}) {
  const [showPraise, setShowPraise] = useState(false);
  const prevPraise = useRef(null);

  useEffect(() => {
    if (praise && praise !== prevPraise.current) {
      prevPraise.current = praise;
      setShowPraise(true);
      const t = setTimeout(() => setShowPraise(false), 2600);
      return () => clearTimeout(t);
    }
  }, [praise]);

  if (!lesson) return null;

  const LessonIcon = ICONS[lesson.icon];

  return (
    <div className="fw-lesson-bar" role="status" aria-live="polite">
      <div className="fw-lesson-bar__meta">
        <span className="fw-lesson-bar__title">
          {LessonIcon && <LessonIcon size={14} aria-hidden="true" />}{" "}
          {lesson.title}
        </span>
        <span
          className="fw-lesson-bar__dots"
          aria-label={`Step ${stepIndex + 1} of ${lesson.steps.length}`}
        >
          {lesson.steps.map((_, i) => (
            <span
              key={i}
              className={[
                "fw-dot",
                i < stepIndex ? "fw-dot--done" : "",
                i === stepIndex ? "fw-dot--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            />
          ))}
        </span>
      </div>

      <p className="fw-lesson-bar__say">
        {showPraise && praise ? (
          <span className="fw-lesson-bar__praise">{praise}</span>
        ) : done ? (
          <span className="fw-lesson-bar__praise">
            <ICONS.PartyPopper size={15} aria-hidden="true" /> {lesson.goal}{" "}
            Well done!
          </span>
        ) : (
          (step?.say ?? "")
        )}
      </p>

      <div className="fw-lesson-bar__actions">
        {!done && (
          <button type="button" className="fw-link" onClick={onSkip}>
            Skip step
          </button>
        )}
        <button type="button" className="fw-link" onClick={onExit}>
          {done ? "Back to free explore" : "Exit lesson"}
        </button>
      </div>
    </div>
  );
}
