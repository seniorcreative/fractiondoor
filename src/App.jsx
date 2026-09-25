import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ControlPanel from "./components/ControlPanel.jsx";
import ExplorePanel from "./components/ExplorePanel.jsx";
import HelpOverlay from "./components/HelpOverlay.jsx";
import InfoPanel from "./components/InfoPanel.jsx";
import LessonBar from "./components/LessonBar.jsx";
import LessonPicker from "./components/LessonPicker.jsx";
import LevelSwitcher from "./components/LevelSwitcher.jsx";
import WallCanvas from "./components/WallCanvas.jsx";
import {
  MAX_DENOMINATOR_LIMIT,
  MIN_DENOMINATOR_LIMIT,
  buildDenominators,
  clamp,
  countPieces,
} from "./lib/denominators.js";
import { constrainToLevel, getLevel, levelDefaults } from "./lib/levels.js";
import { advanceLesson, lessonStartPatch } from "./lib/lessons.js";
import {
  pruneSelection,
  rowKeys,
  runKeys,
  selectionSummary,
  toggleGroup,
  toggleKey,
} from "./lib/selection.js";
import { resolveUnit } from "./lib/units.js";
import { getLesson } from "./lessons/index.js";
import { ICONS } from "./lib/icons.js";

const LABEL_CYCLE = ["none", "fraction", "name", "value"];
const LAYOUT_KEYS = { 1: "wall", 2: "steps", 3: "arc" };

function UnitIcon({ unit }) {
  const Icon = ICONS[unit.icon];
  if (!Icon) return null;
  return (
    <Icon
      size={13}
      strokeWidth={2}
      aria-hidden="true"
      style={{ verticalAlign: "-2px", display: "inline-block" }}
    />
  );
}

