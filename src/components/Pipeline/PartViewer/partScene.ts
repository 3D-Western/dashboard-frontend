// The three.js side of the part viewer. This file (and `three`) is only ever loaded through the
// lazy import in PartViewerSlot, after the preview image is already on screen.
//
// Coordinates: the `model_glb` artifact is the part as it prints, in millimetres with the bed at
// z = 0 and Z up (dashboard-contract.md, "3D viewer data"), and highlight boxes use the same
// coordinates. The scene therefore keeps the model untouched and sets the camera's up vector to Z
// instead of rotating the model into glTF's Y-up convention.
//
// Cost: nothing renders until something changes (a drag, a tween, a pulse), pixel ratio is capped,
// and everything stops while the viewer is off-screen or the tab is hidden.

import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  GridHelper,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  TOUCH,
  Vector2,
  Vector3,
  WebGLRenderer,
  Box3,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SEVERITY_COLOR, resolveHighlights, type PartHighlight } from '@/lib/part-viewer';

const MAX_PIXEL_RATIO = 2;
const LOAD_TIMEOUT_MS = 30_000;
const TWEEN_MS = 550;
const PULSE_MS = 2000;
const PULSE_PERIOD_MS = 650;
const VIEW_DIRECTION = new Vector3(1, -1.25, 0.95).normalize();

export interface SceneOptions {
  /** Holds the canvas. */
  container: HTMLElement;
  /** Holds the numbered markers (positioned over the canvas). */
  markerLayer: HTMLElement;
  reducedMotion: boolean;
  /** A region was tapped (its marker or its surface). */
  onSelect: (code: string) => void;
  onContextLost: () => void;
}

interface Overlay {
  code: string;
  group: Group;
  materials: { material: MeshBasicMaterial | LineBasicMaterial; opacity: number }[];
  center: Vector3;
  radius: number;
  marker: HTMLButtonElement;
}

function fetchFailed(response: Response): never {
  throw new Error(`The model could not be loaded (HTTP ${response.status}).`);
}

export class PartScene {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(35, 1, 1, 5000);
  private readonly renderer: WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly raycaster = new Raycaster();
  private readonly modelGroup = new Group();
  private readonly overlayGroup = new Group();
  private readonly overlays = new Map<string, Overlay>();
  private readonly abort = new AbortController();
  private readonly resizeObserver: ResizeObserver;
  private readonly home = { position: new Vector3(), target: new Vector3() };
  private meshes: Mesh[] = [];
  private triangleCount = 0;
  private modelRadius = 50;
  private raf = 0;
  private onScreen = true;
  private pageVisible = true;
  private disposed = false;
  private activeCode: string | null = null;
  private pulseStart = 0;
  private tween: {
    start: number;
    fromPosition: Vector3;
    toPosition: Vector3;
    fromTarget: Vector3;
    toTarget: Vector3;
  } | null = null;
  private pointerDown: { x: number; y: number; time: number } | null = null;

