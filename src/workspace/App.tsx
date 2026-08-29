/* eslint-disable react-hooks/exhaustive-deps */
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Box, ChevronDown, CircleHelp, ClipboardList, Copy, Crosshair, FilePlus2, FolderOpen, Grid3X3, Hammer, History as HistoryIcon, Layers3, Maximize2, Minus, MousePointer2, Pencil, Plus, Redo2, Save, Settings2, Swords, Trash2, Undo2, Upload, Users } from 'lucide-react';
import { createHistory, commit, redo, undo, type History } from '../document/history';
import { newBoard, parseBoard, starterBoard, validateImport, type BoardDocument, type Piece, type PieceKind, type WallSide } from '../document/schema';
import { createDraftPersistence, listSavedBoards, openSavedBoard, restoreDraft, saveBoard, type SaveState, type SavedBoardSummary } from '../document/persistence';
import { catalogByKind } from '../model/catalog';
import { addAccess, createPiece, joinStructures, movePieces, normalizeRotation, placementResult, removeAccess, resizePiece } from '../model/board-operations';
import { OverheadBoard, type BoardMode } from '../renderer/overhead';
import { BoardPanel, BuildPanel, InspectorPanel, LayersPanel, SetupPanel } from './panels';
import { Button, Dialog, Drawer, IconButton, Menu, MenuItem, Popover, ToastRegion, type Toast } from './components';
import { BattleCommandPanel, BattleInspector, BattleLogPanel, DeploymentPanel, RosterPanel, type UnitTemplate } from './battle-panels';
import type { BattleFaction, BattlePosition, BattleSession, BattleUnit } from '../simulation/contracts';
import { deploymentZones, validateDeployment } from '../simulation/deployment';
import { restoreBattleSessionDraft, saveBattleSessionDraftNow } from '../simulation/persistence';
import { reduceBattleSession } from '../simulation/reducer';
import { genericSkirmishAdapter } from '../simulation/generic-skirmish';
import type { RuleExplanation, TacticalAction } from '../simulation/rules';
import './battle.css';

const ThreeBoard = lazy(async () => ({ default: (await import('../renderer/three-board')).ThreeBoard }));
type DrawerId = 'board' | 'build' | 'layers' | 'setup' | 'roster' | 'deploy' | 'command' | 'log';
type AccessType = 'door' | 'window';
type ConfirmAction = 'clear' | 'delete' | null;
const drawerMeta = [
  { id: 'board' as const, label: 'Board', icon: Box }, { id: 'build' as const, label: 'Build', icon: Hammer },
  { id: 'layers' as const, label: 'Layers', icon: Layers3 }, { id: 'setup' as const, label: 'Setup', icon: Settings2 },
];

const defaultFactions = (): BattleFaction[] => [{ id: 'cyan-command', name: 'Cyan command' }, { id: 'violet-command', name: 'Violet command' }];
const createBattleSession = (board: BoardDocument, factions: readonly BattleFaction[] = defaultFactions(), units: readonly BattleUnit[] = []): BattleSession => {
  const at = new Date().toISOString();
  const created = reduceBattleSession(null, { type: 'session.create', id: crypto.randomUUID(), at, sessionId: crypto.randomUUID(), name: `${board.name} engagement`, board, seed: `battle-${board.id}`, adapter: { id: 'battle-builder-generic', version: '1' }, factions, units, objectives: board.pieces.filter((piece) => piece.kind === 'objective').map((piece) => ({ id: `objective-${piece.id}`, sourcePieceId: piece.id, state: 'unclaimed' })) });
  if (!created.ok) throw new Error(created.message);
  const phase = reduceBattleSession(created.session, { type: 'phase.change', id: crypto.randomUUID(), at, phase: 'deployment', activeFactionId: created.session.factions[0]?.id ?? null, round: 1 });
  if (!phase.ok) throw new Error(phase.message);
  return phase.session;
};

