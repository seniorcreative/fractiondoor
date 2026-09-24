import { useEffect, useRef } from "react";

const SHORTCUTS = [
  ["Drag", "Orbit the wall"],
  ["Scroll", "Zoom towards the pointer"],
  ["Right-drag", "Pan"],
  ["Click", "Add or remove one block"],
  ["Shift-click", "Fill a row from its left edge (1/4, 2/4, 3/4\u2026)"],
  ["Alt-click", "Take a whole row"],
  ["L", "Cycle the labels: off, 1/n, names, values"],
  ["A", "Show the 1/n curve"],
  ["E", "Equivalent-fraction highlight"],
  ["G", "Ground grid"],
  ["C", "Clear the selection"],
  ["F", "Fit the view"],
  ["1 2 3", "Wall / staircase / arena"],
  ["W", "Add a whole (Shift+W removes one)"],
  ["[ ]", "Raise or lower the deepest row"],
  ["?", "This panel"],
];

export default function HelpOverlay({ onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fw-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="How to use the fraction wall"
    >
      <div className="fw-overlay__card">
        <header>
          <h2>Reading the wall</h2>
          <button
            type="button"
            ref={closeRef}
            className="fw-link"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <p>
          Every row splits the same whole into more pieces. Because the rows
          line up, you can see straight away that <strong>1/2</strong> covers
          exactly the same span as <strong>2/4</strong>, <strong>3/6</strong>{" "}
          and <strong>6/12</strong>. Hover a block and the matching spans light
          up.
        </p>
        <p>
          The whole can stand for anything: a pizza, an hour, a pound, a class
          of thirty. Switch it and the value labels switch with it, so 1/8
          becomes 7&nbsp;min&nbsp;30&nbsp;s or 12&frac12;p.
        </p>
        <p>
          Add more wholes to work past 1. Two whole bars plus a half gives{" "}
          <strong>2&nbsp;1/2</strong>, and the readout shows the mixed number,
          the improper fraction and the value side by side.
        </p>
        <p>
          Push the deepest row past 12 and the pieces become slivers. Turn on
          the 1/n curve to see why: the first edge of each row traces
          y&nbsp;=&nbsp;1/n, which bends towards the left edge of the whole and
          never reaches it.
        </p>

        <table className="fw-shortcuts">
          <caption>Controls</caption>
          <tbody>
            {SHORTCUTS.map(([keys, description]) => (
              <tr key={keys}>
                <th scope="row">
                  <kbd>{keys}</kbd>
                </th>
                <td>{description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
