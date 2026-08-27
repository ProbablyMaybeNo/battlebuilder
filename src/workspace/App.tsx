/* eslint-disable react-hooks/exhaustive-deps */
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Box, ChevronDown, CircleHelp, Copy, Crosshair, FilePlus2, FolderOpen, Grid3X3, Hammer, Layers3, Maximize2, Minus, MousePointer2, Plus, Redo2, Save, Settings2, Undo2, Upload } from 'lucide-react';
import { createHistory, commit, redo, undo, type History } from '../document/history';
import { newBoard, parseBoard, starterBoard, type BoardDocument, type Piece, type PieceKind, type WallSide } from '../document/schema';
import { catalogByKind } from '../model/catalog';
import { addAccess, createPiece, joinStructures, movePieces, normalizeRotation, placementResult, removeAccess, resizePiece } from '../model/board-operations';
import { OverheadBoard, type BoardMode } from '../renderer/overhead';
import { BoardPanel, BuildPanel, InspectorPanel, LayersPanel, SetupPanel } from './panels';
import { Button, Dialog, Drawer, IconButton, Menu, MenuItem, Popover, ToastRegion, type Toast } from './components';

const ThreeBoard = lazy(async () => ({ default: (await import('../renderer/three-board')).ThreeBoard }));
type DrawerId = 'board' | 'build' | 'layers' | 'setup';
type AccessType = 'door' | 'window';
const drawerMeta = [
  { id: 'board' as const, label: 'Board', icon: Box }, { id: 'build' as const, label: 'Build', icon: Hammer },
  { id: 'layers' as const, label: 'Layers', icon: Layers3 }, { id: 'setup' as const, label: 'Setup', icon: Settings2 },
];

