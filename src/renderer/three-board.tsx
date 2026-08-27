import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { AccessFeature, BoardDocument, Piece } from '../document/schema';
import { terrainGeometry } from '../model/geometry';

export type ThreePreset = 'top' | 'isometric' | 'perspective' | 'front';
const materialPalette: Record<string, { color: number; roughness?: number; metalness?: number; transparent?: boolean; opacity?: number }> = {
  'building-wall': { color: 0x355661, roughness: .7, metalness: .08 }, roof: { color: 0x2a4853, roughness: .8 }, interior: { color: 0x37484c, roughness: .95 },
  'ruin-wall': { color: 0x806752, roughness: .95 }, platform: { color: 0x547278, roughness: .78 }, road: { color: 0x3c4b52, roughness: 1 },
  water: { color: 0x297990, roughness: .32, metalness: .15, transparent: true, opacity: .84 }, wall: { color: 0x667074, roughness: .9 }, woods: { color: 0x3f6e54, roughness: .95 },
  rocks: { color: 0x72797b, roughness: 1 }, scatter: { color: 0x977450, roughness: .9 }, objective: { color: 0xd8a54c, roughness: .48, metalness: .2 },
  token: { color: 0xa677d0, roughness: .48, metalness: .2 }, marker: { color: 0xd47986, roughness: .48, metalness: .14 },
};

const createMaterial = (name: string) => new THREE.MeshStandardMaterial(materialPalette[name] ?? { color: 0x70939a, roughness: .8 });
const box = (part: { width: number; height: number; depth: number }) => new THREE.BoxGeometry(part.width, part.height, part.depth);
const primitive = (part: ReturnType<typeof terrainGeometry>['mesh'][number]) => {
  if (part.primitive === 'box') return box(part);
  if (part.primitive === 'cylinder') return new THREE.CylinderGeometry(part.width / 2, part.width / 2, part.height, 18);
  if (part.primitive === 'cone') return new THREE.ConeGeometry(part.width / 2, part.height, 10);
  if (part.primitive === 'dodecahedron') return new THREE.DodecahedronGeometry(part.width / 2, 0);
  return new THREE.PlaneGeometry(part.width, part.depth);
};
function addAccess(group: THREE.Group, feature: AccessFeature, piece: Piece, colour: number) {
  const details = piece.structureDetails; if (!details) return;
  const horizontal = feature.wall === 'north' || feature.wall === 'south';
  const thickness = .08; const depth = horizontal ? thickness : feature.span; const width = horizontal ? feature.span : thickness;
  const y = details.elevationInches + Math.min(details.heightInches * .52, feature.wall === 'north' || feature.wall === 'south' ? 2.2 : 3.4);
  const x = horizontal ? feature.offset + feature.span / 2 : feature.wall === 'west' ? .03 : piece.width - .03;
  const z = horizontal ? feature.wall === 'north' ? .03 : piece.height - .03 : feature.offset + feature.span / 2;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, feature.wall === 'north' || feature.wall === 'south' ? 2.35 : 1.15, depth), new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: .16, roughness: .5 }));
  mesh.position.set(x, y, z); group.add(mesh);
}
function addPiece(scene: THREE.Scene, piece: Piece, selected: boolean) {
  const group = new THREE.Group(); group.userData.id = piece.id; group.position.set(piece.x, piece.structureDetails?.elevationInches ?? 0, piece.y); group.rotation.y = -THREE.MathUtils.degToRad(piece.rotation);
  for (const part of terrainGeometry(piece).mesh) {
    const material = createMaterial(part.material); if (selected) { material.emissive.setHex(0x4ebac5); material.emissiveIntensity = .26; } if (piece.locked) { material.transparent = true; material.opacity = .72; }
    const mesh = new THREE.Mesh(primitive(part), material);
    mesh.position.set(part.x, part.y, part.z); if (part.primitive === 'plane') mesh.rotation.x = -Math.PI / 2;
    mesh.userData.id = piece.id; group.add(mesh);
  }
  for (const door of piece.structureDetails?.doors ?? []) addAccess(group, door, piece, 0xf3bc67);
  for (const window of piece.structureDetails?.windows ?? []) addAccess(group, window, piece, 0x85e6f2);
  scene.add(group);
}

