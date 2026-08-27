import type { CSSProperties } from 'react';
import type { Piece } from '../document/schema';
import { accessiblePieceName } from '../model/catalog';
import { terrainGeometry, type TerrainLabel, type TerrainVisualState } from '../model/geometry';

export function TerrainDefs() {
  return <defs>
    <pattern id="terrain-road" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#273746" /><path d="M0 1h2" stroke="#55717a" strokeWidth=".08" strokeDasharray=".42 .26" /></pattern>
    <pattern id="terrain-water" width="1.8" height="1" patternUnits="userSpaceOnUse"><rect width="1.8" height="1" fill="#123c58" /><path d="M.15 .52c.25-.3.52-.3.77 0s.5.3.76 0" fill="none" stroke="#79c9df" strokeWidth=".08" /></pattern>
    <pattern id="terrain-interior" width=".7" height=".7" patternUnits="userSpaceOnUse"><rect width=".7" height=".7" fill="#25313a" /><path d="M0 .7.7 0" stroke="#557079" strokeWidth=".06" /></pattern>
    <pattern id="terrain-woods" width="1.4" height="1.4" patternUnits="userSpaceOnUse"><rect width="1.4" height="1.4" fill="#193c35" /><circle cx=".36" cy=".4" r=".28" fill="#447d66" /><circle cx="1.05" cy=".78" r=".34" fill="#315f51" /></pattern>
    <pattern id="terrain-scatter" width="1.1" height="1.1" patternUnits="userSpaceOnUse"><rect width="1.1" height="1.1" fill="#40352b" /><path d="M.2.2h.42v.38H.2zM.68.62h.25v.23H.68z" fill="#b48a57" /></pattern>
  </defs>;
}

function AccessMarks({ piece }: { piece: Piece }) {
  const details = piece.structureDetails; if (!details) return null;
  const mark = (offset: number, span: number, wall: 'north' | 'east' | 'south' | 'west', type: 'door' | 'window', id: string) => {
    const stroke = type === 'door' ? '#f4bd69' : '#86e8f0';
    if (wall === 'north' || wall === 'south') { const y = wall === 'north' ? .14 : piece.height - .14; return <line key={id} x1={offset + .08} x2={offset + span - .08} y1={y} y2={y} stroke={stroke} strokeWidth={type === 'door' ? '.26' : '.15'} />; }
    const x = wall === 'west' ? .14 : piece.width - .14; return <line key={id} x1={x} x2={x} y1={offset + .08} y2={offset + span - .08} stroke={stroke} strokeWidth={type === 'door' ? '.26' : '.15'} />;
  };
  return <>{details.doors.map((entry) => mark(entry.offset, entry.span, entry.wall, 'door', entry.id))}{details.windows.map((entry) => mark(entry.offset, entry.span, entry.wall, 'window', entry.id))}</>;
}