const DEFAULT_UI = {
  level: "build",
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
  const [cameraMoved, setCameraMoved] = useState(false);
  const [stats, setStats] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [lessonPickerOpen, setLessonPickerOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  // Lesson runtime state.
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [lessonStepIndex, setLessonStepIndex] = useState(0);

  const canvasRef = useRef(null);
  const level = getLevel(ui.level);

  const patch = useCallback(
    (next) => setUi((prev) => ({ ...prev, ...next })),
    [],
  );

  const switchLevel = useCallback((id) => {
    setUi((prev) => constrainToLevel({ ...prev, ...levelDefaults(id) }));
    setActiveLessonId(null);
    setSelection(new Set());
    setCameraMoved(false);
  }, []);

  // ---------------------------------------------------------- derived config

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

  // Lesson step overlays on top of ui-driven config.
  const activeLesson = activeLessonId ? getLesson(activeLessonId) : null;

  const lessonState = useMemo(() => {
    if (!activeLesson) return null;
    const appState = {
      selection,
      denominators,
      config: { unit, showAsymptote },
      lastHover: hover,
      cameraMoved,
    };
    return advanceLesson(activeLesson, lessonStepIndex, appState);
  }, [
    activeLesson,
    lessonStepIndex,
    selection,
    denominators,
    unit,
    showAsymptote,
    hover,
    cameraMoved,
  ]);

  // Lesson step advancement. useMemo gives us lessonState synchronously;
  // we write it out to proper state in an effect so the linter is happy.
  // The effect runs once per lessonState change; because lessonState is a
  // memo it only changes when the predicate flips, so there is no cascade.
  useEffect(() => {
    if (!lessonState || lessonState.done) return;
    if (lessonState.stepIndex !== lessonStepIndex) {
      setLessonStepIndex(lessonState.stepIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonState]);

  const lessonDone = lessonState?.done ?? false;
  // Praise comes from the step that just completed. advanceLesson returns it
  // on the state object of the *next* step, so it is available right after the
  // index increments. LessonBar handles its own timer for how long to show it.
  const lessonPraise = lessonState?.praise ?? null;

  const lessonConfigPatch = lessonState?.configPatch ?? null;

  const config = useMemo(() => {
    const base = {
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
      cardDetail: level.ui.cardDetail,
      cameraLimits: level.camera,
    };
    if (!lessonConfigPatch) return base;
    // Lesson step overrides: merge config fields, but always use live denominators.
    const merged = { ...base, ...lessonConfigPatch };
    merged.denominators = denominators;
    merged.unit = unit;
    return merged;
  }, [
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
    level,
    lessonConfigPatch,
  ]);

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

  // ---------------------------------------------------------- handlers

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

  const handleHover = useCallback((info) => {
    setHover(info);
    if (info) setCameraMoved(true); // if you can hover you've at least not lost the wall
  }, []);

  const clearSelection = useCallback(() => setSelection(new Set()), []);
  const handleView = useCallback((preset) => {
    canvasRef.current?.fitView(preset);
    setCameraMoved(true);
  }, []);

  const startLesson = useCallback((id) => {
    const lesson = getLesson(id);
    if (!lesson) return;
    setLessonPickerOpen(false);
    setActiveLessonId(id);
    setLessonStepIndex(0);
    setSelection(new Set());
    setCameraMoved(false);
    // Switch to the lesson's level if needed.
    const patch = lessonStartPatch(lesson);
    setUi((prev) => {
      const next = constrainToLevel({
        ...prev,
        ...levelDefaults(lesson.level),
        ...patch,
      });
      return next;
    });
    canvasRef.current?.fitView("front");
  }, []);

  const skipStep = useCallback(() => {
    if (!activeLesson) return;
    const next = lessonStepIndex + 1;
    if (next >= activeLesson.steps.length) {
    } else {
      setLessonStepIndex(next);
    }
  }, [activeLesson, lessonStepIndex]);

  const exitLesson = useCallback(() => {
    setActiveLessonId(null);
  }, []);

  // ---------------------------------------------------------- keyboard shortcuts

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      const inv = level.ui;

      switch (event.key) {
        case "l":
        case "L": {
          const modes = inv.labelModes ?? LABEL_CYCLE;
          setUi((prev) => ({
            ...prev,
            labelMode:
              modes[(modes.indexOf(prev.labelMode) + 1) % modes.length],
          }));
          break;
        }
        case "a":
        case "A":
          if (inv.showAsymptote)
            setUi((prev) => ({ ...prev, showAsymptote: !prev.showAsymptote }));
          break;
        case "e":
        case "E":
          if (inv.showEquivalentsToggle)
            setUi((prev) => ({
              ...prev,
              showEquivalents: !prev.showEquivalents,
            }));
          break;
        case "g":
        case "G":
          if (inv.showGrid)
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
        case "3": {
          const layouts = inv.layouts;
          const target = LAYOUT_KEYS[event.key];
          if (!layouts || layouts.includes(target))
            setUi((prev) => ({ ...prev, layout: target }));
          break;
        }
        case "w":
          setUi((prev) => ({
            ...prev,
            wholes: Math.min(inv.wholesMax ?? 6, prev.wholes + 1),
          }));
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
          if (inv.showKeyboardHelp) setHelpOpen((open) => !open);
          break;
        case "Escape":
          if (activeLessonId) exitLesson();
          else if (helpOpen) setHelpOpen(false);
          else if (lessonPickerOpen) setLessonPickerOpen(false);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [level, activeLessonId, exitLesson, helpOpen, lessonPickerOpen]);

  // ---------------------------------------------------------- render

  const isExplore = ui.level === "explore";

  return (
    <div className="fw-app" data-level={ui.level}>
      <header className="fw-top">
        <div className="fw-brand">
          <h1>Fraction wall</h1>
          <p>
            {denominators.length} rows &middot; {wholes}{" "}
            {wholes === 1 ? "whole" : "wholes"} &middot;{" "}
            <UnitIcon unit={unit} /> {unit.label.toLowerCase()}
          </p>
        </div>
        <div className="fw-top__actions">
          <LevelSwitcher current={ui.level} onChange={switchLevel} />
          <button
            type="button"
            className="fw-link"
            onClick={() => setLessonPickerOpen(true)}
          >
            Lessons
          </button>
          {!isExplore && (
            <button
              type="button"
              className="fw-link"
              aria-expanded={panelOpen}
              onClick={() => setPanelOpen((open) => !open)}
            >
              {panelOpen ? "Hide controls" : "Controls"}
            </button>
          )}
          {level.ui.showKeyboardHelp && (
            <button
              type="button"
              className="fw-link"
              onClick={() => setHelpOpen(true)}
            >
              Help
            </button>
          )}
        </div>
      </header>

      <main
        className="fw-main"
        data-panel={!isExplore && panelOpen ? "open" : "closed"}
      >
        {isExplore ? (
          <aside
            className="fw-sidebar fw-sidebar--explore"
            aria-label="Explore controls"
          >
            <ExplorePanel ui={ui} patch={patch} />
          </aside>
        ) : (
          panelOpen && (
            <aside className="fw-sidebar" aria-label="Wall controls">
              <ControlPanel
                ui={ui}
                patch={patch}
                denominators={denominators}
                unit={unit}
                pieceCount={pieceCount}
                onView={handleView}
                levelUi={level.ui}
              />
            </aside>
          )
        )}

        <div className="fw-stage-wrap">
          <WallCanvas
            ref={canvasRef}
            config={config}
            selection={activeSelection}
            onHover={handleHover}
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
            levelUi={level.ui}
          />
          {activeLesson && (
            <LessonBar
              lesson={activeLesson}
              step={lessonState?.step ?? null}
              stepIndex={lessonStepIndex}
              done={lessonDone}
              praise={lessonPraise}
              onSkip={skipStep}
              onExit={exitLesson}
            />
          )}
        </div>
      </main>

      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
      {lessonPickerOpen && (
        <LessonPicker
          onStart={startLesson}
          onClose={() => setLessonPickerOpen(false)}
        />
      )}
    </div>
  );
}
