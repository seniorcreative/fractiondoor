import { ALL_LESSONS } from "../lessons/index.js";
import { LEVELS } from "../lib/levels.js";
import { ICONS } from "../lib/icons.js";

export default function LessonPicker({ onStart, onClose }) {
  const byLevel = new Map(LEVELS.map((l) => [l.id, []]));
  ALL_LESSONS.forEach((lesson) => {
    byLevel.get(lesson.level)?.push(lesson);
  });

  return (
    <div
      className="fw-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Choose a lesson"
    >
      <div className="fw-overlay__card">
        <header>
          <h2>Lessons</h2>
          <button type="button" className="fw-link" onClick={onClose}>
            Close
          </button>
        </header>

        {LEVELS.map((level) => {
          const lessons = byLevel.get(level.id) ?? [];
          if (!lessons.length) return null;
          return (
            <section key={level.id} className="fw-lesson-section">
              <h3>
                {level.label} — {level.tagline}
              </h3>
              <div className="fw-lesson-grid">
                {lessons.map((lesson) => {
                  const Icon = ICONS[lesson.icon];
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      className="fw-lesson-card"
                      onClick={() => onStart(lesson.id)}
                    >
                      <span className="fw-lesson-card__icon" aria-hidden="true">
                        <Icon size={22} strokeWidth={1.75} />
                      </span>
                      <strong>{lesson.title}</strong>
                      <span>{lesson.goal}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