function Symbol({ piece }: { piece: Piece }) {
  const { width: w, height: h } = piece; const geometry = terrainGeometry(piece);
  switch (geometry.svgSymbol) {
    case 'building': return <><rect x="0" y="0" width={w} height={h} rx=".12" className="terrain-building-base" /><rect x=".32" y=".32" width={Math.max(0, w - .64)} height={Math.max(0, h - .64)} rx=".08" className={piece.structureDetails?.roofMode === 'interior' ? 'terrain-building-interior' : 'terrain-building-roof'} /><path d={`M${w / 2} .7v${Math.max(.4, h - 1.4)}M.7 ${h / 2}h${Math.max(.4, w - 1.4)}`} className="terrain-building-plan" /><path d={`M${w - 1.1} .48l.55-.24v.48z`} className="terrain-direction" /><AccessMarks piece={piece} /></>;
    case 'ruin': return <><rect x="0" y="0" width={w} height={h} className="terrain-ruin-floor" /><path d={`M0 ${h}.0V0h${w * .8}M${w} .25v${h * .5}M${w * .46} ${h}h${w * .54}`} className="terrain-ruin-wall" /><path d={`M${w * .2} ${h * .3}l${w * .24} ${h * .12}m${w * .12} ${h * .28}l${w * .2} ${h * .1}`} className="terrain-ruin-break" /><AccessMarks piece={piece} /></>;
    case 'platform': return <><rect x="0" y="0" width={w} height={h} rx=".12" className="terrain-platform" /><path d={`M.2 ${h - .2}h${w - .4}M.2 ${h - .45}h${w - .4}`} className="terrain-platform-edge" /></>;
    case 'road': return <><rect x="0" y="0" width={w} height={h} className="terrain-road" /><path d={`M0 .18h${w}M0 ${h - .18}h${w}M.3 ${h / 2}h${Math.max(0, w - .6)}`} className="terrain-road-edge" /></>;
    case 'water': return <><rect x="0" y="0" width={w} height={h} className="terrain-water" /><path d={`M.2 ${h * .3}c.55-.32 1.05-.32 1.6 0s1.05.32 1.6 0s1.05-.32 1.6 0M.2 ${h * .68}c.55-.32 1.05-.32 1.6 0s1.05.32 1.6 0s1.05-.32 1.6 0`} className="terrain-water-wave" /></>;
    case 'wall': return <>{Array.from({ length: Math.max(1, Math.floor(w)) }, (_, index) => <path key={index} d={`M${index + .08} ${h}.08V.16h.2v.24h.24V.16h.2v${Math.max(0, h - .08)}z`} className="terrain-wall" />)}</>;
    case 'woods': return <><rect x="0" y="0" width={w} height={h} rx=".4" className="terrain-woods" />{Array.from({ length: Math.max(3, Math.floor(w * h / 3)) }, (_, index) => <circle key={index} cx={.55 + ((index * 1.41) % Math.max(.7, w - .9))} cy={.55 + ((index * .93) % Math.max(.7, h - .9))} r=".32" className="terrain-tree" />)}</>;
    case 'rocks': return <>{Array.from({ length: Math.max(2, Math.floor(w * h / 4)) }, (_, index) => { const x = .35 + ((index * 1.45) % Math.max(.5, w - .7)); const y = .45 + ((index * .84) % Math.max(.6, h - .8)); return <path key={index} d={`M${x} ${y + .42}l.24-.52.42.13.16.4-.32.32z`} className="terrain-rock" />; })}</>;
    case 'scatter': return <><rect x="0" y="0" width={w} height={h} rx=".18" className="terrain-scatter-ground" />{Array.from({ length: Math.max(2, Math.floor(w * h / 2)) }, (_, index) => <rect key={index} x={.25 + ((index * .93) % Math.max(.4, w - .7))} y={.25 + ((index * .59) % Math.max(.4, h - .7))} width=".45" height=".42" className="terrain-crate" />)}</>;
    case 'objective': return <><circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * .42} className="terrain-objective" /><path d={`M${w / 2} ${h * .18}v${h * .64}M${w * .18} ${h / 2}h${w * .64}`} className="terrain-objective-mark" /></>;
    case 'token': return <><circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * .42} className="terrain-token" /><circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * .16} className="terrain-token-core" /></>;
    case 'marker': return <path d={`M${w / 2} .08l${w * .38} ${h * .72}h-${w * .25}v${h * .12}h-${w * .26}v-${h * .12}h-${w * .25}z`} className="terrain-marker" />;
  }
}

export function TerrainPieceSvg({ piece, state, label }: { piece: Piece; state: TerrainVisualState; label?: TerrainLabel }) {
  if (state === 'hidden') return null;
  const transform = `translate(${piece.x} ${piece.y}) rotate(${piece.rotation} ${piece.width / 2} ${piece.height / 2})`;
  const style = { '--terrain-label-width': `${label?.width ?? 0}px` } as CSSProperties;
  return <g className={`terrain-piece terrain-piece--${state}`} data-terrain-kind={piece.kind} data-terrain-state={state} transform={transform} aria-label={accessiblePieceName(piece)} role="group" style={style}>
    <title>{accessiblePieceName(piece)}</title><Symbol piece={piece} />
    {piece.locked && <path d={`M${piece.width - .62} .62v-.16a.22.22 0 0 0-.44 0v.16m-.1 0h.64v.5h-.64z`} className="terrain-lock" />}
    {label && <g className={`terrain-label ${label.detail ? 'terrain-label--detail' : ''}`} transform={`translate(${piece.width / 2} ${piece.height / 2})`}><rect x={-label.width / 2} y="-.38" width={label.width} height=".76" rx=".12" /><text textAnchor="middle" y=".1">{label.detail ? `${piece.name} · ${piece.width}×${piece.height} in` : piece.name}</text></g>}
  </g>;
}