export function App() {
  const [history, setHistory] = useState<History>(() => createHistory(newBoard()));
  const board = history.present;
  const [activeDrawer, setActiveDrawer] = useState<DrawerId | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<'build' | 'battle'>('build');
  const [battleSession, setBattleSession] = useState<BattleSession | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [deploymentPosition, setDeploymentPosition] = useState<BattlePosition>({ x: 0, y: 0 });
  const [battleAction, setBattleAction] = useState<TacticalAction | null>(null);
  const [battleDestination, setBattleDestination] = useState<BattlePosition>({ x: 0, y: 0 });
  const [battleTargetId, setBattleTargetId] = useState<string | null>(null);
  const [battleLogFilter, setBattleLogFilter] = useState<'all' | 'roll' | 'phase' | 'action'>('all');
  const [replayIndex, setReplayIndex] = useState<number | null>(null);
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
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [hydrated, setHydrated] = useState(false);
  const [savedBoards, setSavedBoards] = useState<SavedBoardSummary[]>([]);
  const [openBoardsOpen, setOpenBoardsOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const skipInitialDraftWrite = useRef(false);
  const announce = (message: string, tone: Toast['tone'] = 'info') => setToasts((items) => [...items.slice(-2), { id: Date.now(), tone, message }]);
  const draftPersistence = useMemo(() => createDraftPersistence(window.localStorage, { onStateChange: setSaveState }), []);
  const mutate = (next: BoardDocument) => setHistory((current) => commit(current, parseBoard(next)));
  const command = (next: BoardDocument, message: string, selection = selectedIds) => { mutate(next); setSelectedIds(selection); announce(message, 'success'); };
  const selectedPiece = selectedIds.length ? board.pieces.find((piece) => piece.id === selectedIds.at(-1)) ?? null : null;
  const toggleDrawer = (id: DrawerId) => setActiveDrawer((current) => current === id ? null : id);
  const select = (ids: string[]) => { setSelectedIds(ids); setMode(ids.length ? 'select' : 'neutral'); announce(ids.length ? `${ids.length} ${ids.length === 1 ? 'terrain piece selected.' : 'terrain pieces selected.'}` : 'Selection cleared.'); };

  useEffect(() => {
    const restored = restoreDraft(window.localStorage, newBoard());
    if (restored.status === 'restored' && restored.document) setHistory(createHistory(restored.document));
    if (restored.status === 'corrupt' || restored.status === 'unavailable') { skipInitialDraftWrite.current = true; announce(restored.message, 'warning'); }
    setHydrated(true);
    return () => { draftPersistence.flush(); };
  }, []);
  useEffect(() => { if (!hydrated) return; if (skipInitialDraftWrite.current) { skipInitialDraftWrite.current = false; return; } draftPersistence.schedule(board); }, [board, hydrated]);
  useEffect(() => { if (battleSession) saveBattleSessionDraftNow(window.localStorage, battleSession); }, [battleSession]);

  const addBuild = (kind: PieceKind, x: number, y: number, width: number, height: number) => {
    const piece = createPiece(board, kind, x, y, width, height); const result = placementResult(board, piece);
    if (!result.ok) { announce(`Cannot place ${catalogByKind(kind).singular.toLocaleLowerCase()}: ${result.reason}.`, 'warning'); return; }
    command({ ...board, pieces: [...board.pieces, piece] }, `${piece.name} built at ${x}, ${y}.`, [piece.id]); setMode('select');
  };
  const placeCatalogDefault = (kind: PieceKind) => {
    const item = catalogByKind(kind);
    for (let y = 0; y <= board.settings.heightInches - item.height; y += 1) for (let x = 0; x <= board.settings.widthInches - item.width; x += 1) { const piece = createPiece(board, kind, x, y, item.width, item.height); if (placementResult(board, piece).ok) { command({ ...board, pieces: [...board.pieces, piece] }, `${piece.name} placed at the first open cell.`, [piece.id]); setMode('select'); return; } }
    announce(`No open space is large enough for ${item.singular.toLocaleLowerCase()}.`, 'warning');
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
  const refreshSavedBoards = () => {
    const result = listSavedBoards(window.localStorage);
    if (result.ok) setSavedBoards(result.value); else announce(result.message, 'warning');
  };
  const saveCurrent = () => {
    const result = saveBoard(window.localStorage, board);
    if (!result.ok) { announce(result.message, 'warning'); return; }
    setHistory((current) => ({ ...current, present: result.value }));
    draftPersistence.schedule(result.value); refreshSavedBoards(); announce('Board saved to this browser.', 'success');
  };
  const enterBattle = () => {
    if (battleSession && battleSession.board.boardId === board.id && battleSession.board.snapshot.updatedAt === board.updatedAt) {
      setWorkspaceMode('battle'); setSelectedUnitId(null); setMode('neutral'); setActiveDrawer('roster'); announce('Returned to the preserved battle session.', 'success'); return;
    }
    const saved = saveBoard(window.localStorage, board);
    if (!saved.ok) { announce(`Battle mode needs a safe local board save: ${saved.message}`, 'warning'); return; }
    setHistory((current) => ({ ...current, present: saved.value }));
    const restored = restoreBattleSessionDraft(window.localStorage);
    const reusable = restored.status === 'restored' && restored.session.board.boardId === saved.value.id && restored.session.board.snapshot.updatedAt === saved.value.updatedAt;
    const session = reusable && restored.status === 'restored' ? restored.session : createBattleSession(saved.value);
    setBattleSession(session); setSelectedUnitId(null); setWorkspaceMode('battle'); setMode('neutral'); setActiveDrawer('roster');
    announce(reusable ? 'Battle session restored from this board snapshot.' : 'Board saved and a fresh deployment session is ready.', 'success');
  };
  const returnToBuild = () => { setWorkspaceMode('build'); setActiveDrawer(null); setSelectedUnitId(null); setMode('neutral'); announce('Returned to Build mode. Your board and battle session are both preserved.', 'success'); };
  const resetRoster = (factions: readonly BattleFaction[], units: readonly BattleUnit[], message: string) => {
    if (!battleSession) return;
    const source = battleSession.board.snapshot;
    try { const next = createBattleSession(source, factions, units.map((unit) => ({ ...unit, position: null }))); setBattleSession(next); setSelectedUnitId(null); announce(`${message} Deployment was reset safely.`, 'success'); }
    catch (error) { announce(error instanceof Error ? error.message : 'Roster could not be updated.', 'warning'); }
  };
  const addFaction = () => {
    if (!battleSession) return;
    const faction: BattleFaction = { id: crypto.randomUUID(), name: `Faction ${battleSession.factions.length + 1}` };
    resetRoster([...battleSession.factions, faction], battleSession.units, `${faction.name} added.`);
  };
  const addUnit = (template: UnitTemplate) => {
    if (!battleSession) return;
    const faction = battleSession.factions[0]; if (!faction) return;
    const unit: BattleUnit = { id: crypto.randomUUID(), factionId: faction.id, name: `${template.name} ${battleSession.units.filter((entry) => entry.factionId === faction.id).length + 1}`, position: null };
    resetRoster(battleSession.factions, [...battleSession.units, unit], `${unit.name} added to ${faction.name}.`);
  };
  const deploySelected = () => {
    if (!battleSession) return;
    const validation = validateDeployment(battleSession, selectedUnitId ?? '', deploymentPosition);
    if (!validation.ok) { announce(`Deployment blocked: ${validation.reason}`, 'warning'); return; }
    const result = reduceBattleSession(battleSession, { type: 'unit.deploy', id: crypto.randomUUID(), at: new Date().toISOString(), unitId: selectedUnitId!, position: deploymentPosition });
    if (!result.ok) { announce(result.message, 'warning'); return; }
    setBattleSession(result.session); announce(`Unit deployed in ${validation.zone.label}.`, 'success');
  };
  const preview = useMemo<RuleExplanation | null>(() => {
    if (!battleSession || !selectedUnitId || !battleAction) return null;
    if (battleAction === 'move') return genericSkirmishAdapter.movement({ session: battleSession, unitId: selectedUnitId, destination: battleDestination }).explanation;
    if (battleAction === 'attack') {
      if (!battleTargetId) return { title: 'Target selection', outcome: 'illegal', summary: 'Choose a deployed enemy target to inspect range, line of sight, and cover.', inputs: [], assumptions: [], terrain: [], rolls: [] };
      const target = genericSkirmishAdapter.legalTargets({ session: battleSession, unitId: selectedUnitId }).value.find((entry) => entry.unitId === battleTargetId);
      if (!target) return { title: 'Target selection', outcome: 'illegal', summary: 'The chosen target is no longer available.', inputs: [], assumptions: [], terrain: [], rolls: [] };
      return { title: 'Attack preview', outcome: target.legal ? 'legal' : 'illegal', summary: target.reason, inputs: [{ label: 'Range', value: target.range ? `${target.range.distance} / ${target.range.maximum} inches` : 'Unavailable' }, { label: 'Line of sight', value: target.lineOfSight?.line.clear ? 'Clear' : 'Blocked' }, { label: 'Cover', value: target.cover?.covered ? 'Target has cover' : 'No cover' }], assumptions: ['A confirmed generic attack rolls 1–6 against the attacker profile target.'], terrain: target.lineOfSight?.line.blockers.map((terrain) => `${terrain.name} blocks sight`) ?? [], rolls: [] };
    }
    const objective = battleSession.objectives.find((entry) => entry.sourcePieceId !== null);
    if (!objective) return { title: 'Objective interaction', outcome: 'illegal', summary: 'This session has no board-anchored objective to secure.', inputs: [], assumptions: [], terrain: [], rolls: [] };
    return genericSkirmishAdapter.objectiveScoring({ session: battleSession, objectiveId: objective.id, factionId: battleSession.units.find((unit) => unit.id === selectedUnitId)?.factionId ?? '' }).explanation;
  }, [battleSession, selectedUnitId, battleAction, battleDestination, battleTargetId]);
  const applyBattleCommand = (input: Parameters<typeof reduceBattleSession>[1], success: string) => {
    if (!battleSession || replayIndex !== null) { announce('Replay is read-only. Return to live play before changing the battle.', 'warning'); return false; }
    const result = reduceBattleSession(battleSession, input);
    if (!result.ok) { announce(`Battle command rejected: ${result.message}`, 'warning'); return false; }
    setBattleSession(result.session); announce(success, 'success'); return true;
  };
  const confirmBattleAction = () => {
    if (!battleSession || !selectedUnitId || !battleAction || !preview || preview.outcome === 'illegal') { announce('Resolve the invalid action preview before confirmation.', 'warning'); return; }
    const at = new Date().toISOString();
    if (battleAction === 'move') {
      if (applyBattleCommand({ type: 'move.intent', id: crypto.randomUUID(), at, unitId: selectedUnitId, destination: battleDestination }, 'Movement confirmed and recorded.')) { setBattleAction(null); }
      return;
    }
    if (battleAction === 'attack') {
      const unit = battleSession.units.find((entry) => entry.id === selectedUnitId)!;
      const roll = genericSkirmishAdapter.resolveRoll({ random: battleSession.random, minimum: 1, maximum: 6, target: genericSkirmishAdapter.profileFor(unit, battleSession).attackTarget, label: `${unit.name} attack` });
      if (applyBattleCommand({ type: 'roll.request', id: crypto.randomUUID(), at, rollId: crypto.randomUUID(), minimum: 1, maximum: 6 }, `Attack confirmed: ${roll.explanation.summary}`)) setBattleAction(null);
      return;
    }
    const objective = battleSession.objectives.find((entry) => entry.sourcePieceId !== null);
    if (objective && applyBattleCommand({ type: 'objective.state', id: crypto.randomUUID(), at, objectiveId: objective.id, state: 'secured' }, 'Objective interaction confirmed and recorded.')) setBattleAction(null);
  };
  const advanceBattlePhase = () => {
    if (!battleSession) return;
    const phases = genericSkirmishAdapter.phases(); const current = phases.indexOf(battleSession.turn.phase); const phase = phases[(current + 1) % phases.length]; let round = battleSession.turn.round; let active = battleSession.turn.activeFactionId;
    if (phase === 'command' && battleSession.turn.phase === 'resolution') { const factionIndex = battleSession.factions.findIndex((faction) => faction.id === active); active = battleSession.factions[(factionIndex + 1) % battleSession.factions.length]?.id ?? null; if (active === battleSession.factions[0]?.id) round += 1; }
    applyBattleCommand({ type: 'phase.change', id: crypto.randomUUID(), at: new Date().toISOString(), phase, activeFactionId: active, round }, `Battle advanced to ${phase}.`);
  };
  const copySeed = async () => { if (!battleSession) return; try { await navigator.clipboard.writeText(battleSession.seed); announce('Deterministic seed copied.', 'success'); } catch { announce(`Deterministic seed: ${battleSession.seed}`, 'info'); } };
  const openLibrary = () => { refreshSavedBoards(); setOpenBoardsOpen(true); };
  const openBoard = (id: string) => {
    const result = openSavedBoard(window.localStorage, id);
    if (!result.ok) { announce(result.message, 'warning'); return; }
    command(result.value, `Opened ${result.value.name}.`, []); setOpenBoardsOpen(false); setMode('neutral');
  };
  const duplicateBoard = () => {
    const now = new Date().toISOString();
    const duplicate = parseBoard({ ...board, id: crypto.randomUUID(), name: `Copy of ${board.name}`, createdAt: now, updatedAt: now });
    command(duplicate, `${duplicate.name} created.`, []); setMode('neutral');
  };
  const renameBoard = () => {
    const name = renameDraft.trim();
    if (!name) { announce('Board name cannot be blank.', 'warning'); return; }
    command({ ...board, name }, `Renamed board to ${name}.`); setRenameOpen(false);
  };
  const exportBoard = () => {
    const blob = new Blob([JSON.stringify(parseBoard(board), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${board.name.replaceAll(/[^a-z0-9]+/gi, '-').replaceAll(/(^-|-$)/g, '') || 'battle-board'}.json`; document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 0); announce('Board JSON exported.', 'success');
  };
  const importBoard = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    try {
      const result = validateImport(await file.text());
      if (!result.ok) { setImportError(result.message); return; }
      command(result.document, `Imported ${result.document.name}.`, []); setMode('neutral');
    } catch (error) { setImportError(error instanceof Error ? error.message : 'The selected file could not be read.'); }
  };
  const resolveConfirm = () => {
    if (confirmAction === 'clear') command({ ...board, pieces: [] }, 'Board cleared. Undo is available.', []);
    if (confirmAction === 'delete') removeSelected();
    setConfirmAction(null);
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const primary = event.ctrlKey || event.metaKey;
      if (primary && event.key.toLocaleLowerCase() === 'z') { event.preventDefault(); setHistory((value) => event.shiftKey ? redo(value) : undo(value)); setSelectedIds([]); setMode('neutral'); }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedIds.length) { event.preventDefault(); if (selectedIds.length > 1) setConfirmAction('delete'); else removeSelected(); }
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
      <div className="brand"><span className="brand__mark" aria-hidden="true"><Crosshair size={17} /></span><span>Battle Builder</span><span className="brand__phase">{workspaceMode === 'battle' ? 'Battle mode' : 'Board planner'}</span></div>
      <label className="board-name"><span className="sr-only">Board name</span><input value={board.name} onChange={(event) => mutate({ ...board, name: event.target.value })} /></label>
      <span className={`save-state save-state--${saveState}`}><Save size={14} />{saveState === 'pending' ? 'Saving draft…' : saveState === 'saved' ? 'Draft saved' : saveState === 'error' ? 'Draft save error' : 'Draft ready'}</span>
      <div className="document-actions" aria-label="Document history"><IconButton label="Undo" tooltip="Undo (Ctrl+Z)" disabled={!history.past.length} onClick={() => setHistory(undo)}><Undo2 size={16} /></IconButton><IconButton label="Redo" tooltip="Redo (Ctrl+Shift+Z)" disabled={!history.future.length} onClick={() => setHistory(redo)}><Redo2 size={16} /></IconButton></div>
      <Button variant={workspaceMode === 'battle' ? 'accent' : 'quiet'} aria-pressed={workspaceMode === 'battle'} onClick={workspaceMode === 'battle' ? returnToBuild : enterBattle}><Swords size={15} />{workspaceMode === 'battle' ? 'Return to Build' : 'Enter Battle'}</Button>
      {workspaceMode === 'build' && <Menu label="Board menu" trigger={<><span>Board</span><ChevronDown size={14} /></>}>{(close) => <><MenuItem onSelect={() => { close(); command(newBoard(), 'New board created.', []); setMode('neutral'); }}><FilePlus2 size={15} />New board</MenuItem><MenuItem onSelect={() => { close(); setRenameDraft(board.name); setRenameOpen(true); }}><Pencil size={15} />Rename</MenuItem><MenuItem onSelect={() => { close(); saveCurrent(); }}><Save size={15} />Save</MenuItem><MenuItem onSelect={() => { close(); openLibrary(); }}><FolderOpen size={15} />Open…</MenuItem><MenuItem onSelect={() => { close(); duplicateBoard(); }}><Copy size={15} />Duplicate board</MenuItem><MenuItem onSelect={() => { close(); exportBoard(); }}><Save size={15} />Export JSON</MenuItem><MenuItem onSelect={() => { close(); importInput.current?.click(); }}><Upload size={15} />Import JSON…</MenuItem><MenuItem onSelect={() => { close(); setConfirmAction('clear'); }} disabled={!board.pieces.length}><Trash2 size={15} />Clear board</MenuItem><MenuItem onSelect={() => { close(); toggleDrawer('setup'); }}><Settings2 size={15} />Board settings</MenuItem><MenuItem onSelect={() => { close(); setHelpOpen(true); }}><CircleHelp size={15} />Help & controls</MenuItem></>}</Menu>}
    </header>
    <div className="workspace-layout">
      <nav className="activity-rail" aria-label="Workspace sections">{(workspaceMode === 'battle' ? [{ id: 'roster' as const, label: 'Roster', icon: Users }, { id: 'deploy' as const, label: 'Deploy', icon: Crosshair }, { id: 'command' as const, label: 'Command', icon: Swords }, { id: 'log' as const, label: 'Battle log', icon: HistoryIcon }] : drawerMeta).map(({ id, label, icon: Icon }) => <IconButton key={id} label={label} tooltip={label} className={activeDrawer === id ? 'is-active' : undefined} aria-pressed={activeDrawer === id} onClick={() => toggleDrawer(id)}><Icon size={19} /></IconButton>)}</nav>
      <main className="workspace" aria-label="Battle Builder workspace">
        <section className="canvas-stage" aria-label="Board workspace">
          <div className="canvas-stage__header"><div><span className="eyebrow">{workspaceMode === 'battle' ? 'Battle deployment workspace' : 'Precision board workspace'}</span><span className="board-dimensions">{board.settings.widthInches} × {board.settings.heightInches} in · fixed 1 in grid{workspaceMode === 'battle' ? ' · deployment phase' : ''}</span></div><div className="view-switcher" aria-label="Board view"><Button variant={view === 'overhead' ? 'accent' : 'quiet'} aria-pressed={view === 'overhead'} onClick={() => setView('overhead')}>Overhead</Button><Button variant={view === '3d' ? 'accent' : 'quiet'} aria-pressed={view === '3d'} onClick={() => setView('3d')}>3D planning</Button></div></div>
          <div className="canvas-void">
            <div className="canvas-shelf" aria-label="Canvas controls">{workspaceMode === 'battle' ? <><div className="segmented"><Button variant={activeDrawer === 'command' ? 'accent' : 'quiet'} onClick={() => setActiveDrawer('command')}><Swords size={15} />Command</Button><Button variant="quiet" onClick={() => setActiveDrawer('roster')}><Users size={15} />Roster</Button><Button variant="quiet" onClick={() => setActiveDrawer('deploy')}><Crosshair size={15} />Deploy</Button><Button variant="quiet" onClick={() => setActiveDrawer('log')}><ClipboardList size={15} />Log</Button></div><span className="shelf-divider" /></> : <><div className="segmented"><Button variant={mode === 'neutral' ? 'accent' : 'quiet'} aria-pressed={mode === 'neutral'} onClick={() => setMode('neutral')}>Neutral</Button><Button variant={mode === 'select' ? 'accent' : 'quiet'} aria-pressed={mode === 'select'} onClick={() => setMode('select')}><MousePointer2 size={15} />Select</Button><Button variant={mode === 'build' ? 'accent' : 'quiet'} aria-pressed={mode === 'build'} onClick={() => { setMode('build'); setActiveDrawer('build'); }}><Hammer size={15} />Build</Button>{selectedPiece?.structureDetails && <Button variant={mode === 'access' ? 'accent' : 'quiet'} aria-pressed={mode === 'access'} onClick={() => setMode('access')}>Access</Button>}</div><span className="shelf-divider" /><Button variant={board.settings.snap ? 'accent' : 'quiet'} aria-pressed={board.settings.snap} onClick={() => updateSettings({ ...board.settings, snap: !board.settings.snap })}><Grid3X3 size={15} />Snap</Button></>}<Button variant="quiet" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }))}><Maximize2 size={15} />Fit</Button><Button variant="quiet" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '-' }))} aria-label="Zoom out"><Minus size={15} /></Button><output className="zoom-output" aria-label="Current zoom">1 in</output><Button variant="quiet" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '+' }))} aria-label="Zoom in"><Plus size={15} /></Button><div className="controls-wrap"><Button variant="quiet" aria-expanded={controlsOpen} onClick={() => setControlsOpen((value) => !value)}><CircleHelp size={15} />Controls</Button><Popover open={controlsOpen} label="Board control reference" onClose={() => setControlsOpen(false)}><strong>{workspaceMode === 'battle' ? 'Battle controls' : 'Construction controls'}</strong><p>{workspaceMode === 'battle' ? 'Select a deployed unit, choose Command, inspect movement / target / LOS / cover, and confirm. Log replay is read-only. Right-drag or Alt-drag orbits in 3D; middle drag pans and wheel zooms.' : 'Build: drag to create · Select: click, Shift-click, or marquee · Move: drag or H/J/K/L · Rotate: R · Pan: middle or Shift-drag · Zoom: wheel.'}</p></Popover></div></div>
            {view === 'overhead' ? <OverheadBoard board={board} mode={workspaceMode === 'battle' ? 'neutral' : mode} buildKind={selectedCatalog} selectedIds={selectedIds} hoveredId={hoveredPieceId} onHoverPiece={setHoveredPieceId} onSelectionChange={select} onBuild={addBuild} onMove={move} onResize={resize} onRotate={(id, rotation) => patchPiece({ id, rotation: normalizeRotation(rotation) })} onAccess={addFeature} /> : <Suspense fallback={<p>Loading 3D planning view…</p>}><ThreeBoard board={board} preset={preset} selectedIds={selectedIds} onSelect={(id) => select(id ? [id] : [])} onContextLost={() => { setView('overhead'); announce('3D graphics context was lost. Returned to the overhead editor; your board is unchanged.', 'warning'); }} /></Suspense>}
            {workspaceMode === 'battle' && battleSession && <div className="battle-board-overlay" aria-label="Battle units and deployment zones">{deploymentZones(battleSession).map((zone) => <div key={zone.id} className="battle-zone" aria-label={zone.label} style={{ left: `${zone.x / board.settings.widthInches * 100}%`, top: `${zone.y / board.settings.heightInches * 100}%`, width: `${zone.width / board.settings.widthInches * 100}%`, height: `${zone.height / board.settings.heightInches * 100}%` }}><span>{zone.label}</span></div>)}{battleSession.objectives.map((objective) => { const source = objective.sourcePieceId ? board.pieces.find((piece) => piece.id === objective.sourcePieceId) : null; return source ? <span key={objective.id} className="battle-objective" style={{ left: `${(source.x + source.width / 2) / board.settings.widthInches * 100}%`, top: `${(source.y + source.height / 2) / board.settings.heightInches * 100}%` }}>◆</span> : null; })}{battleSession.units.filter((unit) => unit.position).map((unit) => <button key={unit.id} type="button" className={`battle-token ${selectedUnitId === unit.id ? 'is-selected' : ''}`} aria-label={`${unit.name}, deployed at ${unit.position!.x}, ${unit.position!.y}`} aria-pressed={selectedUnitId === unit.id} style={{ left: `${(unit.position!.x + .5) / board.settings.widthInches * 100}%`, top: `${(unit.position!.y + .5) / board.settings.heightInches * 100}%` }} onClick={() => { setSelectedUnitId(unit.id); setActiveDrawer(null); }}>{unit.name.slice(0, 1)}</button>)}</div>}
            {view === '3d' && <div className="preset-bar"><Button onClick={() => setPreset('top')}>1 Top</Button><Button onClick={() => setPreset('isometric')}>2 Iso</Button><Button onClick={() => setPreset('perspective')}>3 Perspective</Button><Button onClick={() => setPreset('front')}>4 Front</Button></div>}
            {view === 'overhead' && board.pieces.length === 0 && mode !== 'build' && <div className="zero-state"><div className="zero-state__glyph"><Crosshair size={32} /></div><p className="eyebrow">36 × 36 tactical surface</p><h1>Start building the battlefield.</h1><p>Choose terrain from the catalog, or begin from a balanced starter layout.</p><div className="zero-state__actions"><Button variant="accent" onClick={() => { setMode('build'); setActiveDrawer('build'); }}>Build / add terrain</Button><Button variant="quiet" onClick={() => command(starterBoard(), 'Starter layout loaded into the workspace.', [])}>Load starter layout</Button></div></div>}
          </div>
        </section>
        {workspaceMode === 'build' && <><Drawer open={activeDrawer === 'board'} title="Board" onClose={() => setActiveDrawer(null)}><BoardPanel board={board} onHelp={() => setHelpOpen(true)} /></Drawer><Drawer open={activeDrawer === 'build'} title="Build" onClose={() => setActiveDrawer(null)}><BuildPanel activeKind={selectedCatalog} onChoose={chooseCatalog} onPlace={placeCatalogDefault} /></Drawer><Drawer open={activeDrawer === 'layers'} title="Layers" onClose={() => setActiveDrawer(null)}><LayersPanel board={board} selectedIds={selectedIds} onSelect={select} onChangePieces={patchMany} onReorder={reorder} /></Drawer><Drawer open={activeDrawer === 'setup'} title="Setup" onClose={() => setActiveDrawer(null)}><SetupPanel board={board} onSettings={updateSettings} /></Drawer><InspectorPanel piece={selectedPiece} selectionCount={selectedIds.length} accessType={accessType} onAccessType={(type) => { setAccessType(type); setMode('access'); }} onPatch={patchPiece} onDelete={removeSelected} onDuplicate={duplicate} onJoin={join} joinReason={joinReason} onRemoveAccess={removeFeature} onAddAccess={(type) => { if (!selectedPiece) return; setAccessType(type); addFeature(selectedPiece.id, 'north', Math.max(0, Math.floor(selectedPiece.width / 2) - 1)); }} /></>}
        {workspaceMode === 'battle' && battleSession && <><Drawer open={activeDrawer === 'roster'} title="Battle roster" onClose={() => setActiveDrawer(null)}><RosterPanel session={battleSession} selectedUnitId={selectedUnitId} onSelectUnit={(id) => { setSelectedUnitId(id); setBattleAction(null); setActiveDrawer(null); }} onAddFaction={addFaction} onAddUnit={addUnit} /></Drawer><Drawer open={activeDrawer === 'deploy'} title="Deploy units" onClose={() => setActiveDrawer(null)}><DeploymentPanel session={battleSession} selectedUnitId={selectedUnitId} position={deploymentPosition} onPosition={setDeploymentPosition} onDeploy={deploySelected} /></Drawer><Drawer open={activeDrawer === 'command'} title="Battle command" onClose={() => setActiveDrawer(null)}><BattleCommandPanel session={battleSession} unitId={selectedUnitId} action={battleAction} destination={battleDestination} targetId={battleTargetId} explanation={preview} onAction={(action) => { setBattleAction(action); setBattleTargetId(null); }} onDestination={setBattleDestination} onTarget={setBattleTargetId} onConfirm={confirmBattleAction} onNextPhase={advanceBattlePhase} /></Drawer><Drawer open={activeDrawer === 'log'} title="Battle log" onClose={() => setActiveDrawer(null)}><BattleLogPanel session={battleSession} filter={battleLogFilter} onFilter={setBattleLogFilter} replayIndex={replayIndex} onReplayIndex={setReplayIndex} onCopySeed={copySeed} /></Drawer><BattleInspector session={battleSession} unitId={selectedUnitId} onDeploy={() => setActiveDrawer('deploy')} /></>}
      </main>
    </div>
    <input ref={importInput} className="sr-only" type="file" accept="application/json,.json" aria-label="Import board JSON" onChange={importBoard} />
    <Dialog open={openBoardsOpen} title="Open saved board" onClose={() => setOpenBoardsOpen(false)} actions={<Button variant="quiet" onClick={() => setOpenBoardsOpen(false)}>Cancel</Button>}><p>Saved boards are stored only in this browser. Opening one keeps the current board available through Undo.</p><div className="saved-board-list">{savedBoards.length ? savedBoards.map((saved) => <Button key={saved.id} variant="quiet" onClick={() => openBoard(saved.id)}><span>{saved.name}</span><small>{new Date(saved.updatedAt).toLocaleString()}</small></Button>) : <p>No saved boards yet. Use Board → Save to add this board.</p>}</div></Dialog>
    <Dialog open={renameOpen} title="Rename board" onClose={() => setRenameOpen(false)} actions={<><Button variant="quiet" onClick={() => setRenameOpen(false)}>Cancel</Button><Button variant="accent" onClick={renameBoard}>Rename</Button></>}><label className="text-field"><span>Board name</span><input autoFocus value={renameDraft} maxLength={120} onChange={(event) => setRenameDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') renameBoard(); }} /></label></Dialog>
    <Dialog open={confirmAction !== null} title={confirmAction === 'clear' ? 'Clear board?' : 'Delete selected terrain?'} onClose={() => setConfirmAction(null)} actions={<><Button variant="quiet" onClick={() => setConfirmAction(null)}>Cancel</Button><Button variant="danger" onClick={resolveConfirm}>{confirmAction === 'clear' ? 'Clear board' : `Delete ${selectedIds.length} objects`}</Button></>}><p>{confirmAction === 'clear' ? `This removes all ${board.pieces.length} terrain pieces from ${board.name}.` : 'This removes every selected terrain piece.'} You can undo the action immediately.</p></Dialog>
    <Dialog open={Boolean(importError)} title="Import failed" onClose={() => setImportError(null)} actions={<Button variant="accent" onClick={() => setImportError(null)}>Keep current board</Button>}><p>Your current board was not changed.</p><p><strong>Problem:</strong> {importError}</p><p>Choose a JSON export created by Battle Builder, confirm it includes a supported schema version and valid board/terrain values, then try again.</p></Dialog>
    <Dialog open={helpOpen} title="Workspace controls" onClose={() => setHelpOpen(false)} actions={<Button variant="accent" onClick={() => setHelpOpen(false)}>Done</Button>}><p>Build opens a searchable catalog; Layers finds, orders, locks, and hides terrain; Setup safely configures the board. Precise construction remains on the central board.</p><dl className="help-list"><div><dt>Camera</dt><dd>Middle / Shift-drag pans, wheel zooms, F fits, and 1–4 changes views.</dd></div><div><dt>Keyboard</dt><dd>V Select, B Build, A Access, H/J/K/L move, R rotates, Ctrl+D duplicates, Delete removes.</dd></div></dl></Dialog>
    <ToastRegion toasts={toasts} />
  </div>;
}
