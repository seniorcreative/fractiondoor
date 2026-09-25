/**
 * The 1/n curve and the line it never reaches.
 *
 * The right-hand edge of the first piece in each row sits at 1/n of the whole.
 * Threading a curve through those points draws y = 1/n, and the left edge of
 * the whole (t = 0) is its asymptote. Add rows and the curve visibly flattens
 * onto that line without ever touching it, which is the thing a paper wall
 * stops short of showing.
 */

import {
  CatmullRomCurve3,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { SCENE_COLORS } from '../lib/palette.js';

const GHOST_STEPS = 9;
const GHOST_GROWTH = 1.7;

export class AsymptoteLayer {
  constructor() {
    this.group = new Group();
    this.group.name = 'asymptote';
    this.group.visible = false;

    this.curveMaterial = new MeshBasicMaterial({ color: SCENE_COLORS.curve, toneMapped: false });
    this.ghostMaterial = new MeshBasicMaterial({
      color: SCENE_COLORS.curve,
      transparent: true,
      opacity: 0.3,
      toneMapped: false,
    });
    this.axisMaterial = new MeshBasicMaterial({
      color: SCENE_COLORS.asymptote,
      transparent: true,
      opacity: 0.85,
      toneMapped: false,
    });
    this.markerMaterial = new MeshBasicMaterial({ color: 0x1f2a44, toneMapped: false });
    this.markerGeometry = new SphereGeometry(1, 8, 6);

    this.meshes = [];
    this.markers = null;
    this.dummy = new Object3D();
  }

  /**
   * @param {ReturnType<import('./layout.js').createLayout>} layout
   * @param {number[]} denominators
   * @param {boolean} visible
   */
  update(layout, denominators, visible) {
    this.group.visible = visible;
    this.#clearMeshes();
    if (!visible || denominators.length < 2) return;

    const scale = Math.max(0.5, Math.min(1.6, layout.dims.wholeWidth / 6));
    const tubeRadius = 0.028 * scale;

    const realPoints = denominators.map((den, rowIndex) =>
      this.#surfacePoint(layout, rowIndex, 1 / den),
    );

    // The measured curve through the rows that actually exist.
    this.#addTube(realPoints, tubeRadius, this.curveMaterial);

    // A dotted continuation for the rows we have not drawn: n keeps growing,
    // 1/n keeps shrinking, the curve keeps bending towards the axis.
    const lastDen = denominators[denominators.length - 1];
    const ghost = [realPoints[realPoints.length - 1]];
    for (let k = 1; k <= GHOST_STEPS; k += 1) {
      const den = lastDen * GHOST_GROWTH ** k;
      ghost.push(this.#surfacePoint(layout, denominators.length - 1 + k, 1 / den));
    }
    this.#addTube(ghost, tubeRadius * 0.75, this.ghostMaterial);

    // The asymptote itself: t = 0, extended past the last row.
    const axisTop = this.#surfacePoint(layout, -0.8, 0);
    const axisBottom = this.#surfacePoint(layout, denominators.length - 1 + GHOST_STEPS + 0.8, 0);
    this.#addTube([axisTop, axisBottom], tubeRadius * 0.7, this.axisMaterial);

    // A dot on each row's 1/n point.
    const markers = new InstancedMesh(this.markerGeometry, this.markerMaterial, realPoints.length);
    const markerScale = tubeRadius * 2.1;
    realPoints.forEach((point, i) => {
      this.dummy.position.copy(point);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(markerScale);
      this.dummy.updateMatrix();
      markers.setMatrixAt(i, this.dummy.matrix);
    });
    markers.frustumCulled = false;
    this.markers = markers;
    this.group.add(markers);
  }

  /** Point on the front face of the wall, so the curve is never buried. */
  #surfacePoint(layout, rowIndex, t) {
    const a = layout.anchor(0, rowIndex, t);
    const lift = layout.dims.depth / 2 + 0.07;
    return new Vector3(
      a.x + Math.sin(a.ry) * lift,
      a.y,
      a.z + Math.cos(a.ry) * lift,
    );
  }

  #addTube(points, radius, material) {
    if (points.length < 2) return;
    const curve = new CatmullRomCurve3(points, false, 'catmullrom', 0.25);
    const geometry = new TubeGeometry(curve, Math.max(24, points.length * 6), radius, 7, false);
    const mesh = new Mesh(geometry, material);
    mesh.frustumCulled = false;
    this.meshes.push(mesh);
    this.group.add(mesh);
  }

  #clearMeshes() {
    this.meshes.forEach((mesh) => {
      this.group.remove(mesh);
      mesh.geometry.dispose();
    });
    this.meshes.length = 0;
    if (this.markers) {
      this.group.remove(this.markers);
      this.markers.dispose();
      this.markers = null;
    }
  }

  dispose() {
    this.#clearMeshes();
    this.markerGeometry.dispose();
    this.curveMaterial.dispose();
    this.ghostMaterial.dispose();
    this.axisMaterial.dispose();
    this.markerMaterial.dispose();
  }
}
