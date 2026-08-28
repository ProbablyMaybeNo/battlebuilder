import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { AccessFeature, BoardDocument, Piece } from '../document/schema';
import { accessiblePieceName } from '../model/catalog';
import { terrainGeometry } from '../model/geometry';

export type ThreePreset = 'top' | 'isometric' | 'perspective' | 'front';

type Runtime = { applyPreset: (preset: ThreePreset) => void; applySelection: (ids: readonly string[]) => void };
type MeshPart = ReturnType<typeof terrainGeometry>['mesh'][number];

const materialPalette: Record<string, { color: number; roughness?: number; metalness?: number; transparent?: boolean; opacity?: number }> = {
  'building-wall': { color: 0x355661, roughness: .7, metalness: .08 }, roof: { color: 0x2a4853, roughness: .8 }, interior: { color: 0x37484c, roughness: .95 },
  'ruin-wall': { color: 0x806752, roughness: .95 }, platform: { color: 0x547278, roughness: .78 }, road: { color: 0x3c4b52, roughness: 1 },
  water: { color: 0x297990, roughness: .32, metalness: .15, transparent: true, opacity: .84 }, wall: { color: 0x667074, roughness: .9 }, woods: { color: 0x3f6e54, roughness: .95 },
  rocks: { color: 0x72797b, roughness: 1 }, scatter: { color: 0x977450, roughness: .9 }, objective: { color: 0xd8a54c, roughness: .48, metalness: .2 },
  token: { color: 0xa677d0, roughness: .48, metalness: .2 }, marker: { color: 0xd47986, roughness: .48, metalness: .14 },
};

const geometryKey = (part: MeshPart) => `${part.primitive}:${part.width}:${part.height}:${part.depth}`;
const makeGeometry = (part: MeshPart) => {
  if (part.primitive === 'box') return new THREE.BoxGeometry(part.width, part.height, part.depth);
  if (part.primitive === 'cylinder') return new THREE.CylinderGeometry(part.width / 2, part.width / 2, part.height, 18);
  if (part.primitive === 'cone') return new THREE.ConeGeometry(part.width / 2, part.height, 10);
  if (part.primitive === 'dodecahedron') return new THREE.DodecahedronGeometry(part.width / 2, 0);
  return new THREE.PlaneGeometry(part.width, part.depth);
};

function addAccess(group: THREE.Group, feature: AccessFeature, piece: Piece, material: THREE.Material, geometryFor: (part: MeshPart) => THREE.BufferGeometry) {
  const details = piece.structureDetails;
  if (!details) return;
  const horizontal = feature.wall === 'north' || feature.wall === 'south';
  const width = horizontal ? feature.span : .08;
  const depth = horizontal ? .08 : feature.span;
  const height = horizontal ? 2.35 : 1.15;
  const y = details.elevationInches + Math.min(details.heightInches * .52, horizontal ? 2.2 : 3.4);
  const x = horizontal ? feature.offset + feature.span / 2 : feature.wall === 'west' ? .03 : piece.width - .03;
  const z = horizontal ? feature.wall === 'north' ? .03 : piece.height - .03 : feature.offset + feature.span / 2;
  const mesh = new THREE.Mesh(geometryFor({ primitive: 'box', width, height, depth, x: 0, y: 0, z: 0, material: 'access' }), material);
  mesh.position.set(x, y, z);
  group.add(mesh);
}

