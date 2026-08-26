import { useMemo, useState } from 'react';
import { Box, ChevronDown, CircleHelp, Copy, Crosshair, FilePlus2, FolderOpen, Grid3X3, Hammer, Layers3, Maximize2, Minus, MousePointer2, Plus, Redo2, Save, Settings2, Undo2, Upload } from 'lucide-react';
import { newBoard, starterBoard, type BoardDocument, type Piece } from '../document/schema';
import { catalog } from '../model/catalog';
import { Button, Dialog, Drawer, IconButton, Menu, MenuItem, Popover, Tabs, ToastRegion, type Toast } from './components';

type DrawerId = 'board' | 'build' | 'layers' | 'setup';
type Tool = 'select' | 'build';

const drawerMeta = [
  { id: 'board' as const, label: 'Board', icon: Box },
  { id: 'build' as const, label: 'Build', icon: Hammer },
  { id: 'layers' as const, label: 'Layers', icon: Layers3 },
  { id: 'setup' as const, label: 'Setup', icon: Settings2 },
];

function SelectionInspector({ piece, onClose }: { piece: Piece | null; onClose: () => void }) {
  const [tab, setTab] = useState('properties');
  if (!piece) return null;
  return <aside className="inspector" aria-label={`${piece.name} inspector`}><div className="inspector__header"><div><p className="eyebrow">Selected terrain</p><h2>{piece.name}</h2></div><IconButton label="Close inspector" onClick={onClose}>×</IconButton></div><Tabs selected={tab} onSelect={setTab} tabs={[{ id: 'properties', label: 'Properties', content: <p>Type-aware controls will appear here when terrain selection arrives in B05–B07.</p> }, { id: 'appearance', label: 'Appearance', content: <p>Surface and structure options are selection-only.</p> }, { id: 'notes', label: 'Notes', content: <p>No notes yet.</p> }]} /></aside>;
}

