/**
 * The 3D fraction wall.
 *
 * Every piece of every row of every whole is one instance of a single box mesh,
 * which is what lets the wall run to hundreds of rows without falling over:
 * 200 rows across 4 wholes is ~80 000 blocks in one draw call.
 *
 * React owns the configuration and the selection; this class owns the WebGL
 * side and reports hover/click back through handlers. It is deliberately
 * imperative and self-contained so React re-renders never touch the scene
 * graph.
 */

import {
  ACESFilmicToneMapping,
  BoxGeometry,
  Color,
  DirectionalLight,
  DynamicDrawUsage,
  Fog,
  GridHelper,
  Group,
  HemisphereLight,
  InstancedMesh,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { buildPieces, createLayout } from './layout.js';
import { HoverCard, LabelLayer } from './labels.js';
import { AsymptoteLayer } from './asymptote.js';
import {
  SCENE_COLORS,
  equivalentHsl,
  hoveredHsl,
  pieceHsl,
  selectedHsl,
} from '../lib/palette.js';
import { frac, toDecimalString, toPercentString } from '../lib/fraction.js';
import {
  equivalentFractions,
  pieceName,
  rowCaption,
} from '../lib/names.js';
import { formatUnitValue, wholeCaption } from '../lib/units.js';

const MAX_LABELS = 460;
const MAX_CAPTION_ROWS = 28;
const LABEL_ALL_LIMIT = 24;
const CLICK_SLOP_PX = 6;
const CLICK_MAX_MS = 450;
const HOVER_POP = 0.12;
const SELECT_POP = 0.2;
const EQUIVALENT_POP = 0.06;

export class FractionWallScene {
  constructor(container, handlers = {}) {
    this.container = container;
    this.handlers = handlers;

    this.config = null;
    this.layout = null;
    this.pieces = [];
    this.keyToIndex = new Map();
    this.baseHsl = new Float32Array(0);
    this.selection = new Set();
    this.hoveredIndex = -1;
    this.equivalentIndices = new Set();
    this.highlightIndices = new Set();

    this.structureKey = null;
    this.layoutKey = null;
    this.labelKey = null;
    this.asymptoteKey = null;
    this.statsSignature = null;
    this.lastStatsAt = 0;

    this.renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.className = 'fw-canvas';
    container.appendChild(this.renderer.domElement);

    this.scene = new Scene();
    this.scene.background = new Color(SCENE_COLORS.background);
    this.scene.fog = new Fog(SCENE_COLORS.fog, 40, 160);

    this.camera = new PerspectiveCamera(50, 1, 0.1, 600);
    this.camera.position.set(0, 1.4, 16);

    const hemi = new HemisphereLight(0xa8c8ff, 0x0a0e1a, 1.15);
    const key = new DirectionalLight(0xffffff, 1.9);
    key.position.set(5, 9, 11);
    const fill = new DirectionalLight(0x9fb8ff, 0.7);
    fill.position.set(-9, 3, 6);
    const rim = new DirectionalLight(0xffd9a8, 0.5);
    rim.position.set(0, -6, -8);
    this.scene.add(hemi, key, fill, rim);

    this.grid = new GridHelper(200, 100, SCENE_COLORS.grid, SCENE_COLORS.grid);
    this.grid.material.transparent = true;
    this.grid.material.opacity = 0.32;
    this.scene.add(this.grid);

    this.content = new Group();
    this.scene.add(this.content);

    this.blockGeometry = new BoxGeometry(1, 1, 1);
    this.blockMaterial = new MeshStandardMaterial({ roughness: 0.42, metalness: 0.06 });
    this.backingMaterial = new MeshStandardMaterial({
      color: 0x121a30,
      roughness: 0.95,
      metalness: 0,
    });
    this.backings = [];
    this.blocks = null;

    this.asymptote = new AsymptoteLayer();
    this.content.add(this.asymptote.group);

    this.labelLayer = new LabelLayer(container);
    this.scene.add(this.labelLayer.group);
    this.hoverCard = new HoverCard();
    this.scene.add(this.hoverCard.object);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.minDistance = 0.4;
    this.controls.maxDistance = 400;
    this.controls.maxPolarAngle = Math.PI * 0.97;
    this.controls.zoomToCursor = true;

    this.raycaster = new Raycaster();
    this.pointer = new Vector2();
    this.pointerInside = false;
    this.needsRaycast = false;
    this.downPoint = null;
    this.downTime = 0;
    this.dummy = new Object3D();
    this.tmpColor = new Color();
    this.tmpVecA = new Vector3();
    this.tmpVecB = new Vector3();

    this.onPointerMove = (event) => {
      this.pointerInside = true;
      this.#updatePointer(event);
      this.needsRaycast = true;
    };
    this.onPointerLeave = () => {
      this.pointerInside = false;
      this.#setHovered(-1);
    };
    this.onPointerDown = (event) => {
      this.downPoint = { x: event.clientX, y: event.clientY };
      this.downTime = performance.now();
    };
    this.onPointerUp = (event) => {
      const down = this.downPoint;
      this.downPoint = null;
      if (!down || event.button !== 0) return;
      const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
      if (moved > CLICK_SLOP_PX || performance.now() - this.downTime > CLICK_MAX_MS) return;
      this.#updatePointer(event);
      const index = this.#raycast();
      if (index < 0) {
        this.handlers.onPickEmpty?.();
        return;
      }
      const piece = this.pieces[index];
      this.handlers.onPick?.({
        ...this.#pieceInfo(piece),
        runToStart: event.shiftKey,
        wholeRow: event.altKey,
      });
    };

    const el = this.renderer.domElement;
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerleave', this.onPointerLeave);
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerup', this.onPointerUp);

    this.resizeObserver = new ResizeObserver(() => this.#resize());
    this.resizeObserver.observe(container);
    this.#resize();

    this.tick = this.tick.bind(this);
    this.renderer.setAnimationLoop(this.tick);
  }

  /**
   * Push a new configuration. Work is keyed so that changing the label mode
   * does not rebuild geometry and changing the selection does not rebuild
   * labels.
   *
   * @param {object} config resolved config: denominators, wholes, layout,
   *   intensity, labelMode, showCaptions, showAsymptote, showEquivalents, unit
   * @param {Set<string>} selection piece keys
   */
  update(config, selection = new Set()) {
    const previous = this.config;
    this.config = config;
    this.selection = selection;

    const structureKey = `${config.denominators.join(',')}|${config.wholes}`;
    const layoutKey = `${structureKey}|${config.layout}|${config.intensity}`;
    const labelKey = [
      layoutKey,
      config.labelMode,
      config.showCaptions,
      config.unit.id,
      config.unit.amount,
      config.unit.unit,
      config.unit.wholeName,
    ].join('|');
    const asymptoteKey = `${layoutKey}|${config.showAsymptote}`;

    const structureChanged = structureKey !== this.structureKey;
    const layoutChanged = layoutKey !== this.layoutKey;
    const firstRun = this.layoutKey === null;

    if (structureChanged) {
      this.structureKey = structureKey;
      this.#buildStructure();
    }
    if (layoutChanged) {
      this.layoutKey = layoutKey;
      this.#applyLayout();
    }
    if (asymptoteKey !== this.asymptoteKey) {
      this.asymptoteKey = asymptoteKey;
      this.asymptote.update(this.layout, config.denominators, !!config.showAsymptote);
    }
    if (labelKey !== this.labelKey) {
      this.labelKey = labelKey;
      this.#buildLabels();
    }
    if (previous && previous.showEquivalents !== config.showEquivalents) {
      this.#computeEquivalents();
    }

    this.grid.visible = config.showGrid !== false;
    this.#refreshHighlights(structureChanged);

    if (layoutChanged) {
      this.fitView(firstRun ? 'front' : 'auto');
    }
    this.statsSignature = null; // force a stats emit on the next frame
  }

  /** Frame the content. `auto` keeps the current orbit direction. */
  fitView(preset = 'auto') {
    if (!this.layout) return;
    const { min, max } = this.layout.bounds();
    const center = new Vector3((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);
    const radius = 0.5 * Math.hypot(max.x - min.x, max.y - min.y, max.z - min.z);

    const direction = new Vector3(0, 0.1, 1);
    switch (preset) {
      case 'front':
        direction.set(0, 0.08, 1);
        break;
      case 'iso':
        direction.set(0.8, 0.55, 1);
        break;
      case 'top':
        direction.set(0, 1, 0.22);
        break;
      case 'side':
        direction.set(1, 0.22, 0.3);
        break;
      case 'inside':
        break;
      default:
        direction.copy(this.camera.position).sub(this.controls.target);
        if (direction.lengthSq() < 1e-6) direction.set(0, 0.08, 1);
        break;
    }
    direction.normalize();

    let distance;
    if (preset === 'inside') {
      const inside = this.layout.insidePoint;
      const target = new Vector3(0, center.y, inside ? 0 : center.z);
      const position = inside
        ? new Vector3(0, center.y, inside.z)
        : new Vector3(center.x, center.y, center.z + Math.max(2.4, radius * 0.2));
      this.controls.target.copy(target);
      this.camera.position.copy(position);
      distance = position.distanceTo(target);
    } else {
      const fit = this.#fitDistance(min, max, center, direction);
      distance = fit.distance;
      this.controls.target.copy(center);
      this.camera.position.copy(center).addScaledVector(direction, distance);

      // Nudge the framing so the readout panel covers empty space rather than
      // the wall.
      const { right, bottom } = this.#safeArea();
      if (right || bottom) {
        const height = this.container.clientHeight || 1;
        const worldPerPixel = (2 * distance * Math.tan(MathUtils.degToRad(this.camera.fov) / 2)) / height;
        const shift = new Vector3()
          .addScaledVector(fit.right, (right / 2) * worldPerPixel)
          .addScaledVector(fit.up, (-bottom / 2) * worldPerPixel);
        this.controls.target.add(shift);
        this.camera.position.add(shift);
      }
    }

    this.camera.near = Math.max(0.05, distance * 0.006);
    this.camera.far = distance * 8 + radius * 6 + 40;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.#updateFog(radius, distance);
  }

  /** Screen edges covered by the overlay panels, in CSS pixels. */
  #safeArea() {
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    if (width >= 900) return { right: Math.min(340, width * 0.3), bottom: 0 };
    return { right: 0, bottom: Math.min(height * 0.45, 300) };
  }

  /**
   * Distance at which the content's bounding box just fills the usable frame
   * from a given direction. Measuring the box's extent along the camera's own
   * axes keeps flat walls close instead of framing their diagonal like a sphere.
   */
  #fitDistance(min, max, center, direction) {
    const worldUp = Math.abs(direction.y) > 0.999 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0);
    const right = new Vector3().crossVectors(worldUp, direction).normalize();
    const up = new Vector3().crossVectors(direction, right).normalize();

    const corner = new Vector3();
    let halfWidth = 0;
    let halfHeight = 0;
    let halfDepth = 0;
    for (let i = 0; i < 8; i += 1) {
      corner.set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z).sub(center);
      halfWidth = Math.max(halfWidth, Math.abs(corner.dot(right)));
      halfHeight = Math.max(halfHeight, Math.abs(corner.dot(up)));
      halfDepth = Math.max(halfDepth, Math.abs(corner.dot(direction)));
    }

    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    const safe = this.#safeArea();
    const usableWidth = Math.max(80, width - safe.right);
    const usableHeight = Math.max(80, height - safe.bottom);

    const vFov = MathUtils.degToRad(this.camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(0.2, this.camera.aspect));
    const fitVertical = (halfHeight / Math.tan(vFov / 2)) * (height / usableHeight);
    const fitHorizontal = (halfWidth / Math.tan(hFov / 2)) * (width / usableWidth);

    return {
      distance: Math.max(1.5, Math.max(fitVertical, fitHorizontal) * 1.06 + halfDepth),
      right,
      up,
    };
  }

  tick() {
    this.controls.update();
    if (this.needsRaycast) {
      this.needsRaycast = false;
      this.#setHovered(this.#raycast());
    }
    this.renderer.render(this.scene, this.camera);
    this.labelLayer.render(this.scene, this.camera);
    this.#maybeEmitStats();
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerleave', this.onPointerLeave);
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointerup', this.onPointerUp);
    this.controls.dispose();
    this.asymptote.dispose();
    this.labelLayer.dispose();
    this.hoverCard.dispose();
    this.#disposeBlocks();
    this.blockGeometry.dispose();
    this.blockMaterial.dispose();
    this.backingMaterial.dispose();
    this.grid.geometry.dispose();
    this.grid.material.dispose();
    this.renderer.dispose();
    el.remove();
  }

  // ---------------------------------------------------------------- internals

  #buildStructure() {
    this.#disposeBlocks();
    const { denominators, wholes } = this.config;
    this.pieces = buildPieces(denominators, wholes);
    this.keyToIndex = new Map();
    this.baseHsl = new Float32Array(this.pieces.length * 3);
    this.pieces.forEach((piece, i) => {
      this.keyToIndex.set(piece.key, i);
      const { h, s, l } = pieceHsl(piece.den, piece.index);
      this.baseHsl[i * 3] = h;
      this.baseHsl[i * 3 + 1] = s;
      this.baseHsl[i * 3 + 2] = l;
    });

    this.hoveredIndex = -1;
    this.equivalentIndices = new Set();
    this.highlightIndices = new Set();
    this.hoverCard.hide();

    this.blocks = new InstancedMesh(this.blockGeometry, this.blockMaterial, this.pieces.length);
    this.blocks.instanceMatrix.setUsage(DynamicDrawUsage);
    this.blocks.frustumCulled = false;
    this.content.add(this.blocks);
  }

  #disposeBlocks() {
    if (this.blocks) {
      this.content.remove(this.blocks);
      this.blocks.dispose();
      this.blocks = null;
    }
    this.backings.forEach((mesh) => {
      this.content.remove(mesh);
      mesh.geometry.dispose();
    });
    this.backings = [];
  }

  #applyLayout() {
    this.layout = createLayout(this.config, this.config.denominators);
    for (let i = 0; i < this.pieces.length; i += 1) this.#writeMatrix(i);
    this.blocks.instanceMatrix.needsUpdate = true;
    this.blocks.computeBoundingSphere();
    this.#updateBackings();
    const { min, max } = this.layout.bounds();
    this.grid.position.set(0, min.y - 0.8, 0);
    this.#updateFog(0.5 * Math.hypot(max.x - min.x, max.y - min.y, max.z - min.z));
    if (this.hoveredIndex >= 0) this.#moveHoverCard(this.hoveredIndex);
  }

  /** Position/scale one instance, lifting hovered and selected pieces forward. */
  #writeMatrix(index) {
    const piece = this.pieces[index];
    const mid = (piece.t0 + piece.t1) / 2;
    const anchor = this.layout.anchor(piece.wholeIndex, piece.rowIndex, mid);
    const size = this.layout.pieceSize(piece.t0, piece.t1);

    let pop = 0;
    if (this.selection.has(piece.key)) pop = SELECT_POP;
    else if (index === this.hoveredIndex) pop = HOVER_POP;
    else if (this.equivalentIndices.has(index)) pop = EQUIVALENT_POP;

    this.dummy.position.set(
      anchor.x + Math.sin(anchor.ry) * pop,
      anchor.y,
      anchor.z + Math.cos(anchor.ry) * pop,
    );
    this.dummy.rotation.set(0, anchor.ry, 0);
    this.dummy.scale.set(size.w, size.h, size.d);
    this.dummy.updateMatrix();
    this.blocks.setMatrixAt(index, this.dummy.matrix);
  }

  /**
   * Repaint and re-place the blocks whose role changed: selected, hovered or
   * part of the equivalent-span highlight. Sweeping the pointer across a
   * 200-row wall touches a handful of instances instead of all 80 000.
   */
  #refreshHighlights(full = false) {
    if (!this.blocks || !this.layout) return;

    const current = new Set();
    for (const key of this.selection) {
      const index = this.keyToIndex.get(key);
      if (index !== undefined) current.add(index);
    }
    for (const index of this.equivalentIndices) current.add(index);
    if (this.hoveredIndex >= 0) current.add(this.hoveredIndex);

    if (full) {
      for (let i = 0; i < this.pieces.length; i += 1) {
        this.#writeColor(i);
        this.#writeMatrix(i);
      }
    } else {
      const touched = new Set(this.highlightIndices);
      for (const index of current) touched.add(index);
      for (const index of touched) {
        this.#writeColor(index);
        this.#writeMatrix(index);
      }
    }

    this.highlightIndices = current;
    this.blocks.instanceMatrix.needsUpdate = true;
    if (this.blocks.instanceColor) this.blocks.instanceColor.needsUpdate = true;
  }

  #writeColor(index) {
    const piece = this.pieces[index];
    if (!piece) return;
    const base = {
      h: this.baseHsl[index * 3],
      s: this.baseHsl[index * 3 + 1],
      l: this.baseHsl[index * 3 + 2],
    };
    let hsl = base;
    if (this.selection.has(piece.key)) hsl = selectedHsl();
    else if (index === this.hoveredIndex) hsl = hoveredHsl(base);
    else if (this.equivalentIndices.has(index)) hsl = equivalentHsl(base);
    this.tmpColor.setHSL(hsl.h, hsl.s, hsl.l);
    this.blocks.setColorAt(index, this.tmpColor);
  }

  #updateBackings() {
    const wanted = [];
    for (let wi = 0; wi < this.layout.wholes; wi += 1) {
      const box = this.layout.backing(wi);
      if (box) wanted.push(box);
    }
    while (this.backings.length > wanted.length) {
      const mesh = this.backings.pop();
      this.content.remove(mesh);
      mesh.geometry.dispose();
    }
    wanted.forEach((box, i) => {
      let mesh = this.backings[i];
      if (!mesh) {
        mesh = new Mesh(new BoxGeometry(1, 1, 1), this.backingMaterial);
        this.backings[i] = mesh;
        this.content.add(mesh);
      } else {
        mesh.geometry.dispose();
        mesh.geometry = new BoxGeometry(1, 1, 1);
      }
      mesh.position.set(box.x, box.y, box.z);
      mesh.scale.set(box.w, box.h, box.d);
    });
  }

  #updateFog(radius, distance = null) {
    const span = Math.max(8, radius * 2);
    const base = distance ?? this.camera.position.distanceTo(this.controls.target);
    this.scene.fog.near = Math.max(4, base * 0.35);
    this.scene.fog.far = base * 1.4 + span * 2.5;
  }

  #buildLabels() {
    const { labelMode, showCaptions, denominators, wholes, unit } = this.config;
    const layout = this.layout;
    const list = [];

    if (labelMode !== 'none') {
      const textCache = new Map();
      const textFor = (den) => {
        if (!textCache.has(den)) textCache.set(den, this.#labelText(den));
        return textCache.get(den);
      };

      // Rows with room get a label in every piece. Rows whose pieces are too
      // narrow to read keep one label on the first piece, which is the number
      // that matters when you are watching 1/n shrink.
      const rowCount = denominators.length;
      const firstOnlyWholes = rowCount * wholes > MAX_LABELS * 0.5 ? 1 : wholes;
      let budget = MAX_LABELS;
      const plans = denominators.map((den, rowIndex) => {
        const cost = den * wholes;
        const reserve = (rowCount - rowIndex - 1) * firstOnlyWholes;
        if (den <= LABEL_ALL_LIMIT && cost + reserve <= budget) {
          budget -= cost;
          return 'all';
        }
        budget -= firstOnlyWholes;
        return 'first';
      });

      denominators.forEach((den, rowIndex) => {
        const plan = plans[rowIndex];
        const className = labelClass(layout.spanWidth(0, 1 / den));
        const wholeLimit = plan === 'all' ? wholes : firstOnlyWholes;
        for (let wi = 0; wi < wholeLimit; wi += 1) {
          const pieceLimit = plan === 'all' ? den : 1;
          for (let index = 0; index < pieceLimit; index += 1) {
            if (list.length >= MAX_LABELS) return;
            list.push({
              text: textFor(den),
              className,
              position: this.#surfacePosition(wi, rowIndex, (index + 0.5) / den, 0.02),
            });
          }
        }
      });
    }

    if (showCaptions) {
      const step = Math.max(1, Math.ceil(denominators.length / MAX_CAPTION_ROWS));
      denominators.forEach((den, rowIndex) => {
        const isEdge = rowIndex === 0 || rowIndex === denominators.length - 1;
        if (!isEdge && rowIndex % step !== 0) return;
        list.push({
          text: rowCaption(den),
          className: 'fw-caption',
          center: { x: 1, y: 0.5 },
          position: this.#surfacePosition(0, rowIndex, -0.02, 0),
        });
      });

      for (let wi = 0; wi < wholes; wi += 1) {
        const parts = [unit.emoji];
        if (wholes > 1) parts.push(`whole ${wi + 1}`);
        if (wi === 0 || wholes === 1) parts.push(wholeCaption(unit));
        list.push({
          text: parts.filter(Boolean).join(' \u00b7 '),
          className: 'fw-whole-caption',
          position: this.#surfacePosition(wi, -0.95, 0.5, 0),
        });
      }
    }

    this.labelLayer.setLabels(list);
  }

  #labelText(den) {
    const { labelMode, unit } = this.config;
    if (labelMode === 'name') return den === 1 ? 'one whole' : pieceName(den);
    if (labelMode === 'value') return formatUnitValue(frac(1, den), unit).text;
    return den === 1 ? '1' : `1/${den}`;
  }

  /** A point just off the front face of the wall, in any layout. */
  #surfacePosition(wholeIndex, rowIndex, t, extra = 0) {
    const anchor = this.layout.anchor(wholeIndex, rowIndex, t);
    const lift = this.layout.dims.depth / 2 + extra;
    return {
      x: anchor.x + Math.sin(anchor.ry) * lift,
      y: anchor.y,
      z: anchor.z + Math.cos(anchor.ry) * lift,
    };
  }

  #updatePointer(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  #raycast() {
    if (!this.blocks || !this.pieces.length) return -1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.blocks, false);
    return hits.length ? hits[0].instanceId ?? -1 : -1;
  }

  #setHovered(index) {
    if (!this.blocks || !this.layout) return;
    if (index === this.hoveredIndex) return;
    this.hoveredIndex = index;
    this.#computeEquivalents();
    this.#refreshHighlights();

    if (index < 0) {
      this.hoverCard.hide();
      this.handlers.onHover?.(null);
      return;
    }
    const info = this.#pieceInfo(this.pieces[index]);
    this.#moveHoverCard(index, info);
    this.handlers.onHover?.(info);
  }

  #moveHoverCard(index, info = null) {
    const piece = this.pieces[index];
    const mid = (piece.t0 + piece.t1) / 2;
    const position = this.#surfacePosition(piece.wholeIndex, piece.rowIndex, mid, 0.1);
    position.y += this.layout.dims.rowHeight * 0.55;
    this.hoverCard.show(position, info ?? this.#pieceInfo(piece));
  }

  /**
   * Pieces in other rows of the same whole that cover exactly the same span.
   * Aligning on both edges is what makes 1/2 light up 2/4, 3/6, 4/8 and 6/12.
   */
  #computeEquivalents() {
    const next = new Set();
    this.equivalentIndices = next;
    if (!this.config?.showEquivalents || this.hoveredIndex < 0) return;

    const piece = this.pieces[this.hoveredIndex];
    const { den: d0, index: j, wholeIndex } = piece;
    for (const den of this.config.denominators) {
      if (den === d0) continue;
      if ((j * den) % d0 !== 0 || ((j + 1) * den) % d0 !== 0) continue;
      const start = (j * den) / d0;
      const end = ((j + 1) * den) / d0;
      for (let i = start; i < end; i += 1) {
        const index = this.keyToIndex.get(`${wholeIndex}:${den}:${i}`);
        if (index !== undefined) next.add(index);
      }
    }
  }

  #pieceInfo(piece) {
    const { den, index, wholeIndex, key } = piece;
    const fraction = frac(1, den);
    const unit = this.config.unit;
    const formatted = formatUnitValue(fraction, unit);
    const equivalentList = this.config.showEquivalents
      ? equivalentFractions(den, this.config.denominators).slice(0, 5)
      : [];
    return {
      key,
      den,
      index,
      wholeIndex,
      fraction: den === 1 ? '1' : `1/${den}`,
      name: den === 1 ? 'one whole' : pieceName(den),
      value: unit.id === 'abstract' ? null : formatted.text,
      note: formatted.note,
      decimal: toDecimalString(fraction, den > 99 ? 5 : 4),
      percent: toPercentString(fraction),
      equivalentList,
      equivalents: equivalentList.length
        ? equivalentList.map(([n, d]) => `${n}/${d}`).join(' = ')
        : null,
      wholeLabel: this.config.wholes > 1 ? `whole ${wholeIndex + 1}` : null,
    };
  }

  #resize() {
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    this.renderer.setSize(width, height, false);
    this.labelLayer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Report the width of the smallest piece in world units and in screen pixels.
   * The pixel number is the punchline of the asymptote story: 1/144 of a whole
   * is a hairline even when the wall fills the screen.
   */
  #maybeEmitStats() {
    if (!this.handlers.onStats || !this.layout || !this.config) return;
    const now = performance.now();
    if (this.statsSignature !== null && now - this.lastStatsAt < 400) return;
    this.lastStatsAt = now;

    const denominators = this.config.denominators;
    const smallestDen = denominators[denominators.length - 1];
    const rowIndex = denominators.length - 1;
    const a = this.layout.anchor(0, rowIndex, 0);
    const b = this.layout.anchor(0, rowIndex, 1 / smallestDen);
    const pxA = this.#project(a);
    const pxB = this.#project(b);
    const px = pxA && pxB ? Math.hypot(pxA.x - pxB.x, pxA.y - pxB.y) : null;

    const signature = `${denominators.length}|${smallestDen}|${px === null ? 'x' : px.toFixed(1)}`;
    if (signature === this.statsSignature) return;
    this.statsSignature = signature;
    this.handlers.onStats({
      rows: denominators.length,
      pieces: this.pieces.length,
      smallestDen,
      smallestWorldWidth: this.layout.spanWidth(0, 1 / smallestDen),
      smallestScreenPx: px,
    });
  }

  #project({ x, y, z }) {
    const v = this.tmpVecA.set(x, y, z).project(this.camera);
    if (v.z < -1 || v.z > 1) return null;
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    return { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height };
  }
}

function labelClass(width) {
  if (width < 0.3) return 'fw-label fw-label--tiny';
  if (width < 0.62) return 'fw-label fw-label--small';
  return 'fw-label';
}
