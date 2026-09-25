import { LEVELS } from '../lib/levels.js';

export default function LevelSwitcher({ current, onChange }) {
  return (
    <div className="fw-level-switcher" role="group" aria-label="Level">
      {LEVELS.map((level) => (
        <button
          key={level.id}
          type="button"
          aria-pressed={current === level.id}
          className="fw-level-btn"
          title={level.blurb}
          onClick={() => onChange(level.id)}
        >
          <strong>{level.label}</strong>
          <span>{level.tagline}</span>
        </button>
      ))}
    </div>
  );
}