export function App() {
  const [board, setBoard] = useState<BoardDocument>(() => newBoard());
  const [activeDrawer, setActiveDrawer] = useState<DrawerId | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [snap, setSnap] = useState(true);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState<string | null>(null);
  const announce = (message: string, tone: Toast['tone'] = 'info') => setToasts((items) => [...items.slice(-2), { id: Date.now(), tone, message }]);
  const toggleDrawer = (id: DrawerId) => setActiveDrawer((current) => current === id ? null : id);
  const groupedCatalog = useMemo(() => catalog.reduce<Record<string, typeof catalog>>((groups, item) => ({ ...groups, [item.group]: [...(groups[item.group] ?? []), item] }), {}), []);
  const loadStarter = () => { setBoard(starterBoard()); setSelectedPiece(null); announce('Starter layout loaded into the workspace.', 'success'); };
  const renameBoard = (name: string) => setBoard((current) => ({ ...current, name }));

  return <div className="app-shell">
    <header className="document-bar">
      <div className="brand"><span className="brand__mark" aria-hidden="true"><Crosshair size={17} /></span><span>Battle Builder</span><span className="brand__phase">Board planner</span></div>
      <label className="board-name"><span className="sr-only">Board name</span><input value={board.name} onChange={(event) => renameBoard(event.target.value)} /></label>
      <span className="save-state"><Save size={14} />Local draft ready</span>
      <div className="document-actions" aria-label="Document history"><IconButton label="Undo" tooltip="Undo (Ctrl+Z)" disabled><Undo2 size={16} /></IconButton><IconButton label="Redo" tooltip="Redo (Ctrl+Shift+Z)" disabled><Redo2 size={16} /></IconButton></div>
      <Menu label="Board menu" trigger={<><span>Board</span><ChevronDown size={14} /></>}>{(close) => <>
        <MenuItem onSelect={() => { close(); announce('New board flow is ready for lifecycle controls in B08.'); }}><FilePlus2 size={15} />New board</MenuItem>
        <MenuItem onSelect={() => { close(); announce('Open board flow is ready for lifecycle controls in B08.'); }}><FolderOpen size={15} />Open…</MenuItem>
        <MenuItem onSelect={() => { close(); announce('Duplicate board flow is ready for lifecycle controls in B08.'); }}><Copy size={15} />Duplicate</MenuItem>
        <MenuItem onSelect={() => { close(); announce('Import is introduced in B08.'); }}><Upload size={15} />Import JSON…</MenuItem>
        <MenuItem onSelect={() => { close(); announce('Export is introduced in B08.'); }}><Save size={15} />Export JSON</MenuItem>
        <MenuItem onSelect={() => { close(); toggleDrawer('setup'); }}><Settings2 size={15} />Board settings</MenuItem>
        <MenuItem onSelect={() => { close(); setHelpOpen(true); }}><CircleHelp size={15} />Help & controls</MenuItem>
      </>}</Menu>
    </header>
    <div className="workspace-layout">
      <nav className="activity-rail" aria-label="Workspace sections">{drawerMeta.map(({ id, label, icon: Icon }) => <IconButton key={id} label={label} tooltip={label} className={activeDrawer === id ? 'is-active' : undefined} aria-pressed={activeDrawer === id} onClick={() => toggleDrawer(id)}><Icon size={19} /></IconButton>)}</nav>
      <main className="workspace" aria-label="Battle Builder workspace">
        <section className="canvas-stage" aria-label="Board workspace">
          <div className="canvas-stage__header"><div><span className="eyebrow">Precision board workspace</span><span className="board-dimensions">{board.settings.widthInches} × {board.settings.heightInches} in · fixed 1 in grid</span></div><div className="view-switcher" aria-label="Board view"><Button variant="accent" aria-pressed>Overhead</Button><Button variant="quiet" disabled title="3D planning view arrives in B04">3D planning</Button></div></div>
          <div className="canvas-void">
            <div className="canvas-shelf" aria-label="Canvas controls"><div className="segmented"><Button variant={tool === 'select' ? 'accent' : 'quiet'} aria-pressed={tool === 'select'} onClick={() => setTool('select')}><MousePointer2 size={15} />Select</Button><Button variant={tool === 'build' ? 'accent' : 'quiet'} aria-pressed={tool === 'build'} onClick={() => { setTool('build'); setActiveDrawer('build'); }}><Hammer size={15} />Build</Button></div><span className="shelf-divider" /><Button variant={snap ? 'accent' : 'quiet'} aria-pressed={snap} onClick={() => setSnap((value) => !value)}><Grid3X3 size={15} />Snap</Button><Button variant="quiet" disabled title="Camera controls arrive in B03"><Maximize2 size={15} />Fit</Button><Button variant="quiet" disabled aria-label="Zoom out"><Minus size={15} /></Button><output className="zoom-output" aria-label="Current zoom">100%</output><Button variant="quiet" disabled aria-label="Zoom in"><Plus size={15} /></Button><div className="controls-wrap"><Button variant="quiet" aria-expanded={controlsOpen} onClick={() => setControlsOpen((value) => !value)}><CircleHelp size={15} />Controls</Button><Popover open={controlsOpen} label="Board control reference"><strong>Workspace controls</strong><p>Build uses the terrain catalog. Pan, zoom, and precision board controls arrive with the SVG editor in B03.</p></Popover></div></div>
            <div className="zero-state"><div className="zero-state__glyph"><Crosshair size={32} /></div><p className="eyebrow">{board.pieces.length ? 'Starter layout staged' : '36 × 36 tactical surface'}</p><h1>{board.pieces.length ? 'Your terrain is ready for the board renderer.' : 'Start building the battlefield.'}</h1><p>{board.pieces.length ? `${board.pieces.length} terrain pieces are stored in the shared board document.` : 'Choose terrain from the catalog, or begin from a balanced starter layout.'}</p><div className="zero-state__actions"><Button variant="accent" onClick={() => { setTool('build'); setActiveDrawer('build'); }}>Build / add terrain</Button><Button variant="quiet" onClick={loadStarter}>Load starter layout</Button></div></div>
          </div>
        </section>
        <Drawer open={activeDrawer === 'board'} title="Board" onClose={() => setActiveDrawer(null)}><section className="drawer-section"><h3>{board.name}</h3><p>{board.settings.widthInches} × {board.settings.heightInches} inches · local draft ready</p></section><section className="drawer-section"><h3>Quick help</h3><p>Use Build to choose terrain. The overhead surface and camera controls arrive in B03.</p><Button variant="quiet" onClick={() => setHelpOpen(true)}>Open controls reference</Button></section></Drawer>
        <Drawer open={activeDrawer === 'build'} title="Build" onClose={() => setActiveDrawer(null)}><label className="search-field"><span className="sr-only">Search terrain catalog</span><input placeholder="Search terrain" /></label>{Object.entries(groupedCatalog).map(([group, items]) => <section className="drawer-section" key={group}><h3>{group}</h3>{items.map((item) => <button key={item.kind} className={`catalog-item ${selectedCatalog === item.kind ? 'is-selected' : ''}`} type="button" onClick={() => { setSelectedCatalog(item.kind); setTool('build'); announce(`${item.name} selected. Drag placement arrives in B06.`); }}><span><strong>{item.name}</strong><small>{item.width} × {item.height} in</small></span><span aria-hidden="true">+</span></button>)}</section>)}</Drawer>
        <Drawer open={activeDrawer === 'layers'} title="Layers" onClose={() => setActiveDrawer(null)}><label className="search-field"><span className="sr-only">Search layers</span><input placeholder="Search objects" /></label><section className="drawer-section"><h3>Board objects</h3><p>{board.pieces.length ? `${board.pieces.length} pieces staged. Layer visibility and ordering arrive in B07.` : 'No terrain pieces yet. Add terrain from Build.'}</p></section></Drawer>
        <Drawer open={activeDrawer === 'setup'} title="Setup" onClose={() => setActiveDrawer(null)}><section className="drawer-section"><h3>Board dimensions</h3><p>{board.settings.widthInches} × {board.settings.heightInches} inches</p><p className="muted">The one-inch grid is permanent. Board dimension controls arrive in B07.</p></section><section className="drawer-section"><h3>Surface</h3><p className="muted">{board.settings.surface} surface · snap {snap ? 'on' : 'off'}</p></section></Drawer>
        <SelectionInspector piece={selectedPiece} onClose={() => setSelectedPiece(null)} />
      </main>
    </div>
    <Dialog open={helpOpen} title="Workspace controls" onClose={() => setHelpOpen(false)} actions={<Button variant="accent" onClick={() => setHelpOpen(false)}>Done</Button>}><p>Battle Builder uses a compact command workspace: the rail opens on-demand drawers, the Board menu owns document actions, and the center stays dedicated to the board.</p><dl className="help-list"><div><dt>Build</dt><dd>Choose terrain from the grouped catalog.</dd></div><div><dt>Pan, zoom, fit</dt><dd>Arrive with the precision overhead board in B03.</dd></div><div><dt>3D planning</dt><dd>Arrives with the shared Three.js renderer in B04.</dd></div></dl></Dialog>
    <ToastRegion toasts={toasts} />
  </div>;
}
