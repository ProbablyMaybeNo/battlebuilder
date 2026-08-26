/* eslint-disable react-refresh/only-export-components, react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from 'react';
import type { BoardDocument } from '../document/schema';

export interface Camera { x: number; y: number; zoom: number; }
export const defaultCamera = (): Camera => ({ x: 0, y: 0, zoom: 1 });
export const clampCamera = (camera: Camera): Camera => ({ x: Math.max(-36, Math.min(36, camera.x)), y: Math.max(-36, Math.min(36, camera.y)), zoom: Math.max(.5, Math.min(4, camera.zoom)) });
export const panCamera = (camera: Camera, dx: number, dy: number) => clampCamera({ ...camera, x: camera.x - dx / camera.zoom, y: camera.y - dy / camera.zoom });
export const zoomCamera = (camera: Camera, factor: number) => clampCamera({ ...camera, zoom: camera.zoom * factor });
export const gridLines = (size: number) => Array.from({ length: size + 1 }, (_, value) => ({ value, major: value > 0 && value % 12 === 0 }));
export const screenToBoard = (clientX: number, clientY: number, rect: DOMRect, camera: Camera, board: BoardDocument) => ({ x: Math.max(0, Math.min(board.settings.widthInches, ((clientX - rect.left) / rect.width - .5) * board.settings.widthInches / camera.zoom + board.settings.widthInches / 2 + camera.x)), y: Math.max(0, Math.min(board.settings.heightInches, ((clientY - rect.top) / rect.height - .5) * board.settings.heightInches / camera.zoom + board.settings.heightInches / 2 + camera.y)) });

export function OverheadBoard({ board, onCameraChange }: { board: BoardDocument; onCameraChange?: (camera: Camera) => void }) {
  const [camera, setCamera] = useState(defaultCamera); const [cursor, setCursor] = useState({ x: 0, y: 0 }); const drag = useRef<{ x: number; y: number } | null>(null); const svgRef = useRef<SVGSVGElement>(null);
  const update = (next: Camera) => { const safe = clampCamera(next); setCamera(safe); onCameraChange?.(safe); };
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key === 'f' || event.key === 'F') update(defaultCamera()); if (event.key === '+' || event.key === '=') update(zoomCamera(camera, 1.15)); if (event.key === '-') update(zoomCamera(camera, 1 / 1.15)); if (event.key === 'ArrowLeft') update(panCamera(camera, -2, 0)); if (event.key === 'ArrowRight') update(panCamera(camera, 2, 0)); if (event.key === 'ArrowUp') update(panCamera(camera, 0, -2)); if (event.key === 'ArrowDown') update(panCamera(camera, 0, 2)); }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [camera]);
  const width = board.settings.widthInches; const height = board.settings.heightInches; const linesX = gridLines(width); const linesY = gridLines(height); const viewWidth = width / camera.zoom; const viewHeight = height / camera.zoom;
  return <div className="overhead-wrap"><svg ref={svgRef} className={`overhead-board surface-${board.settings.surface}`} viewBox={`${width / 2 - viewWidth / 2 + camera.x} ${height / 2 - viewHeight / 2 + camera.y} ${viewWidth} ${viewHeight}`} role="application" aria-label={`${width} by ${height} inch overhead board`} tabIndex={0} onWheel={(event) => { event.preventDefault(); update(zoomCamera(camera, event.deltaY < 0 ? 1.12 : 1 / 1.12)); }} onPointerDown={(event) => { if (event.button === 1 || event.shiftKey) { drag.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); } }} onPointerMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setCursor(screenToBoard(event.clientX, event.clientY, rect, camera, board)); if (drag.current) { update(panCamera(camera, event.clientX - drag.current.x, event.clientY - drag.current.y)); drag.current = { x: event.clientX, y: event.clientY }; } }} onPointerUp={() => { drag.current = null; }}>
    <rect x="0" y="0" width={width} height={height} className="board-surface" />
    {linesX.map(({ value, major }) => <line key={`x${value}`} x1={value} x2={value} y1="0" y2={height} className={major ? 'grid-major' : 'grid-minor'} />)}
    {linesY.map(({ value, major }) => <line key={`y${value}`} x1="0" x2={width} y1={value} y2={value} className={major ? 'grid-major' : 'grid-minor'} />)}
    <rect x="0" y="0" width={width} height={height} className="board-frame" /><circle cx="0" cy="0" r=".38" className="origin" />
    {linesX.filter(({ value }) => value > 0 && value < width && value % 12 === 0).map(({ value }) => <text key={`tx${value}`} x={value} y="-.55" className="ruler-label">{value}</text>)}
    {linesY.filter(({ value }) => value > 0 && value < height && value % 12 === 0).map(({ value }) => <text key={`ty${value}`} x="-.7" y={value} className="ruler-label">{value}</text>)}
  </svg><output className="coordinate-readout" aria-live="polite">X {cursor.x.toFixed(1)} · Y {cursor.y.toFixed(1)} · {Math.round(camera.zoom * 100)}%</output></div>;
}
