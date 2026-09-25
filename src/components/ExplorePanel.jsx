/**
 * The simple control rail shown at the Explore level.
 *
 * Four large targets, nothing labelled with jargon. The only two dimensions
 * a young learner should think about are "what is the whole?" and "how many
 * pieces?". Everything else is hidden.
 */

import { UNIT_PRESETS } from "../lib/units.js";
import { getLevel } from "../lib/levels.js";
import { ICONS } from "../lib/icons.js";

const PIECES_BUTTONS = [
  { label: "2", sub: "2 pieces", den: 2 },
  { label: "4", sub: "4 pieces", den: 4 },
  { label: "3", sub: "3 pieces", den: 3 },
  { label: "6", sub: "6 pieces", den: 6 },
  { label: "8", sub: "8 pieces", den: 8 },
];

export default function ExplorePanel({ ui, patch }) {
  const { units: allowedUnits } = getLevel("explore").ui;
  const unitPresets = UNIT_PRESETS.filter((p) => allowedUnits.includes(p.id));

  return (
    <div className="fw-explore-panel">
      <section className="fw-explore-group">
        <h2>What is the whole?</h2>
        <div className="fw-unit-grid">
          {unitPresets.map((preset) => {
            const Icon = ICONS[preset.icon];
            return (
              <button
                key={preset.id}
                type="button"
                className="fw-unit-btn"
                aria-pressed={ui.unitId === preset.id}
                onClick={() => patch({ unitId: preset.id })}
              >
                <span className="fw-unit-btn__icon" aria-hidden="true">
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <span className="fw-unit-btn__label">{preset.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="fw-explore-group">
        <h2>How many pieces?</h2>
        <div className="fw-pieces-grid">
          {PIECES_BUTTONS.map(({ label, sub, den }) => (
            <button
              key={den}
              type="button"
              className="fw-pieces-btn"
              aria-pressed={ui.maxDenominator === den}
              onClick={() => patch({ maxDenominator: den, includeWhole: true })}
            >
              <span className="fw-pieces-btn__num">{label}</span>
              <span className="fw-pieces-btn__sub">{sub}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="fw-explore-group">
        <h2>Labels</h2>
        <div className="fw-label-btns">
          {[
            { id: "name", label: "Names", hint: "half, quarter…" },
            { id: "fraction", label: "1/n", hint: "fraction symbols" },
            { id: "none", label: "Off", hint: "no labels" },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              aria-pressed={ui.labelMode === mode.id}
              title={mode.hint}
              onClick={() => patch({ labelMode: mode.id })}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </section>

      <section className="fw-explore-group">
        <h2>Wholes</h2>
        <div className="fw-wholes-btns">
          {[1, 2].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={ui.wholes === n}
              onClick={() => patch({ wholes: n })}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="fw-hint">
          Two wholes lets you build mixed numbers like 1½.
        </p>
      </section>
    </div>
  );
}