export function ThreeBoard({ board, preset, selectedIds = [], onSelect, onContextLost }: { board: BoardDocument; preset: ThreePreset; selectedIds?: readonly string[]; onSelect?: (id: string | null) => void; onContextLost?: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const canvasHost = useRef<HTMLDivElement>(null);
  const runtime = useRef<Runtime | null>(null);
  const selectHandler = useRef(onSelect);
  const presetRef = useRef(preset);
  const selectionRef = useRef<readonly string[]>(selectedIds);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => { selectHandler.current = onSelect; }, [onSelect]);
  useEffect(() => { presetRef.current = preset; runtime.current?.applyPreset(preset); }, [preset]);
  useEffect(() => { selectionRef.current = selectedIds; runtime.current?.applySelection(selectedIds); }, [selectedIds]);

  useEffect(() => {
    const element = canvasHost.current;
    if (!element) return undefined;
    setContextLost(false);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    element.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(board.settings.surface === 'sand' ? '#292319' : board.settings.surface === 'concrete' ? '#202326' : '#08131e');
    const width = board.settings.widthInches;
    const height = board.settings.heightInches;
    const size = Math.max(width, height);
    const camera = new THREE.PerspectiveCamera(45, 1, .1, 300);
    const target = new THREE.Vector3(width / 2, 0, height / 2);
    const materials = new Map<string, THREE.MeshStandardMaterial>();
    const geometries = new Map<string, THREE.BufferGeometry>();
    const pieceMeshes = new Map<string, THREE.Mesh[]>();
    let frame = 0;
    let renderPending = false;
    let disposed = false;
    const requestRender = () => {
      if (renderPending || disposed) return;
      renderPending = true;
      frame = requestAnimationFrame(() => { renderPending = false; renderer.render(scene, camera); });
    };
    const materialFor = (name: string, selected = false, locked = false) => {
      const materialKey = `${name}:${selected ? 'selected' : 'normal'}:${locked ? 'locked' : 'unlocked'}`;
      const existing = materials.get(materialKey);
      if (existing) return existing;
      const material = new THREE.MeshStandardMaterial(materialPalette[name] ?? { color: 0x70939a, roughness: .8 });
      if (selected) { material.emissive.setHex(0x4ebac5); material.emissiveIntensity = .26; }
      if (locked) { material.transparent = true; material.opacity = .72; }
      materials.set(materialKey, material);
      return material;
    };
    const geometryFor = (part: MeshPart) => {
      const key = geometryKey(part);
      const existing = geometries.get(key);
      if (existing) return existing;
      const geometry = makeGeometry(part);
      geometries.set(key, geometry);
      return geometry;
    };
    const applySelection = (ids: readonly string[]) => {
      const selected = new Set(ids);
      pieceMeshes.forEach((meshes, id) => meshes.forEach((mesh) => { mesh.material = materialFor(String(mesh.userData.materialName), selected.has(id), Boolean(mesh.userData.locked)); }));
      requestRender();
    };
    const applyPreset = (nextPreset: ThreePreset) => {
      const poses: Record<ThreePreset, [number, number, number]> = {
        top: [width / 2, size * 1.6, height / 2.01], isometric: [width * 1.15, size, height * 1.15],
        perspective: [width * 1.25, size * .55, height * 1.35], front: [width / 2, size * .38, height * 1.5],
      };
      camera.position.set(...poses[nextPreset]);
      camera.lookAt(target);
      requestRender();
    };
    const grid = new THREE.GridHelper(size, size, 0x59cbd6, 0x294b57);
    grid.position.set(width / 2, 0, height / 2);
    scene.add(grid);
    const major = new THREE.LineBasicMaterial({ color: 0x78edf5 });
    for (let i = 0; i <= width; i += 12) scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(i, .01, 0), new THREE.Vector3(i, .01, height)]), major));
    for (let i = 0; i <= height; i += 12) scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, .01, i), new THREE.Vector3(width, .01, i)]), major));
    for (const piece of board.pieces) {
      if (piece.hidden) continue;
      const group = new THREE.Group();
      group.userData.id = piece.id;
      group.position.set(piece.x, piece.structureDetails?.elevationInches ?? 0, piece.y);
      group.rotation.y = -THREE.MathUtils.degToRad(piece.rotation);
      const meshes: THREE.Mesh[] = [];
      for (const part of terrainGeometry(piece).mesh) {
        const mesh = new THREE.Mesh(geometryFor(part), materialFor(part.material, selectionRef.current.includes(piece.id), piece.locked));
        mesh.position.set(part.x, part.y, part.z);
        if (part.primitive === 'plane') mesh.rotation.x = -Math.PI / 2;
        mesh.userData.id = piece.id;
        mesh.userData.materialName = part.material;
        mesh.userData.locked = piece.locked;
        group.add(mesh);
        meshes.push(mesh);
      }
      const doorMaterial = materialFor('access-door');
      const windowMaterial = materialFor('access-window');
      for (const door of piece.structureDetails?.doors ?? []) addAccess(group, door, piece, doorMaterial, geometryFor);
      for (const window of piece.structureDetails?.windows ?? []) addAccess(group, window, piece, windowMaterial, geometryFor);
      group.traverse((object) => {
        if (object instanceof THREE.Mesh && !meshes.includes(object)) {
          object.userData.id = piece.id;
          object.userData.materialName = object.material === doorMaterial ? 'access-door' : 'access-window';
          object.userData.locked = piece.locked;
          meshes.push(object);
        }
      });
      pieceMeshes.set(piece.id, meshes);
      scene.add(group);
    }
    scene.add(new THREE.HemisphereLight(0xaeeeff, 0x101820, 2));
    const key = new THREE.DirectionalLight(0x77dce8, 1.5);
    key.position.set(size, size * 1.2, size * .2);
    scene.add(key);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let orbit = false;
    let pan = false;
    let last = { x: 0, y: 0 };
    const onPointerDown = (event: PointerEvent) => { orbit = event.button === 2 || event.altKey; pan = event.button === 1 || event.shiftKey; last = { x: event.clientX, y: event.clientY }; renderer.domElement.setPointerCapture(event.pointerId); };
    const onPointerMove = (event: PointerEvent) => {
      if (!orbit && !pan) return;
      const dx = event.clientX - last.x;
      const dy = event.clientY - last.y;
      last = { x: event.clientX, y: event.clientY };
      if (orbit) {
        const offset = camera.position.clone().sub(target);
        const spherical = new THREE.Spherical().setFromVector3(offset);
        spherical.theta -= dx * .008;
        spherical.phi = THREE.MathUtils.clamp(spherical.phi + dy * .008, .18, Math.PI / 2.04);
        camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(spherical));
      } else {
        const scale = Math.max(.015, camera.position.distanceTo(target) / 650);
        camera.position.x -= dx * scale;
        camera.position.z -= dy * scale;
        target.x -= dx * scale;
        target.z -= dy * scale;
      }
      camera.lookAt(target);
      requestRender();
    };
    const finishPointer = () => { orbit = false; pan = false; };
    const onPointerUp = (event: PointerEvent) => {
      if (!orbit && !pan) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(scene.children, true).find((entry) => entry.object.userData.id);
        selectHandler.current?.(hit?.object.userData.id ?? null);
      }
      finishPointer();
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const offset = camera.position.clone().sub(target);
      offset.multiplyScalar(event.deltaY < 0 ? .9 : 1.1).clampLength(8, size * 4);
      camera.position.copy(target).add(offset);
      camera.lookAt(target);
      requestRender();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const offset = camera.position.clone().sub(target);
      if (event.key.toLowerCase() === 'f') { applyPreset(presetRef.current); event.preventDefault(); return; }
      if (event.key === '+' || event.key === '=') { offset.multiplyScalar(.9); camera.position.copy(target).add(offset); event.preventDefault(); }
      else if (event.key === '-') { offset.multiplyScalar(1.1); camera.position.copy(target).add(offset); event.preventDefault(); }
      else {
        const move = event.key === 'ArrowLeft' ? [-1, 0] : event.key === 'ArrowRight' ? [1, 0] : event.key === 'ArrowUp' ? [0, -1] : event.key === 'ArrowDown' ? [0, 1] : null;
        if (!move) return;
        const amount = Math.max(.5, size / 40);
        camera.position.x += move[0] * amount;
        camera.position.z += move[1] * amount;
        target.x += move[0] * amount;
        target.z += move[1] * amount;
        event.preventDefault();
      }
      camera.lookAt(target);
      requestRender();
    };
    const onContextLost = (event: Event) => { event.preventDefault(); setContextLost(true); };
    const resize = () => {
      const { width: hostWidth, height: hostHeight } = element.getBoundingClientRect();
      renderer.setSize(hostWidth, hostHeight);
      camera.aspect = hostWidth / hostHeight;
      camera.updateProjectionMatrix();
      requestRender();
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', finishPointer);
    renderer.domElement.addEventListener('lostpointercapture', finishPointer);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    element.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', finishPointer);
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    runtime.current = { applyPreset, applySelection };
    applyPreset(presetRef.current);
    applySelection(selectionRef.current);
    resize();
    return () => {
      disposed = true;
      if (runtime.current?.applyPreset === applyPreset) runtime.current = null;
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', finishPointer);
      renderer.domElement.removeEventListener('lostpointercapture', finishPointer);
      renderer.domElement.removeEventListener('wheel', onWheel);
      element.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', finishPointer);
      scene.traverse((object) => { if (object instanceof THREE.Line) object.geometry.dispose(); });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose();
      element.replaceChildren();
    };
  }, [board]);

  return <div ref={host} className="three-board" role="application" aria-label="Interactive 3D planning board" data-context-lost={contextLost ? 'true' : undefined}>
    <div ref={canvasHost} className="three-board__canvas" role="region" tabIndex={0} aria-label="3D camera: arrow keys pan, plus and minus zoom, F resets" />
    {contextLost && <div className="three-board__fallback" role="alert"><strong>3D graphics paused.</strong><span>Your board data is safe. Return to the overhead editor and try 3D again after graphics recovery.</span>{onContextLost && <button type="button" onClick={onContextLost}>Return to overhead</button>}</div>}
    <ul className="sr-only" aria-label="3D terrain pieces">{board.pieces.filter((piece) => !piece.hidden).map((piece) => <li key={piece.id}><button type="button" aria-pressed={selectedIds.includes(piece.id)} onFocus={() => selectHandler.current?.(piece.id)} onClick={() => selectHandler.current?.(piece.id)}>{accessiblePieceName(piece)}</button></li>)}</ul>
  </div>;
}
