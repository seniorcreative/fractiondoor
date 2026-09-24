import {
  MAX_DENOMINATOR_LIMIT,
  MIN_DENOMINATOR_LIMIT,
  ROW_PRESETS,
} from '../lib/denominators.js';
import { UNIT_PRESETS } from '../lib/units.js';
import { LAYOUTS } from '../three/layout.js';
import { SegmentedControl, Stepper, Toggle } from './ui.jsx';

const LABEL_MODES = [
  { id: 'none', label: 'Off', hint: 'No overlay' },
  { id: 'fraction', label: '1/n', hint: 'Unit fraction in every piece' },
  { id: 'name', label: 'Names', hint: 'half, third, quarter\u2026' },
  { id: 'value', label: 'Values', hint: 'What one piece is worth in the current whole' },
];

const VIEWS = [
  { id: 'front', label: 'Front' },
  { id: 'iso', label: 'Angle' },
  { id: 'side', label: 'Side' },
  { id: 'top', label: 'Top' },
  { id: 'inside', label: 'Inside' },
  { id: 'auto', label: 'Fit' },
];

const INTENSITY_LABEL = {
  wall: 'Not used by the flat wall',
  steps: 'Step depth',
  arc: 'How far it wraps',
};

export default function ControlPanel({ ui, patch, denominators, unit, pieceCount, onView }) {
  const rowPreset = ROW_PRESETS.find((p) => p.id === ui.rowPreset) ?? ROW_PRESETS[0];
  const deepest = denominators[denominators.length - 1];
  const heavy = pieceCount > 25000;

  return (
    <div className="fw-panel">
      <section className="fw-group">
        <h2>The whole</h2>
        <label className="fw-field" htmlFor="fw-unit">
          <span>One whole represents</span>
          <select
            id="fw-unit"
            value={ui.unitId}
            onChange={(event) => patch({ unitId: event.target.value })}
          >
            {UNIT_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.emoji} {preset.label}
              </option>
            ))}
          </select>
        </label>
        <p className="fw-hint">{unit.blurb}</p>

        {ui.unitId === 'custom' && (
          <div className="fw-row">
            <label className="fw-field fw-field--tight" htmlFor="fw-custom-amount">
              <span>Amount</span>
              <input
                id="fw-custom-amount"
                type="number"
                min="0"
                step="any"
                value={ui.customAmount}
                onChange={(event) => patch({ customAmount: event.target.value })}
              />
            </label>
            <label className="fw-field fw-field--tight" htmlFor="fw-custom-unit">
              <span>Unit</span>
              <input
                id="fw-custom-unit"
                type="text"
                value={ui.customUnit}
                placeholder="marbles"
                onChange={(event) => patch({ customUnit: event.target.value })}
              />
            </label>
            <label className="fw-field fw-field--tight" htmlFor="fw-custom-whole">
              <span>Whole called</span>
              <input
                id="fw-custom-whole"
                type="text"
                value={ui.customWholeName}
                placeholder="bag"
                onChange={(event) => patch({ customWholeName: event.target.value })}
              />
            </label>
          </div>
        )}

        <Stepper
          label="Wholes on screen"
          value={ui.wholes}
          min={1}
          max={6}
          onChange={(wholes) => patch({ wholes })}
        />
        <p className="fw-hint">
          Two wholes and a half block make 2&nbsp;1/2. Click pieces in different wholes to build
          mixed numbers.
        </p>
      </section>

      <section className="fw-group">
        <h2>Rows</h2>
        <label className="fw-field" htmlFor="fw-rows">
          <span>Row set</span>
          <select
            id="fw-rows"
            value={ui.rowPreset}
            onChange={(event) => patch({ rowPreset: event.target.value })}
          >
            {ROW_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        <p className="fw-hint">{rowPreset.hint}</p>

        {ui.rowPreset === 'custom' ? (
          <label className="fw-field" htmlFor="fw-custom-rows">
            <span>Denominators</span>
            <input
              id="fw-custom-rows"
              type="text"
              value={ui.customDenominators}
              placeholder="2, 3, 5, 7, 11"
              onChange={(event) => patch({ customDenominators: event.target.value })}
            />
          </label>
        ) : (
          <label className="fw-field" htmlFor="fw-max-den">
            <span>
              Deepest row <strong>1/{ui.maxDenominator}</strong>
            </span>
            <input
              id="fw-max-den"
              type="range"
              min={MIN_DENOMINATOR_LIMIT}
              max={MAX_DENOMINATOR_LIMIT}
              step="1"
              value={ui.maxDenominator}
              onChange={(event) => patch({ maxDenominator: Number(event.target.value) })}
            />
          </label>
        )}

        <Toggle
          pressed={ui.includeWhole}
          onChange={(includeWhole) => patch({ includeWhole })}
          hint="A single bar for 1, handy for building mixed numbers"
        >
          Show the 1 whole row
        </Toggle>

        <p className="fw-stat">
          {denominators.length} rows &middot; {pieceCount.toLocaleString()} blocks &middot; deepest
          row 1/{deepest}
        </p>
        {heavy && (
          <p className="fw-warn">
            That is a lot of blocks. It still runs in one draw call, but labels thin out and older
            machines may slow down.
          </p>
        )}
      </section>

      <section className="fw-group">
        <h2>Arrangement</h2>
        <div className="fw-layouts">
          {LAYOUTS.map((layout) => (
            <button
              key={layout.id}
              type="button"
              className="fw-layout"
              aria-pressed={ui.layout === layout.id}
              onClick={() => patch({ layout: layout.id })}
            >
              <strong>{layout.label}</strong>
              <span>{layout.hint}</span>
            </button>
          ))}
        </div>

        <label className="fw-field" htmlFor="fw-intensity">
          <span>{INTENSITY_LABEL[ui.layout]}</span>
          <input
            id="fw-intensity"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={ui.intensity}
            disabled={ui.layout === 'wall'}
            onChange={(event) => patch({ intensity: Number(event.target.value) })}
          />
        </label>

        <div className="fw-views">
          {VIEWS.map((view) => (
            <button key={view.id} type="button" onClick={() => onView(view.id)}>
              {view.label}
            </button>
          ))}
        </div>
      </section>

      <section className="fw-group">
        <h2>Overlays</h2>
        <div className="fw-field">
          <span>Fraction names</span>
          <SegmentedControl
            label="Label mode"
            name="labels"
            options={LABEL_MODES}
            value={ui.labelMode}
            onChange={(labelMode) => patch({ labelMode })}
          />
        </div>
        <div className="fw-toggles">
          <Toggle
            pressed={ui.showCaptions}
            onChange={(showCaptions) => patch({ showCaptions })}
            hint="Row and whole captions"
          >
            Captions
          </Toggle>
          <Toggle
            pressed={ui.showEquivalents}
            onChange={(showEquivalents) => patch({ showEquivalents })}
            hint="Hovering a piece lights up the same span in other rows"
          >
            Equivalents
          </Toggle>
          <Toggle
            pressed={ui.showAsymptote}
            onChange={(showAsymptote) => patch({ showAsymptote })}
            hint="Draw the 1/n curve and the line it approaches"
          >
            1/n curve
          </Toggle>
          <Toggle pressed={ui.showGrid} onChange={(showGrid) => patch({ showGrid })} hint="Ground grid">
            Grid
          </Toggle>
        </div>
      </section>
    </div>
  );
}
