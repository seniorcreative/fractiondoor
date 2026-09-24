import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ControlPanel from "./components/ControlPanel.jsx";
import HelpOverlay from "./components/HelpOverlay.jsx";
import InfoPanel from "./components/InfoPanel.jsx";
import WallCanvas from "./components/WallCanvas.jsx";
import {
  MAX_DENOMINATOR_LIMIT,
  MIN_DENOMINATOR_LIMIT,
  buildDenominators,
  clamp,
  countPieces,
} from "./lib/denominators.js";
import {
  pruneSelection,
  rowKeys,
  runKeys,
  selectionSummary,
  toggleGroup,
  toggleKey,
} from "./lib/selection.js";
import { resolveUnit } from "./lib/units.js";

const LABEL_CYCLE = ["none", "fraction", "name", "value"];
const LAYOUT_KEYS = { 1: "wall", 2: "steps", 3: "arc" };

const DEFAULT_UI = {
  rowPreset: "classic",
  maxDenominator: 12,
  includeWhole: true,
  customDenominators: "2, 3, 5, 7, 11",
  wholes: 1,
  layout: "wall",
  intensity: 0.45,
  labelMode: "fraction",
  showCaptions: true,
  showEquivalents: true,
  showAsymptote: false,
  showGrid: true,
  unitId: "abstract",
  customAmount: "12",
  customUnit: "marbles",
  customWholeName: "bag",
};

export default function App() {
  const [ui, setUi] = useState(DEFAULT_UI);
  const [selection, setSelection] = useState(() => new Set());
  const [hover, setHover] = useState(null);
  const [stats, setStats] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const canvasRef = useRef(null);

  const patch = useCallback(
    (next) => setUi((prev) => ({ ...prev, ...next })),
    [],
  );

  const {
    rowPreset,
    maxDenominator,
    includeWhole,
    customDenominators,
    wholes,
    layout,
    intensity,
    labelMode,
    showCaptions,
    showEquivalents,
    showAsymptote,
    showGrid,
    unitId,
    customAmount,
    customUnit,
    customWholeName,
  } = ui;

  const denominators = useMemo(
    () =>
      buildDenominators({
        rowPreset,
        maxDenominator,
        includeWhole,
        customDenominators,
      }),
    [rowPreset, maxDenominator, includeWhole, customDenominators],
  );

  const unit = useMemo(
    () =>
      resolveUnit(unitId, {
        amount: Number(customAmount),
        unit: customUnit,
        wholeName: customWholeName,
      }),
    [unitId, customAmount, customUnit, customWholeName],
  );

  const config = useMemo(
    () => ({
      denominators,
      wholes,
      layout,
      intensity,
      labelMode,
      showCaptions,
      showEquivalents,
      showAsymptote,
      showGrid,
      unit,
    }),
    [
      denominators,
      wholes,
      layout,
      intensity,
      labelMode,
      showCaptions,
      showEquivalents,
      showAsymptote,
      showGrid,
      unit,
    ],
  );

  // Rows and wholes come and go as the wall is reshaped. Only blocks that are
  // currently on screen count towards the total, so the selection is filtered
  // during render rather than rewritten: hide a row and its pieces drop out of
  // the sum, bring it back and they return.
  const activeSelection = useMemo(
    () => pruneSelection(selection, denominators, wholes),
    [selection, denominators, wholes],
  );

  const summary = useMemo(
    () => selectionSummary(activeSelection),
    [activeSelection],
  );
  const pieceCount = useMemo(
    () => countPieces(denominators, wholes),
    [denominators, wholes],
  );

  const handlePick = useCallback((info) => {
    setSelection((prev) => {
      if (info.wholeRow)
        return toggleGroup(prev, rowKeys(info.wholeIndex, info.den));
      if (info.runToStart)
        return toggleGroup(
          prev,
          runKeys(info.wholeIndex, info.den, info.index),
        );
      return toggleKey(prev, info.key);
    });
  }, []);

  const clearSelection = useCallback(() => setSelection(new Set()), []);
  const handleView = useCallback(
    (preset) => canvasRef.current?.fitView(preset),
    [],
  );

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      switch (event.key) {
        case "l":
        case "L":
          setUi((prev) => ({
            ...prev,
            labelMode:
              LABEL_CYCLE[
                (LABEL_CYCLE.indexOf(prev.labelMode) + 1) % LABEL_CYCLE.length
              ],
          }));
          break;
        case "a":
        case "A":
          setUi((prev) => ({ ...prev, showAsymptote: !prev.showAsymptote }));
          break;
        case "e":
        case "E":
          setUi((prev) => ({
            ...prev,
            showEquivalents: !prev.showEquivalents,
          }));
          break;
        case "g":
        case "G":
          setUi((prev) => ({ ...prev, showGrid: !prev.showGrid }));
          break;
        case "c":
        case "C":
          setSelection(new Set());
          break;
        case "f":
        case "F":
          canvasRef.current?.fitView("auto");
          break;
        case "1":
        case "2":
        case "3":
          setUi((prev) => ({ ...prev, layout: LAYOUT_KEYS[event.key] }));
          break;
        case "w":
          setUi((prev) => ({ ...prev, wholes: Math.min(6, prev.wholes + 1) }));
          break;
        case "W":
          setUi((prev) => ({ ...prev, wholes: Math.max(1, prev.wholes - 1) }));
          break;
        case "[":
          setUi((prev) => ({
            ...prev,
            maxDenominator: clamp(
              prev.maxDenominator - 4,
              MIN_DENOMINATOR_LIMIT,
              MAX_DENOMINATOR_LIMIT,
            ),
          }));
          break;
        case "]":
          setUi((prev) => ({
            ...prev,
            maxDenominator: clamp(
              prev.maxDenominator + 4,
              MIN_DENOMINATOR_LIMIT,
              MAX_DENOMINATOR_LIMIT,
            ),
          }));
          break;
        case "?":
          setHelpOpen((open) => !open);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="fw-app">
      <header className="fw-top">
        <div className="fw-brand">
          <h1>Fraction wall</h1>
          <p>
            {denominators.length} rows &middot; {wholes}{" "}
            {wholes === 1 ? "whole" : "wholes"} &middot; {unit.emoji}{" "}
            {unit.label.toLowerCase()}
          </p>
        </div>
        <div className="fw-top__actions">
          <button
            type="button"
            className="fw-link"
            aria-expanded={panelOpen}
            onClick={() => setPanelOpen((open) => !open)}
          >
            {panelOpen ? "Hide controls" : "Show controls"}
          </button>
          <button
            type="button"
            className="fw-link"
            onClick={() => setHelpOpen(true)}
          >
            Help
          </button>
        </div>
      </header>

      <main className="fw-main" data-panel={panelOpen ? "open" : "closed"}>
        {panelOpen && (
          <aside className="fw-sidebar" aria-label="Wall controls">
            <ControlPanel
              ui={ui}
              patch={patch}
              denominators={denominators}
              unit={unit}
              pieceCount={pieceCount}
              onView={handleView}
            />
          </aside>
        )}

        <div className="fw-stage-wrap">
          <WallCanvas
            ref={canvasRef}
            config={config}
            selection={activeSelection}
            onHover={setHover}
            onPick={handlePick}
            onStats={setStats}
          />
          <InfoPanel
            hover={hover}
            summary={summary}
            unit={unit}
            stats={stats}
            showAsymptote={showAsymptote}
            onClear={clearSelection}
          />
        </div>
      </main>

      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
