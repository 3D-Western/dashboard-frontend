'use client';

// The lazy half of "Preparing your print": the student's part, greyed out and slowly turning.
// Loaded only when WebGL exists, so three.js stays out of every page that never prepares a part.
// The part comes from the File still in memory (STL / 3MF), from the snapshot's model_glb, or is a
// neutral placeholder shape. A file that cannot be read quietly becomes the placeholder.

import { useEffect, useRef } from 'react';
import {
  AmbientLight,
  Box3,
  BufferGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Plane,
  Scene,
  TorusKnotGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js';
import { extensionOf } from '@/lib/model-files';
import type { Dims } from '@/lib/preparing-steps';

export interface PreparingPartCanvasProps {
  file?: File | null;
  modelUrl?: string;
  reducedMotion: boolean;
  onDims: (dims: Dims | null) => void;
  /** WebGL failed outright: the parent shows the plain animation instead. */
  onUnavailable: () => void;
  /**
   * The X-ray scan of the loading view (P-200): the part stays a ghost, and a solid copy fills in
   * from the plate up to `progress` (0 to 1 of its height). `onSpan` is told where the part's
   * bottom and top sit on the view (0 = top edge, 1 = bottom edge) so a scan line can follow.
   */
  scan?: { progress: { current: number }; onSpan?: (bottom: number, top: number) => void };
}

async function loadFromFile(file: File): Promise<Object3D | null> {
  const ext = extensionOf(file.name);
  const buffer = await file.arrayBuffer();
  if (ext === '.stl') {
    const geometry: BufferGeometry = new STLLoader().parse(buffer);
    return new Mesh(geometry);
  }
  if (ext === '.3mf') return new ThreeMFLoader().parse(buffer);
  return null; // STEP and anything else: the browser cannot read it
}

async function loadFromUrl(url: string): Promise<Object3D> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), '');
  return gltf.scene;
}

export default function PreparingPartCanvas({
  file,
  modelUrl,
  reducedMotion,
  onDims,
  onUnavailable,
  scan,
}: PreparingPartCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ onDims, onUnavailable });
  useEffect(() => {
    latest.current = { onDims, onUnavailable };
  });
  const scanning = Boolean(scan);
  const scanRef = useRef(scan);
  useEffect(() => {
    scanRef.current = scan;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      latest.current.onUnavailable();
      return;
    }
    let disposed = false;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.className = 'block size-full';
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    const scene = new Scene();
    scene.add(new AmbientLight(0xffffff, 1.4));
    const sun = new DirectionalLight(0xffffff, 2);
    sun.position.set(0.6, -1, 1.4);
    scene.add(sun);
    const camera = new PerspectiveCamera(35, 1, 0.1, 5000);
    camera.up.set(0, 0, 1);
    const spin = new Group();
    scene.add(spin);

    // Greyed out: soft grey and see-through, the loading animation sits over it.
    const material = new MeshStandardMaterial({
      color: 0x9aa1ad,
      roughness: 0.8,
      metalness: 0,
      flatShading: true,
      transparent: true,
      opacity: 0.5,
      side: DoubleSide,
    });
    const owned: { dispose: () => void }[] = [material];
    // The scan: a solid copy of the part, cut off at the scan height by a clipping plane.
    const plane = new Plane(new Vector3(0, 0, -1), 0);
    let partHeight = 1;
    let partBottom = new Vector3();
    let partTop = new Vector3();
    let lastScan = -1;
    let builtMaterial: MeshStandardMaterial | null = null;
    if (scanning) {
      renderer.localClippingEnabled = true;
      material.polygonOffset = true;
      material.polygonOffsetFactor = 1;
      material.depthWrite = false;
      builtMaterial = new MeshStandardMaterial({
        color: 0xe8833a,
        roughness: 0.65,
        metalness: 0,
        flatShading: true,
        side: DoubleSide,
        clippingPlanes: [plane],
      });
      owned.push(builtMaterial);
    }

    const render = () => renderer.render(scene, camera);
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    const show = (root: Object3D, measure: boolean) => {
      const meshes: Mesh[] = [];
      root.traverse((o) => {
        const m = o as Mesh;
        if (m.isMesh && m.geometry?.getAttribute('position')) {
          m.material = material;
          meshes.push(m);
          owned.push(m.geometry);
        }
      });
      if (meshes.length === 0) throw new Error('empty');
      if (builtMaterial) {
        for (const m of meshes) m.add(new Mesh(m.geometry, builtMaterial));
      }
      root.updateMatrixWorld(true);
      const box = new Box3().setFromObject(root);
      const size = box.getSize(new Vector3());
      const center = box.getCenter(new Vector3());
      if (!Number.isFinite(size.x + size.y + size.z) || size.length() === 0)
        throw new Error('empty');
      // Centre it on the turntable axis and sit it on the floor.
      const holder = new Group();
      holder.add(root);
      root.position.sub(new Vector3(center.x, center.y, box.min.z));
      spin.add(holder);
      const radius = size.length() / 2;
      const dist = (radius / Math.tan((camera.fov * Math.PI) / 360)) * 1.15;
      camera.position.set(0.8, -1.1, 0.7).normalize().multiplyScalar(dist);
      camera.lookAt(0, 0, size.z / 2);
      partHeight = size.z;
      partBottom = new Vector3(0, 0, 0);
      partTop = new Vector3(0, 0, size.z);
      camera.far = dist * 20;
      camera.updateProjectionMatrix();
      if (measure) latest.current.onDims([size.x, size.y, size.z]);
    };

    const placeholder = () => {
      const geometry = new TorusKnotGeometry(20, 6, 120, 16);
      const mesh = new Mesh(geometry);
      mesh.rotation.x = Math.PI / 2;
      const holder = new Group();
      holder.add(mesh);
      show(holder, false);
    };

    (async () => {
      try {
        let root: Object3D | null = null;
        if (file) root = await loadFromFile(file);
        else if (modelUrl) root = await loadFromUrl(modelUrl);
        if (disposed) return;
        if (root) show(root, true);
        else placeholder();
      } catch {
        if (disposed) return;
        // Remove anything half-built, then fall back to the neutral shape.
        spin.clear();
        try {
          placeholder();
        } catch {
          latest.current.onUnavailable();
        }
      }
      render();
    })();

    let raf = 0;
    let last = performance.now();
    const syncScan = () => {
      const current = scanRef.current;
      if (!current || !builtMaterial) return false;
      const progress = Math.min(1, Math.max(0, current.progress.current));
      plane.constant = progress * partHeight + (progress >= 1 ? 1 : 0);
      if (current.onSpan && camera.projectionMatrix) {
        camera.updateMatrixWorld();
        const y = (v: Vector3) => 0.5 - v.clone().project(camera).y / 2;
        current.onSpan(y(partBottom), y(partTop));
      }
      const changed = progress !== lastScan;
      lastScan = progress;
      return changed;
    };
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) {
        last = now;
        return;
      }
      if (!reducedMotion) spin.rotation.z += ((now - last) / 1000) * 0.45;
      last = now;
      const moved = syncScan();
      if (!reducedMotion || moved) render();
    };
    if (!reducedMotion || scanning) raf = requestAnimationFrame(tick);

    const onLost = (e: Event) => {
      e.preventDefault();
      latest.current.onUnavailable();
    };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      owned.forEach((o) => o.dispose());
      renderer.dispose();
      canvas.remove();
    };
    // `scanning` is fixed for the life of the part
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, modelUrl, reducedMotion]);

  return <div ref={containerRef} className="size-full" />;
}
