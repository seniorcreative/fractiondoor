import { isInteger, toDecimalString, toPercentString } from '../lib/fraction.js';
import { formatUnitValue, formatWholes } from '../lib/units.js';
import { termsExpression } from '../lib/selection.js';
import { Frac, MixedNumber } from './ui.jsx';

export default function InfoPanel({ hover, summary, unit, stats, showAsymptote, onClear }) {
  const hasSelection = summary.count > 0;
  const unitText = hasSelection ? formatUnitValue(summary.total, unit) : null;

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
            Click blocks to add them up. Shift-click fills a row from the left edge, alt-click takes
            a whole row.
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
              {unit.unit ? ` \u00b7 ${unitText.text}` : ''}
            </p>
            {unitText?.note && <p className="fw-warn">{unitText.note}</p>}

            <p className="fw-expression">
              {summary.count} {summary.count === 1 ? 'block' : 'blocks'}: {termsExpression(summary.terms)}
            </p>
            {summary.wholesTouched > 1 && (
              <p className="fw-hint">Across {summary.wholesTouched} wholes.</p>
            )}
          </>
        )}
      </section>

      <section className="fw-info__block">
        <header>
          <h2>Pointer</h2>
        </header>
        {hover ? (
          <div className="fw-hoverinfo">
            <Frac n={1} d={hover.den} />
            <div>
              <strong>{hover.name}</strong>
              {hover.value && <span className="fw-hoverinfo__value">{hover.value}</span>}
              <span className="fw-hoverinfo__meta">
                {hover.decimal} &middot; {hover.percent}
              </span>
              {hover.equivalents && (
                <span className="fw-hoverinfo__equiv">
                  {hover.fraction} = {hover.equivalents}
                </span>
              )}
              {hover.wholeLabel && <span className="fw-hoverinfo__meta">{hover.wholeLabel}</span>}
            </div>
          </div>
        ) : (
          <p className="fw-hint">Point at a block to read it.</p>
        )}
      </section>

      <section className="fw-info__block">
        <header>
          <h2>Going deeper</h2>
        </header>
        {stats ? (
          <>
            <p className="fw-stat">
              Deepest row <strong>1/{stats.smallestDen}</strong> &middot;{' '}
              {toPercentString({ n: 1n, d: BigInt(stats.smallestDen) })} of a whole
            </p>
            <p className="fw-stat">
              {stats.smallestScreenPx === null
                ? 'Off screen right now.'
                : `About ${stats.smallestScreenPx.toFixed(1)} px wide on screen right now.`}
            </p>
          </>
        ) : (
          <p className="fw-hint">Measuring&hellip;</p>
        )}
        <p className="fw-hint">
          {showAsymptote
            ? 'The cyan curve threads the right edge of the first piece in every row: that is y = 1/n. The red line is the left edge of the whole, the asymptote it closes in on forever without touching.'
            : 'Turn on the 1/n curve, then drag the deepest row slider and watch the curve flatten onto the left edge.'}
        </p>
      </section>
    </div>
  );
}