export function App() {
  const [history, setHistory] = useState<History>(() => createHistory(newBoard()));
  const board = history.present;
  const [activeDrawer, setActiveDrawer] = useState<DrawerId | null>(null);
  const [mode, setMode] = useState<BoardMode>('neutral');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hoveredPieceId, setHoveredPieceId] = useState<string | null>(null);
  const [selectedCatalog, setSelectedCatalog] = useState<PieceKind>('building');
  const [accessType, setAccessType] = useState<AccessType>('door');
  const [view, setView] = useState<'overhead' | '3d'>('overhead');
  const [preset, setPreset] = useState<'top' | 'isometric' | 'perspective' | 'front'>('isometric');
  const [controlsOpen, setControlsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const announce = (message: string, tone: Toast['tone'] = 'info') => setToasts((items) => [...items.slice(-2), { id: Date.now(), tone, message }]);
  const mutate = (next: BoardDocument) => setHistory((current) => commit(current, parseBoard(next)));
  const command = (next: BoardDocument, message: string, selection = selectedIds) => { mutate(next); setSelectedIds(selection); announce(message, 'success'); };
  const selectedPiece = selectedIds.length ? board.pieces.find((piece) => piece.id === selectedIds.at(-1)) ?? null : null;
  const toggleDrawer = (id: DrawerId) => setActiveDrawer((current) => current === id ? null : id);
  const select = (ids: string[]) => { setSelectedIds(ids); setMode(ids.length ? 'select' : 'neutral'); };

  const addBuild = (kind: PieceKind, x: number, y: number, width: number, height: number) => {
    const piece = createPiece(board, kind, x, y, width, height); const result = placementResult(board, piece);
    if (!result.ok) { announce(`Cannot place ${catalogByKind(kind).singular.toLocaleLowerCase()}: ${result.reason}.`, 'warning'); return; }
    command({ ...board, pieces: [...board.pieces, piece] }, `${piece.name} built at ${x}, ${y}.`, [piece.id]); setMode('select');
  };
  const move = (ids: string[], dx: number, dy: number) => {
    const result = movePieces(board, ids, dx, dy);
    if (!result.result.ok) { announce(`Move cancelled: ${result.result.reason}.`, 'warning'); return; }
    command({ ...board, pieces: result.pieces }, `Moved ${ids.length} ${ids.length === 1 ? 'object' : 'objects'}.`, ids);
  };
  const resize = (id: string, width: number, height: number) => {
    const original = board.pieces.find((piece) => piece.id === id); if (!original) return;
    const piece = resizePiece(original, width, height); const result = placementResult(board, piece, [id]);
    if (!result.ok) { announce(`Resize cancelled: ${result.reason}.`, 'warning'); return; }
    command({ ...board, pieces: board.pieces.map((entry) => entry.id === id ? piece : entry) }, `${piece.name} resized to ${piece.width} × ${piece.height} in.`, [id]);
  };
  const patchPiece = (change: Partial<Piece>) => {
    if (!selectedPiece) return; const piece = { ...selectedPiece, ...change }; const result = placementResult(board, piece, [piece.id]);
    if (!result.ok && !('hidden' in change) && !('locked' in change) && !('layer' in change) && !('notes' in change) && !('name' in change) && !('structureDetails' in change)) { announce(`Change cancelled: ${result.reason}.`, 'warning'); return; }
    command({ ...board, pieces: board.pieces.map((entry) => entry.id === piece.id ? piece : entry) }, `${piece.name} updated.`, [piece.id]);
  };
  const patchMany = (ids: readonly string[], change: Partial<Pick<Piece, 'locked' | 'hidden'>>) => command({ ...board, pieces: board.pieces.map((piece) => ids.includes(piece.id) ? { ...piece, ...change } : piece) }, `${ids.length} ${ids.length === 1 ? 'object' : 'objects'} updated.`, [...ids]);
  const reorder = (ids: readonly string[], direction: -1 | 1) => command({ ...board, pieces: board.pieces.map((piece) => ids.includes(piece.id) ? { ...piece, layer: Math.max(-1000, Math.min(1000, piece.layer + direction)) } : piece) }, `${ids.length} ${ids.length === 1 ? 'object' : 'objects'} ${direction > 0 ? 'raised' : 'lowered'}.`, [...ids]);
  const duplicate = () => {
    if (!selectedPiece) return;
    for (let y = 0; y <= board.settings.heightInches - selectedPiece.height; y += 1) for (let x = 0; x <= board.settings.widthInches - selectedPiece.width; x += 1) {
      if (x === selectedPiece.x && y === selectedPiece.y) continue;
      const copy = { ...selectedPiece, id: crypto.randomUUID(), name: `${selectedPiece.name} copy`, x, y, locked: false };
      if (placementResult(board, copy).ok) { command({ ...board, pieces: [...board.pieces, copy] }, `${copy.name} duplicated.`, [copy.id]); return; }
    }
    announce('No free space is available for a duplicate.', 'warning');
  };
  const removeSelected = () => { if (selectedIds.length) command({ ...board, pieces: board.pieces.filter((piece) => !selectedIds.includes(piece.id)) }, `${selectedIds.length} ${selectedIds.length === 1 ? 'object' : 'objects'} removed.`, []); };
  const join = () => {
    const result = joinStructures(board, selectedIds);
    if (!result.ok) { announce(`Cannot join structures: ${result.reason}.`, 'warning'); return; }
    command({ ...board, pieces: [...board.pieces.filter((piece) => !result.consumedIds.includes(piece.id)), result.piece] }, `${result.piece.name} joined into one footprint.`, [result.piece.id]);
  };
  const joinReason = useMemo(() => selectedIds.length > 1 ? (() => { const result = joinStructures(board, selectedIds); return result.ok ? null : `Join unavailable: ${result.reason}.`; })() : null, [board, selectedIds]);
  const addFeature = (id: string, wall: WallSide, offset: number) => {
    const current = board.pieces.find((piece) => piece.id === id); if (!current) return;
    const next = addAccess(current, accessType, wall, offset);
    if (!next) { announce('That wall position cannot accept an overlapping access feature.', 'warning'); return; }
    command({ ...board, pieces: board.pieces.map((piece) => piece.id === id ? next : piece) }, `${accessType === 'door' ? 'Door' : 'Window'} added on the ${wall} wall.`, [id]);
  };
  const removeFeature = (id: string) => { if (!selectedPiece) return; const next = removeAccess(selectedPiece, id); command({ ...board, pieces: board.pieces.map((piece) => piece.id === next.id ? next : piece) }, 'Access feature removed.', [next.id]); };
  const updateSettings = (settings: BoardDocument['settings']) => {
    const outOfBounds = board.pieces.find((piece) => piece.x + piece.width > settings.widthInches || piece.y + piece.height > settings.heightInches);
    if (outOfBounds) { announce(`Cannot resize board: ${outOfBounds.name} would fall outside the new bounds.`, 'warning'); return; }
    command({ ...board, settings }, `Board settings updated to ${settings.widthInches} × ${settings.heightInches} inches.`);
  };
  const chooseCatalog = (kind: PieceKind) => { setSelectedCatalog(kind); setMode('build'); setActiveDrawer(null); announce(`${catalogByKind(kind).name} armed. Drag on the board to set its inch footprint.`); };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const primary = event.ctrlKey || event.metaKey;
      if (primary && event.key.toLocaleLowerCase() === 'z') { event.preventDefault(); setHistory((value) => event.shiftKey ? redo(value) : undo(value)); }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedIds.length) { event.preventDefault(); removeSelected(); }
      if (primary && event.key.toLocaleLowerCase() === 'd') { event.preventDefault(); duplicate(); }
      if (event.key.toLocaleLowerCase() === 'v') setMode('select');
      if (event.key.toLocaleLowerCase() === 'b') setMode('build');
      if (event.key.toLocaleLowerCase() === 'a' && selectedPiece?.structureDetails) setMode('access');
      if (event.key === '1') setView('overhead');
      if (event.key === '2') { setView('3d'); setPreset('isometric'); }
      if (event.key === '3') { setView('3d'); setPreset('perspective'); }
      if (event.key === '4') { setView('3d'); setPreset('front'); }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [history, selectedIds, selectedPiece]);

  return <div className="app-shell">
    <header className="document-bar">
      <div className="brand"><span className="brand__mark" aria-hidden="true"><Crosshair size={17} /></span><span>Battle Builder</span><span className="brand__phase">Board planner</span></div>
      <label className="board-name"><span className="sr-only">Board name</span><input value={board.name} onChange={(event) => mutate({ ...board, name: event.target.value })} /></label>
      <span className="save-state"><Save size={14} />Draft changes tracked</span>
      <div className="document-actions" aria-label="Document history"><IconButton label="Undo" tooltip="Undo (Ctrl+Z)" disabled={!history.past.length} onClick={() => setHistory(undo)}><Undo2 size={16} /></IconButton><IconButton label="Redo" tooltip="Redo (Ctrl+Shift+Z)" disabled={!history.future.length} onClick={() => setHistory(redo)}><Redo2 size={16} /></IconButton></div>
      <Menu label="Board menu" trigger={<><span>Board</span><ChevronDown size={14} /></>}>{(close) => <><MenuItem onSelect={() => { close(); command(newBoard(), 'New board created.', []); }}><FilePlus2 size={15} />New board</MenuItem><MenuItem onSelect={() => { close(); announce('Saved-board lifecycle arrives in B08.'); }}><FolderOpen size={15} />Open…</MenuItem><MenuItem onSelect={() => { close(); duplicate(); }}><Copy size={15} />Duplicate</MenuItem><MenuItem onSelect={() => { close(); announce('Import is introduced in B08.'); }}><Upload size={15} />Import JSON…</MenuItem><MenuItem onSelect={() => { close(); toggleDrawer('setup'); }}><Settings2 size={15} />Board settings</MenuItem><MenuItem onSelect={() => { close(); setHelpOpen(true); }}><CircleHelp size={15} />Help & controls</MenuItem></>}</Menu>
    </header>
    <div className="workspace-layout">
      <nav className="activity-rail" aria-label="Workspace sections">{drawerMeta.map(({ id, label, icon: Icon }) => <IconButton key={id} label={label} tooltip={label} className={activeDrawer === id ? 'is-active' : undefined} aria-pressed={activeDrawer === id} onClick={() => toggleDrawer(id)}><Icon size={19} /></IconButton>)}</nav>
      <main className="workspace" aria-label="Battle Builder workspace">
        <section className="canvas-stage" aria-label="Board workspace">
          <div className="canvas-stage__header"><div><span className="eyebrow">Precision board workspace</span><span className="board-dimensions">{board.settings.widthInches} × {board.settings.heightInches} in · fixed 1 in grid</span></div><div className="view-switcher" aria-label="Board view"><Button variant={view === 'overhead' ? 'accent' : 'quiet'} aria-pressed={view === 'overhead'} onClick={() => setView('overhead')}>Overhead</Button><Button variant={view === '3d' ? 'accent' : 'quiet'} aria-pressed={view === '3d'} onClick={() => setView('3d')}>3D planning</Button></div></div>
          <div className="canvas-void">
            <div className="canvas-shelf" aria-label="Canvas controls"><div className="segmented"><Button variant={mode === 'neutral' ? 'accent' : 'quiet'} aria-pressed={mode === 'neutral'} onClick={() => setMode('neutral')}>Neutral</Button><Button variant={mode === 'select' ? 'accent' : 'quiet'} aria-pressed={mode === 'select'} onClick={() => setMode('select')}><MousePointer2 size={15} />Select</Button><Button variant={mode === 'build' ? 'accent' : 'quiet'} aria-pressed={mode === 'build'} onClick={() => { setMode('build'); setActiveDrawer('build'); }}><Hammer size={15} />Build</Button>{selectedPiece?.structureDetails && <Button variant={mode === 'access' ? 'accent' : 'quiet'} aria-pressed={mode === 'access'} onClick={() => setMode('access')}>Access</Button>}</div><span className="shelf-divider" /><Button variant={board.settings.snap ? 'accent' : 'quiet'} aria-pressed={board.settings.snap} onClick={() => updateSettings({ ...board.settings, snap: !board.settings.snap })}><Grid3X3 size={15} />Snap</Button><Button variant="quiet" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }))}><Maximize2 size={15} />Fit</Button><Button variant="quiet" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '-' }))} aria-label="Zoom out"><Minus size={15} /></Button><output className="zoom-output" aria-label="Current zoom">1 in</output><Button variant="quiet" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '+' }))} aria-label="Zoom in"><Plus size={15} /></Button><div className="controls-wrap"><Button variant="quiet" aria-expanded={controlsOpen} onClick={() => setControlsOpen((value) => !value)}><CircleHelp size={15} />Controls</Button><Popover open={controlsOpen} label="Board control reference"><strong>Construction controls</strong><p>Build: drag to create · Select: click, Shift-click, or marquee · Move: drag or H/J/K/L · Rotate: R · Pan: middle or Shift-drag · Zoom: wheel.</p></Popover></div></div>
            {view === 'overhead' ? <OverheadBoard board={board} mode={mode} buildKind={selectedCatalog} selectedIds={selectedIds} hoveredId={hoveredPieceId} onHoverPiece={setHoveredPieceId} onSelectionChange={select} onBuild={addBuild} onMove={move} onResize={resize} onRotate={(id, rotation) => patchPiece({ id, rotation: normalizeRotation(rotation) })} onAccess={addFeature} /> : <Suspense fallback={<p>Loading 3D planning view…</p>}><ThreeBoard board={board} preset={preset} selectedIds={selectedIds} onSelect={(id) => select(id ? [id] : [])} /></Suspense>}
            {view === '3d' && <div className="preset-bar"><Button onClick={() => setPreset('top')}>1 Top</Button><Button onClick={() => setPreset('isometric')}>2 Iso</Button><Button onClick={() => setPreset('perspective')}>3 Perspective</Button><Button onClick={() => setPreset('front')}>4 Front</Button></div>}
            {board.pieces.length === 0 && mode !== 'build' && <div className="zero-state"><div className="zero-state__glyph"><Crosshair size={32} /></div><p className="eyebrow">36 × 36 tactical surface</p><h1>Start building the battlefield.</h1><p>Choose terrain from the catalog, or begin from a balanced starter layout.</p><div className="zero-state__actions"><Button variant="accent" onClick={() => { setMode('build'); setActiveDrawer('build'); }}>Build / add terrain</Button><Button variant="quiet" onClick={() => command(starterBoard(), 'Starter layout loaded into the workspace.', [])}>Load starter layout</Button></div></div>}
          </div>
        </section>
        <Drawer open={activeDrawer === 'board'} title="Board" onClose={() => setActiveDrawer(null)}><BoardPanel board={board} onHelp={() => setHelpOpen(true)} /></Drawer>
        <Drawer open={activeDrawer === 'build'} title="Build" onClose={() => setActiveDrawer(null)}><BuildPanel activeKind={selectedCatalog} onChoose={chooseCatalog} /></Drawer>
        <Drawer open={activeDrawer === 'layers'} title="Layers" onClose={() => setActiveDrawer(null)}><LayersPanel board={board} selectedIds={selectedIds} onSelect={select} onChangePieces={patchMany} onReorder={reorder} /></Drawer>
        <Drawer open={activeDrawer === 'setup'} title="Setup" onClose={() => setActiveDrawer(null)}><SetupPanel board={board} onSettings={updateSettings} /></Drawer>
        <InspectorPanel piece={selectedPiece} selectionCount={selectedIds.length} accessType={accessType} onAccessType={(type) => { setAccessType(type); setMode('access'); }} onPatch={patchPiece} onDelete={removeSelected} onDuplicate={duplicate} onJoin={join} joinReason={joinReason} onRemoveAccess={removeFeature} />
      </main>
    </div>
    <Dialog open={helpOpen} title="Workspace controls" onClose={() => setHelpOpen(false)} actions={<Button variant="accent" onClick={() => setHelpOpen(false)}>Done</Button>}><p>Build opens a searchable catalog; Layers finds, orders, locks, and hides terrain; Setup safely configures the board. Precise construction remains on the central board.</p><dl className="help-list"><div><dt>Camera</dt><dd>Middle / Shift-drag pans, wheel zooms, F fits, and 1–4 changes views.</dd></div><div><dt>Keyboard</dt><dd>V Select, B Build, A Access, H/J/K/L move, R rotates, Ctrl+D duplicates, Delete removes.</dd></div></dl></Dialog>
    <ToastRegion toasts={toasts} />
  </div>;
}