  constructor(private readonly options: SceneOptions) {
    const { container } = options;
    this.renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    });
    // Phones have 3x screens; shading 9x the pixels for a part viewer is not worth the battery.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    this.renderer.setClearColor(0x000000, 0);
    const canvas = this.renderer.domElement;
    canvas.className = 'block size-full';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Interactive 3D view of your part on the print plate');
    container.appendChild(canvas);

    this.camera.up.set(0, 0, 1);
    this.scene.add(new HemisphereLight(0xffffff, 0x6b7280, 1.6));
    const sun = new DirectionalLight(0xffffff, 2.2);
    sun.position.set(0.6, -1, 1.4);
    this.scene.add(sun, this.modelGroup, this.overlayGroup);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = false; // damping needs a render loop; we render on demand
    this.controls.enablePan = false;
    this.controls.maxPolarAngle = Math.PI * 0.495; // never under the bed
    // One finger turns the part, two fingers pinch to zoom (and tilt).
    this.controls.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE };
    // Let a vertical swipe scroll the page; only sideways drags and pinches reach the viewer.
    canvas.style.touchAction = 'pan-y';
    this.controls.addEventListener('change', this.requestRender);

    // The mouse wheel scrolls the page; zoom with Ctrl/Cmd + wheel (or a trackpad pinch).
    container.addEventListener('wheel', this.onWheelCapture, { capture: true, passive: true });
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('webglcontextlost', this.onContextLost);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resize();
  }

  // ---- loading ----------------------------------------------------------------------------

  /** Fetches and parses the GLB; resolves with its triangle count. Rejects on any failure. */
  async loadModel(url: string): Promise<{ triangles: number }> {
    const timeout = setTimeout(() => this.abort.abort(), LOAD_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: this.abort.signal });
      if (!response.ok) fetchFailed(response);
      const buffer = await response.arrayBuffer();
      if (this.disposed) throw new Error('closed');
      const gltf = await new GLTFLoader().parseAsync(buffer, '');
      if (this.disposed) throw new Error('closed');
      this.setModel(gltf.scene);
    } finally {
      clearTimeout(timeout);
    }
    return { triangles: this.triangleCount };
  }

  private setModel(root: Object3D) {
    const material = new MeshStandardMaterial({
      color: 0xd9dde4,
      roughness: 0.62,
      metalness: 0.05,
      flatShading: true, // no vertex normals needed, and sharp CAD edges stay sharp
    });
    const meshes: Mesh[] = [];
    root.updateMatrixWorld(true);
    root.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh || !mesh.geometry.getAttribute('position')) return;
      mesh.material = material;
      meshes.push(mesh);
    });
    let triangles = 0;
    for (const mesh of meshes) {
      const index = mesh.geometry.getIndex();
      triangles += (index ? index.count : mesh.geometry.getAttribute('position').count) / 3;
    }
    if (triangles === 0) throw new Error('The model has no triangles.');

    this.meshes = meshes;
    this.triangleCount = triangles;
    this.modelGroup.add(root);

    const box = new Box3().setFromObject(root);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    this.modelRadius = Math.max(size.length() / 2, 1);

    // A simple bed: a square plate under the part with a grid, at z = 0.
    const footprint = Math.max(size.x, size.y, 10);
    const bedSize = MathUtils.clamp(footprint * 1.7, 90, 260);
    const bed = new Mesh(
      new PlaneGeometry(bedSize, bedSize),
      new MeshBasicMaterial({
        color: 0x3b4252,
        transparent: true,
        opacity: 0.35,
        side: DoubleSide,
      }),
    );
    bed.position.set(center.x, center.y, -0.05);
    const step = bedSize > 150 ? 20 : 10;
    const grid = new GridHelper(bedSize, Math.round(bedSize / step), 0x8b93a3, 0x6b7280);
    grid.rotation.x = Math.PI / 2; // GridHelper lies in XZ; the bed lies in XY
    grid.position.set(center.x, center.y, 0);
    (grid.material as LineBasicMaterial).transparent = true;
    (grid.material as LineBasicMaterial).opacity = 0.5;
    this.scene.add(bed, grid);

    // Frame the part and its bed.
    const framing = Math.max(this.modelRadius, bedSize * 0.55);
    const distance = (framing / Math.sin(MathUtils.degToRad(this.camera.fov / 2))) * 1.1;
    const target = new Vector3(center.x, center.y, Math.max(size.z, 1) / 2.5);
    this.home.target.copy(target);
    this.home.position.copy(target).addScaledVector(VIEW_DIRECTION, distance);
    this.camera.position.copy(this.home.position);
    this.camera.near = Math.max(distance / 100, 0.5);
    this.camera.far = distance * 12;
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(target);
    this.controls.minDistance = this.modelRadius * 0.35;
    this.controls.maxDistance = distance * 2.5;
    this.controls.update();
    this.requestRender();
  }

  /** Draws the regions (after the model is in). Resolves with the codes that got a region. */
  setHighlights(highlights: PartHighlight[]): string[] {
    this.clearOverlays();
    const resolved = resolveHighlights(highlights, this.triangleCount);
    let number = 0;
    for (const entry of resolved) {
      number += 1;
      const overlay = entry.triangles.length
        ? this.buildFaceOverlay(entry.highlight, entry.triangles, number)
        : this.buildBoxOverlay(entry.highlight, entry.box!, number);
      if (!overlay) {
        number -= 1;
        continue;
      }
      this.overlays.set(entry.highlight.code, overlay);
      this.overlayGroup.add(overlay.group);
    }
    this.applyEmphasis();
    this.requestRender();
    return [...this.overlays.keys()];
  }

  private makeMarker(highlight: PartHighlight, number: number) {
    const color = SEVERITY_COLOR[highlight.severity];
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.setAttribute('aria-label', `${highlight.label} (show details)`);
    marker.className =
      'pointer-events-auto absolute left-0 top-0 flex size-11 items-center justify-center will-change-transform';
    const dot = document.createElement('span');
    dot.className =
      'flex size-6 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white shadow-md';
    dot.style.background = color;
    dot.textContent = String(number);
    const label = document.createElement('span');
    label.dataset.role = 'label';
    label.className =
      'pointer-events-none absolute top-full hidden w-max max-w-44 -translate-y-1.5 rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md';
    label.textContent = highlight.label;
    marker.append(dot, label);
    marker.addEventListener('click', (event) => {
      event.stopPropagation();
      this.options.onSelect(highlight.code);
    });
    this.options.markerLayer.appendChild(marker);
    return marker;
  }

  private overlayMaterial(color: string, opacity: number) {
    return new MeshBasicMaterial({
      color: new Color(color),
      transparent: true,
      opacity,
      side: DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
  }

  /** Copies the tagged triangles (in world space) into their own mesh, drawn over the part. */
  private buildFaceOverlay(highlight: PartHighlight, triangles: number[], number: number) {
    const wanted = new Set(triangles);
    const positions: number[] = [];
    let offset = 0;
    const a = new Vector3();
    for (const mesh of this.meshes) {
      const geometry = mesh.geometry;
      const position = geometry.getAttribute('position');
      const index = geometry.getIndex();
      const count = (index ? index.count : position.count) / 3;
      for (let t = 0; t < count; t += 1) {
        if (!wanted.has(offset + t)) continue;
        for (let corner = 0; corner < 3; corner += 1) {
          const vertex = index ? index.getX(t * 3 + corner) : t * 3 + corner;
          a.fromBufferAttribute(position, vertex).applyMatrix4(mesh.matrixWorld);
          positions.push(a.x, a.y, a.z);
        }
      }
      offset += count;
    }
    if (positions.length === 0) return null;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    geometry.computeBoundingSphere();
    const color = SEVERITY_COLOR[highlight.severity];
    const material = this.overlayMaterial(color, 0.6);
    const group = new Group();
    group.add(new Mesh(geometry, material));
    const sphere = geometry.boundingSphere!;
    return this.finishOverlay(
      highlight,
      number,
      group,
      [{ material, opacity: 0.6 }],
      sphere.center,
      sphere.radius,
    );
  }

  private buildBoxOverlay(highlight: PartHighlight, box: number[], number: number) {
    const [x0, y0, z0, x1, y1, z1] = box;
    const size = new Vector3(x1 - x0, y1 - y0, z1 - z0).max(new Vector3(0.4, 0.4, 0.4));
    const center = new Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    const geometry = new BoxGeometry(size.x, size.y, size.z);
    const color = SEVERITY_COLOR[highlight.severity];
    const fill = this.overlayMaterial(color, 0.35);
    const edgeMaterial = new LineBasicMaterial({
      color: new Color(color),
      transparent: true,
      opacity: 0.95,
    });
    const group = new Group();
    const fillMesh = new Mesh(geometry, fill);
    const edges = new LineSegments(new EdgesGeometry(geometry), edgeMaterial);
    group.add(fillMesh, edges);
    group.position.copy(center);
    return this.finishOverlay(
      highlight,
      number,
      group,
      [
        { material: fill, opacity: 0.35 },
        { material: edgeMaterial, opacity: 0.95 },
      ],
      center,
      size.length() / 2,
    );
  }

  private finishOverlay(
    highlight: PartHighlight,
    number: number,
    group: Group,
    materials: Overlay['materials'],
    center: Vector3,
    radius: number,
  ): Overlay {
    group.userData.code = highlight.code;
    return {
      code: highlight.code,
      group,
      materials,
      center: center.clone(),
      radius: Math.max(radius, 1),
      marker: this.makeMarker(highlight, number),
    };
  }

  private clearOverlays() {
    for (const overlay of this.overlays.values()) {
      overlay.group.traverse((object) => {
        const item = object as Mesh;
        item.geometry?.dispose();
      });
      overlay.materials.forEach(({ material }) => material.dispose());
      overlay.marker.remove();
      this.overlayGroup.remove(overlay.group);
    }
    this.overlays.clear();
  }

  // ---- focus ------------------------------------------------------------------------------

  /** Brings a region into view and pulses it; `null` clears the focus. */
  focus(code: string | null) {
    const overlay = code ? this.overlays.get(code) : undefined;
    this.activeCode = overlay ? code : null;
    this.pulseStart = performance.now();
    this.applyEmphasis();
    if (overlay) this.flyTo(overlay);
    this.requestRender();
  }

  private flyTo(overlay: Overlay) {
    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    const distance = MathUtils.clamp(
      (overlay.radius * 3.2) / Math.sin(MathUtils.degToRad(this.camera.fov / 2)) / 2,
      this.controls.minDistance,
      this.controls.maxDistance,
    );
    const toTarget = overlay.center.clone();
    const toPosition = toTarget.clone().addScaledVector(direction, distance);
    if (this.options.reducedMotion) {
      this.camera.position.copy(toPosition);
      this.controls.target.copy(toTarget);
      this.controls.update();
      return;
    }
    this.tween = {
      start: performance.now(),
      fromPosition: this.camera.position.clone(),
      toPosition,
      fromTarget: this.controls.target.clone(),
      toTarget,
    };
  }

  resetView() {
    this.activeCode = null;
    this.applyEmphasis();
    const toPosition = this.home.position.clone();
    const toTarget = this.home.target.clone();
    if (this.options.reducedMotion) {
      this.camera.position.copy(toPosition);
      this.controls.target.copy(toTarget);
      this.controls.update();
    } else {
      this.tween = {
        start: performance.now(),
        fromPosition: this.camera.position.clone(),
        toPosition,
        fromTarget: this.controls.target.clone(),
        toTarget,
      };
    }
    this.requestRender();
  }

  /** Resting emphasis: the focused region strong, the others quiet. */
  private applyEmphasis(pulse = 1) {
    for (const overlay of this.overlays.values()) {
      const active = overlay.code === this.activeCode;
      const scale = this.activeCode === null ? 1 : active ? Math.min(1.35, pulse * 1.35) : 0.4;
      for (const { material, opacity } of overlay.materials) {
        material.opacity = MathUtils.clamp(opacity * scale, 0, 1);
      }
      overlay.marker.style.zIndex = active ? '2' : '1';
      overlay.marker
        .querySelector<HTMLElement>('[data-role="label"]')!
        .classList.toggle('hidden', !active);
    }
  }

  // ---- rendering --------------------------------------------------------------------------

  /** Called with the viewer's visibility; nothing is drawn or scheduled while it is false. */
  setOnScreen(visible: boolean) {
    this.onScreen = visible;
    if (visible) this.requestRender();
  }

  private get active() {
    return this.onScreen && this.pageVisible && !this.disposed;
  }

  private readonly requestRender = () => {
    if (this.raf || !this.active) return;
    this.raf = requestAnimationFrame(this.frame);
  };

  private readonly frame = (now: number) => {
    this.raf = 0;
    if (!this.active) return;
    let animating = false;

    if (this.tween) {
      const t = Math.min(1, (now - this.tween.start) / TWEEN_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      this.camera.position.lerpVectors(this.tween.fromPosition, this.tween.toPosition, eased);
      this.controls.target.lerpVectors(this.tween.fromTarget, this.tween.toTarget, eased);
      this.controls.update();
      if (t >= 1) this.tween = null;
      else animating = true;
    }

    if (this.activeCode && !this.options.reducedMotion) {
      const elapsed = now - this.pulseStart;
      if (elapsed < PULSE_MS) {
        const wave = 0.5 + 0.5 * Math.sin((elapsed / PULSE_PERIOD_MS) * Math.PI * 2);
        this.applyEmphasis(0.55 + 0.45 * wave);
        animating = true;
      } else if (elapsed < PULSE_MS + 100) {
        this.applyEmphasis(1);
      }
    }

    this.renderer.render(this.scene, this.camera);
    this.updateMarkers();
    if (animating) this.requestRender();
  };

  private readonly projected = new Vector3();

  private updateMarkers() {
    const { clientWidth: width, clientHeight: height } = this.options.container;
    for (const overlay of this.overlays.values()) {
      const p = this.projected.copy(overlay.center).project(this.camera);
      const visible = p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05;
      const marker = overlay.marker;
      marker.style.visibility = visible ? 'visible' : 'hidden';
      if (!visible) continue;
      const x = (p.x * 0.5 + 0.5) * width - 22;
      const y = (-p.y * 0.5 + 0.5) * height - 22;
      marker.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      const label = marker.querySelector<HTMLElement>('[data-role="label"]');
      if (label && !label.classList.contains('hidden')) {
        // Keep the label inside the viewer: centred under the dot, nudged in from the edges.
        const labelWidth = label.offsetWidth;
        const left = MathUtils.clamp(
          x + 22 - labelWidth / 2,
          4,
          Math.max(4, width - 4 - labelWidth),
        );
        label.style.left = `${(left - x).toFixed(1)}px`;
      }
    }
  }

  private resize() {
    const { clientWidth: width, clientHeight: height } = this.options.container;
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  // ---- events -----------------------------------------------------------------------------

  private readonly onVisibility = () => {
    this.pageVisible = document.visibilityState !== 'hidden';
    if (this.pageVisible) this.requestRender();
  };

  /** Plain wheel scrolls the page: stop it before the controls can zoom (they would also block the scroll). */
  private readonly onWheelCapture = (event: WheelEvent) => {
    if (!event.ctrlKey && !event.metaKey) event.stopPropagation();
  };

  private readonly onContextLost = (event: Event) => {
    event.preventDefault();
    this.options.onContextLost();
  };

  private readonly onPointerDown = (event: PointerEvent) => {
    this.pointerDown = { x: event.clientX, y: event.clientY, time: performance.now() };
  };

  /** A tap (not a drag) on a highlighted surface selects it, unless the part is in front of it. */
  private readonly onPointerUp = (event: PointerEvent) => {
    const down = this.pointerDown;
    this.pointerDown = null;
    if (!down || this.overlays.size === 0) return;
    const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
    if (moved > 6 || performance.now() - down.time > 600) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const pointer = new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(pointer, this.camera);
    const partHit = this.raycaster.intersectObjects(this.meshes, false)[0];
    const overlayHit = this.raycaster.intersectObjects(this.overlayGroup.children, true)[0];
    if (!overlayHit) return;
    if (partHit && overlayHit.distance > partHit.distance + 0.75) return;
    let owner: Object3D | null = overlayHit.object;
    while (owner && owner.userData.code === undefined) owner = owner.parent;
    if (owner) this.options.onSelect(owner.userData.code as string);
  };

  // ---- teardown ---------------------------------------------------------------------------

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.abort.abort();
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    const canvas = this.renderer.domElement;
    this.options.container.removeEventListener('wheel', this.onWheelCapture, { capture: true });
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.controls.dispose();
    this.clearOverlays();
    this.scene.traverse((object) => {
      const item = object as Mesh;
      item.geometry?.dispose();
      const material = item.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose();
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    canvas.remove();
  }
}