export function ThreeBoard({ board, preset, selectedIds = [], onSelect }: { board: BoardDocument; preset: ThreePreset; selectedIds?: readonly string[]; onSelect?: (id: string | null) => void }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current; if (!element) return undefined;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); element.append(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(board.settings.surface === 'sand' ? '#292319' : board.settings.surface === 'concrete' ? '#202326' : '#08131e');
    const camera = new THREE.PerspectiveCamera(45, 1, .1, 300); const size = Math.max(board.settings.widthInches, board.settings.heightInches); const target = new THREE.Vector3(board.settings.widthInches / 2, 0, board.settings.heightInches / 2);
    const setPreset = () => { const poses: Record<ThreePreset, [number, number, number]> = { top: [size / 2, size * 1.6, size / 2.01], isometric: [size * 1.15, size, size * 1.15], perspective: [size * 1.25, size * .55, size * 1.35], front: [size / 2, size * .38, size * 1.5] }; camera.position.set(...poses[preset]); camera.lookAt(target); }; setPreset();
    const grid = new THREE.GridHelper(size, size, 0x59cbd6, 0x294b57); grid.position.set(size / 2, 0, size / 2); scene.add(grid);
    const major = new THREE.LineBasicMaterial({ color: 0x78edf5 }); for (let i = 0; i <= size; i += 12) { const a = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(i, .01, 0), new THREE.Vector3(i, .01, size)]); const b = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, .01, i), new THREE.Vector3(size, .01, i)]); scene.add(new THREE.Line(a, major), new THREE.Line(b, major)); }
    board.pieces.filter((piece) => !piece.hidden).forEach((piece) => addPiece(scene, piece, selectedIds.includes(piece.id)));
    scene.add(new THREE.HemisphereLight(0xaeeeff, 0x101820, 2)); const key = new THREE.DirectionalLight(0x77dce8, 1.5); key.position.set(size, size * 1.2, size * .2); scene.add(key);
    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2(); let orbit = false; let pan = false; let last = { x: 0, y: 0 };
    const onPointerDown = (event: PointerEvent) => { orbit = event.button === 2 || event.altKey; pan = event.button === 1 || event.shiftKey; last = { x: event.clientX, y: event.clientY }; renderer.domElement.setPointerCapture(event.pointerId); };
    const onPointerMove = (event: PointerEvent) => { if (!orbit && !pan) return; const dx = event.clientX - last.x; const dy = event.clientY - last.y; last = { x: event.clientX, y: event.clientY }; if (orbit) { const offset = camera.position.clone().sub(target); const spherical = new THREE.Spherical().setFromVector3(offset); spherical.theta -= dx * .008; spherical.phi = THREE.MathUtils.clamp(spherical.phi + dy * .008, .18, Math.PI / 2.04); camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(spherical)); } else { const scale = Math.max(.015, camera.position.distanceTo(target) / 650); camera.position.x -= dx * scale; camera.position.z -= dy * scale; target.x -= dx * scale; target.z -= dy * scale; } camera.lookAt(target); };
    const onPointerUp = (event: PointerEvent) => { if (!orbit && !pan) { const rect = renderer.domElement.getBoundingClientRect(); pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1); raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObjects(scene.children, true).find((entry) => entry.object.userData.id); onSelect?.(hit?.object.userData.id ?? null); } orbit = false; pan = false; };
    const onWheel = (event: WheelEvent) => { event.preventDefault(); const offset = camera.position.clone().sub(target); offset.multiplyScalar(event.deltaY < 0 ? .9 : 1.1).clampLength(8, size * 4); camera.position.copy(target).add(offset); camera.lookAt(target); };
    renderer.domElement.addEventListener('pointerdown', onPointerDown); renderer.domElement.addEventListener('pointermove', onPointerMove); renderer.domElement.addEventListener('pointerup', onPointerUp); renderer.domElement.addEventListener('wheel', onWheel, { passive: false }); renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
    let frame = 0; const onContextLost = (event: Event) => { event.preventDefault(); element.dataset.contextLost = 'true'; }; const resize = () => { const { width, height } = element.getBoundingClientRect(); renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); }; const render = () => { frame = requestAnimationFrame(render); renderer.render(scene, camera); }; renderer.domElement.addEventListener('webglcontextlost', onContextLost); resize(); const observer = new ResizeObserver(resize); observer.observe(element); render();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); renderer.domElement.removeEventListener('webglcontextlost', onContextLost); renderer.dispose(); scene.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((material) => material.dispose()); } }); element.replaceChildren(); };
  }, [board, onSelect, preset, selectedIds]);
  return <div ref={host} className="three-board" role="application" aria-label="Interactive 3D planning board" tabIndex={0} />;
}
