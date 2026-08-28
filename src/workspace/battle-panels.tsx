/* eslint-disable react-refresh/only-export-components */
import { Crosshair, Plus, Shield, Users } from 'lucide-react';
import type { BattlePosition, BattleSession, BattleUnit } from '../simulation/contracts';
import { deploymentZones } from '../simulation/deployment';
import { Button } from './components';

export interface UnitTemplate { id: string; name: string; role: string; }
export const unitTemplates: readonly UnitTemplate[] = [
  { id: 'scout', name: 'Scout team', role: 'Fast reconnaissance' },
  { id: 'line', name: 'Line team', role: 'Versatile fire team' },
  { id: 'heavy', name: 'Heavy team', role: 'Support element' },
];

export function RosterPanel({ session, selectedUnitId, onSelectUnit, onAddFaction, onAddUnit }: { session: BattleSession; selectedUnitId: string | null; onSelectUnit: (id: string) => void; onAddFaction: () => void; onAddUnit: (template: UnitTemplate) => void; }) {
  return <><section className="drawer-section"><span className="eyebrow">Factions</span><h3>Battle roster</h3><p>Roster edits reset deployment safely before a new session snapshot is saved.</p><div className="battle-faction-list">{session.factions.map((faction) => <div key={faction.id}><Shield size={14} /><span>{faction.name}</span><small>{session.units.filter((unit) => unit.factionId === faction.id).length} units</small></div>)}</div><Button variant="quiet" onClick={onAddFaction}><Plus size={14} />Add faction</Button></section><section className="drawer-section"><span className="eyebrow">Unit templates</span><h3>Add a unit</h3><div className="battle-template-list">{unitTemplates.map((template) => <Button key={template.id} variant="quiet" onClick={() => onAddUnit(template)}><Users size={14} /><span><strong>{template.name}</strong><small>{template.role}</small></span></Button>)}</div></section><section className="drawer-section"><span className="eyebrow">Roster units</span><h3>Unit cards</h3>{session.units.length ? <div className="battle-unit-list">{session.units.map((unit) => <UnitCard key={unit.id} unit={unit} factionName={session.factions.find((faction) => faction.id === unit.factionId)?.name ?? 'Unknown'} selected={unit.id === selectedUnitId} onSelect={() => onSelectUnit(unit.id)} />)}</div> : <p className="muted">Add a unit template to start deployment.</p>}</section></>;
}

function UnitCard({ unit, factionName, selected, onSelect }: { unit: BattleUnit; factionName: string; selected: boolean; onSelect: () => void; }) {
  return <button type="button" className={`battle-unit-card ${selected ? 'is-selected' : ''}`} aria-pressed={selected} onClick={onSelect}><Crosshair size={15} /><span><strong>{unit.name}</strong><small>{factionName} · {unit.position ? `${unit.position.x}, ${unit.position.y} deployed` : 'Awaiting deployment'}</small></span></button>;
}

export function DeploymentPanel({ session, selectedUnitId, position, onPosition, onDeploy }: { session: BattleSession; selectedUnitId: string | null; position: BattlePosition; onPosition: (position: BattlePosition) => void; onDeploy: () => void; }) {
  const selected = session.units.find((unit) => unit.id === selectedUnitId) ?? null;
  return <><section className="drawer-section"><span className="eyebrow">Deployment phase</span><h3>{selected ? `Deploy ${selected.name}` : 'Choose a unit card'}</h3><p>Generic checks require a faction zone, an unoccupied cell, and no blocking structure. Rules-specific validation starts in B15.</p></section><section className="drawer-section"><h3>Marked zones</h3><div className="battle-zone-list">{deploymentZones(session).map((zone) => <div key={zone.id}><strong>{zone.label}</strong><small>X {zone.x}–{zone.x + zone.width - 1} · all ranks</small></div>)}</div></section><section className="drawer-section"><h3>Grid position</h3><div className="field-grid"><label className="number-field"><span>X inch</span><input aria-label="Deployment X inch" type="number" min="0" max={session.board.snapshot.settings.widthInches - 1} value={position.x} onChange={(event) => onPosition({ ...position, x: Number(event.target.value) })} /></label><label className="number-field"><span>Y inch</span><input aria-label="Deployment Y inch" type="number" min="0" max={session.board.snapshot.settings.heightInches - 1} value={position.y} onChange={(event) => onPosition({ ...position, y: Number(event.target.value) })} /></label></div><Button variant="accent" disabled={!selected} onClick={onDeploy}>Deploy selected unit</Button></section></>;
}

export function BattleInspector({ session, unitId, onDeploy }: { session: BattleSession; unitId: string | null; onDeploy: () => void; }) {
  const unit = session.units.find((entry) => entry.id === unitId);
  if (!unit) return null;
  const faction = session.factions.find((entry) => entry.id === unit.factionId);
  return <aside className="battle-inspector" aria-label="Selected battle unit"><div className="inspector__header"><div><span className="eyebrow">Battle unit</span><h2>{unit.name}</h2></div><Crosshair size={20} /></div><div className="tabs__panel"><p><strong>Faction:</strong> {faction?.name ?? 'Unknown'}</p><p><strong>Status:</strong> {unit.position ? `Deployed at ${unit.position.x}, ${unit.position.y}` : 'Awaiting deployment'}</p><Button variant="accent" onClick={onDeploy}>{unit.position ? 'Reposition in Deploy' : 'Open deployment'}</Button></div></aside>;
}
