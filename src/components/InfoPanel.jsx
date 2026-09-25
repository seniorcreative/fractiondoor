import { useState } from "react";

import {
  isInteger,
  toDecimalString,
  toPercentString,
} from "../lib/fraction.js";
import { formatUnitValue, formatWholes } from "../lib/units.js";
import { termsExpression } from "../lib/selection.js";
import { Frac, MixedNumber } from "./ui.jsx";

/** "1/12", or "1 whole" when the wall is down to a single bar. */
function rowLabel(den) {
  return den === 1 ? "1 whole" : `1/${den}`;
}

/**
 * Readouts stacked over the bottom right of the stage.
 *
 * The stack is anchored to the bottom edge, so it has to stay short: the
 * pointer card only exists while something is hovered, and the asymptote
 * explanation lives behind a disclosure with its headline figure on the
 * summary line.
 */
export default function InfoPanel({
  hover,
  summary,
  unit,
  stats,
  showAsymptote,
  onClear,
  levelUi = {},
}) {
  const [deeperOpen, setDeeperOpen] = useState(false);
  const hasSelection = summary.count > 0;
  const simpleSentence = levelUi.readout === "sentence";
  const showDeeper = levelUi.showAsymptote !== false;
  const unitText = hasSelection
    ? formatUnitValue(summary.total, unit, { style: "spoken" })
    : null;

  return (
    <div className="fw-info">
      <section className="fw-info__block" aria-live="polite">
        <header>
          <h2>Selection</h2>
          {hasSelection && (
            <button type="button" className="fw-link" onClick={onClear}>
              Clear
            </button>
          )}
        </header>

        {!hasSelection ? (
          <p className="fw-hint">
            {simpleSentence
              ? "Tap a piece to pick it up."
              : "Click blocks to add them up. Shift-click fills a row from the left edge, alt-click takes a whole row."}
          </p>
        ) : simpleSentence ? (
          // Explore / lesson mode: one plain sentence.
          <p className="fw-sentence">
            {formatWholes(summary.total, unit)}
            {unit.unit ? ` — ${unitText.text}` : ""}
          </p>
        ) : (
          <>
            <div className="fw-total">
              <MixedNumber mixed={summary.mixed} className="fw-total__mixed" />
              <div className="fw-total__side">
                {!isInteger(summary.total) && (
                  <span className="fw-total__improper">
                    <Frac n={summary.total.n} d={summary.total.d} />
                  </span>
                )}
                <span>{toDecimalString(summary.total)}</span>
                <span>{toPercentString(summary.total)} of a whole</span>
              </div>
            </div>

            <p className="fw-total__unit">
              {formatWholes(summary.total, unit)}
              {unit.unit ? ` \u00b7 ${unitText.text}` : ""}
            </p>
            {unitText?.note && <p className="fw-warn">{unitText.note}</p>}

            <p className="fw-expression">
              {summary.count} {summary.count === 1 ? "block" : "blocks"}:{" "}
              {termsExpression(summary.terms)}
            </p>
            {summary.wholesTouched > 1 && (
              <p className="fw-hint">Across {summary.wholesTouched} wholes.</p>
            )}
          </>
        )}
      </section>

      {hover && (
        <section className="fw-info__block">
          <header>
            <h2>Pointer</h2>
          </header>
          <div className="fw-hoverinfo">
            <Frac n={1} d={hover.den === 1 ? null : hover.den} />
            <div>
              <strong>{hover.name}</strong>
              {hover.value && (
                <span className="fw-hoverinfo__value">{hover.value}</span>
              )}
              {!simpleSentence && hover.decimal && (
                <span className="fw-hoverinfo__meta">
                  {hover.decimal} &middot; {hover.percent}
                </span>
              )}
              {!simpleSentence && hover.equivalents && (
                <span className="fw-hoverinfo__equiv">
                  {hover.fraction} = {hover.equivalents}
                </span>
              )}
              {hover.wholeLabel && (
                <span className="fw-hoverinfo__meta">{hover.wholeLabel}</span>
              )}
            </div>
          </div>
        </section>
      )}

      {showDeeper && (
        <details
          className="fw-info__block fw-info__details"
          open={deeperOpen}
          onToggle={(event) => setDeeperOpen(event.currentTarget.open)}
        >
          <summary>
            <h2>Going deeper</h2>
            {stats && (
              <span className="fw-stat">
                {rowLabel(stats.smallestDen)}
                {stats.smallestScreenPx === null
                  ? ""
                  : ` \u00b7 ${stats.smallestScreenPx.toFixed(1)} px`}
              </span>
            )}
          </summary>

          {stats && (
            <p className="fw-stat">
              The deepest row is {rowLabel(stats.smallestDen)}, which is{" "}
              {toPercentString({ n: 1n, d: BigInt(stats.smallestDen) })} of a
              whole
              {stats.smallestScreenPx === null
                ? "."
                : ` and about ${stats.smallestScreenPx.toFixed(1)} px wide on screen right now.`}
            </p>
          )}
          <p className="fw-hint">
            {showAsymptote
              ? "The cyan curve threads the right edge of the first piece in every row: that is y = 1/n. The red line is the left edge of the whole, the asymptote it closes in on forever without touching."
              : "Turn on the 1/n curve, then drag the deepest row slider and watch the curve flatten onto the left edge."}
          </p>
        </details>
      )}
    </div>
  );
}
