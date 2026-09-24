/** Small shared UI pieces. */

/**
 * Stacked fraction, e.g. 3 over 8. Leave the denominator out for a plain
 * number, so the whole bar reads as "1" instead of "1/1".
 */
export function Frac({ n, d, className = "" }) {
  const classes = `fw-frac ${className}`.trim();
  if (d === undefined || d === null) {
    return (
      <span className={classes}>
        <b>{String(n)}</b>
      </span>
    );
  }
  return (
    <span className={classes}>
      <b>{String(n)}</b>
      <i>{String(d)}</i>
    </span>
  );
}

/** A mixed number from `toMixed()`: whole part plus proper fraction. */
export function MixedNumber({ mixed, className = "" }) {
  const { sign, whole, n, d } = mixed;
  const prefix = sign < 0 ? "-" : "";
  if (n === 0n) {
    return (
      <span
        className={`fw-mixed ${className}`.trim()}
      >{`${prefix}${whole}`}</span>
    );
  }
  return (
    <span className={`fw-mixed ${className}`.trim()}>
      {whole !== 0n && (
        <span className="fw-mixed__whole">{`${prefix}${whole}`}</span>
      )}
      <Frac n={whole === 0n ? `${prefix}${n}` : n} d={d} />
    </span>
  );
}

export function Toggle({ pressed, onChange, children, hint }) {
  return (
    <button
      type="button"
      className="fw-toggle"
      aria-pressed={pressed}
      title={hint}
      onClick={() => onChange(!pressed)}
    >
      <span className="fw-toggle__dot" aria-hidden="true" />
      {children}
    </button>
  );
}

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  format = (v) => v,
}) {
  return (
    <div className="fw-stepper">
      <span className="fw-stepper__label">{label}</span>
      <div className="fw-stepper__controls">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >
          &minus;
        </button>
        <output className="fw-stepper__value">{format(value)}</output>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function SegmentedControl({ label, options, value, onChange, name }) {
  return (
    <div className="fw-segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className="fw-segmented__option"
          aria-pressed={value === option.id}
          title={option.hint}
          onClick={() => onChange(option.id)}
          data-name={name}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
