import type { UniverseId } from '../lab/universe/types'

export type Mood = 'smile' | 'think' | 'wow'

/**
 * The two heroes as flat vector busts:
 * - Classic: Nodir, a village boy-inventor — embroidered skullcap, brass goggles, pencil behind the ear;
 * - Complex: intern Daniil — glasses, white lab coat over a blue shirt and tie, a Σ-7 pass on the pocket.
 */
export function Portrait({ world, mood = 'smile', className = '' }: { world: UniverseId; mood?: Mood; className?: string }) {
  return world === 'sigma' ? <Intern mood={mood} className={className} /> : <Nodir mood={mood} className={className} />
}

function Mouth({ mood, x, y }: { mood: Mood; x: number; y: number }) {
  if (mood === 'wow') return <ellipse cx={x} cy={y + 2} rx="5" ry="6" fill="#5a2a22" />
  if (mood === 'think') return <path d={`M${x - 8} ${y + 2} q8 -3 16 1`} stroke="#5a2a22" strokeWidth="3" fill="none" strokeLinecap="round" />
  return <path d={`M${x - 11} ${y - 1} q11 11 22 0`} stroke="#5a2a22" strokeWidth="3" fill="#fff" strokeLinecap="round" strokeLinejoin="round" />
}

function Brows({ mood, lx, rx, y, color }: { mood: Mood; lx: number; rx: number; y: number; color: string }) {
  const lift = mood === 'wow' ? -5 : 0
  const tilt = mood === 'think' ? 4 : 0
  return (
    <g stroke={color} strokeWidth="4" strokeLinecap="round">
      <path d={`M${lx - 9} ${y + lift + tilt} q9 -6 18 0`} fill="none" />
      <path d={`M${rx - 9} ${y + lift} q9 -6 18 ${-tilt}`} fill="none" />
    </g>
  )
}

function Nodir({ mood, className }: { mood: Mood; className: string }) {
  return (
    <svg viewBox="0 0 200 240" className={className} role="img" aria-label="Nodir">
      {/* shoulders: linen shirt, leather vest */}
      <path d="M22 240 q8 -58 78 -66 q70 8 78 66z" fill="#e9dcc2" />
      <path d="M34 240 q6 -46 44 -58 l22 30 l22 -30 q38 12 44 58z" fill="#7a4b2a" />
      <path d="M78 182 l22 30 l22 -30" fill="none" stroke="#5c361d" strokeWidth="3" />
      <circle cx="100" cy="222" r="3.5" fill="#d9a441" />
      {/* neck and head */}
      <path d="M86 150 h28 v30 q-14 8 -28 0z" fill="#c98d5e" />
      <ellipse cx="100" cy="110" rx="46" ry="52" fill="#d9a074" />
      <ellipse cx="54" cy="116" rx="8" ry="11" fill="#cf946a" />
      <ellipse cx="146" cy="116" rx="8" ry="11" fill="#cf946a" />
      {/* hair under the cap */}
      <path d="M56 98 q4 -34 44 -36 q40 2 44 36 q-10 -12 -22 -10 q-6 -10 -22 -8 q-16 -2 -22 8 q-14 -2 -22 10z" fill="#2b1c14" />
      {/* doppi skullcap with white pattern */}
      <path d="M58 76 q42 -40 84 0 v6 q-42 -12 -84 0z" fill="#1d2633" />
      <path d="M58 76 q42 -40 84 0" fill="none" stroke="#e8e3d6" strokeWidth="2" />
      {[72, 88, 104, 120].map((x) => (
        <path key={x} d={`M${x} 70 q4 -8 8 0 q-4 6 -8 0z`} fill="#e8e3d6" />
      ))}
      {/* brass goggles pushed up on the cap */}
      <rect x="62" y="80" width="76" height="6" rx="3" fill="#6b4a2a" />
      <circle cx="84" cy="82" r="10" fill="#d9a441" stroke="#8a5a22" strokeWidth="3" />
      <circle cx="116" cy="82" r="10" fill="#d9a441" stroke="#8a5a22" strokeWidth="3" />
      <circle cx="84" cy="82" r="5" fill="#9fd3ff" opacity="0.8" />
      <circle cx="116" cy="82" r="5" fill="#9fd3ff" opacity="0.8" />
      {/* pencil behind the ear */}
      <path d="M140 98 l18 -14" stroke="#f2c14e" strokeWidth="5" strokeLinecap="round" />
      <path d="M156 85 l4 -3" stroke="#3a2a1a" strokeWidth="5" strokeLinecap="round" />
      {/* face */}
      <Brows mood={mood} lx={82} rx={118} y={100} color="#2b1c14" />
      <ellipse cx="82" cy="114" rx="6" ry="7" fill="#2b1c14" />
      <ellipse cx="118" cy="114" rx="6" ry="7" fill="#2b1c14" />
      <circle cx="84" cy="111" r="2" fill="#fff" />
      <circle cx="120" cy="111" r="2" fill="#fff" />
      <path d="M100 118 q-4 10 2 12" stroke="#b97c52" strokeWidth="3" fill="none" strokeLinecap="round" />
      {[72, 78, 122, 128].map((x, i) => (
        <circle key={x} cx={x} cy={128 + (i % 2) * 3} r="1.6" fill="#a8683f" />
      ))}
      <ellipse cx="70" cy="134" rx="8" ry="5" fill="#e88f72" opacity="0.45" />
      <ellipse cx="130" cy="134" rx="8" ry="5" fill="#e88f72" opacity="0.45" />
      <Mouth mood={mood} x={100} y={140} />
    </svg>
  )
}

function Intern({ mood, className }: { mood: Mood; className: string }) {
  return (
    <svg viewBox="0 0 200 240" className={className} role="img" aria-label="Daniil">
      {/* white lab coat over a blue shirt and a dark tie */}
      <path d="M18 240 q8 -60 82 -68 q74 8 82 68z" fill="#f2f4f3" />
      <path d="M76 176 l24 34 l24 -34 q-24 -8 -48 0z" fill="#7aa3c7" />
      <path d="M96 184 h8 l4 40 l-8 10 l-8 -10z" fill="#24303d" />
      <path d="M58 240 q4 -40 24 -62 l18 32 l18 -32 q20 22 24 62" fill="none" stroke="#c9cfcc" strokeWidth="3" />
      <rect x="128" y="206" width="26" height="18" rx="2" fill="#dfe5e2" stroke="#9aa3a0" strokeWidth="1.5" />
      <rect x="131" y="209" width="20" height="5" fill="#d9a441" />
      <text x="141" y="221" fontSize="6" textAnchor="middle" fill="#333" fontFamily="monospace">Σ-7</text>
      <path d="M58 206 v18" stroke="#2f6fb2" strokeWidth="3" strokeLinecap="round" />
      {/* neck and head */}
      <path d="M87 148 h26 v30 q-13 8 -26 0z" fill="#e8b996" />
      <ellipse cx="100" cy="108" rx="44" ry="51" fill="#f1c7a6" />
      <ellipse cx="56" cy="114" rx="7" ry="10" fill="#e9bb98" />
      <ellipse cx="144" cy="114" rx="7" ry="10" fill="#e9bb98" />
      {/* short brown hair with a side part */}
      <path d="M56 100 q-2 -46 46 -48 q42 0 44 44 q-8 -18 -30 -22 q-24 -2 -38 10 q-12 4 -22 16z" fill="#6a4630" />
      <path d="M86 58 q-10 10 -12 22" stroke="#4e3322" strokeWidth="3" fill="none" />
      {/* glasses */}
      <g fill="rgba(200,230,255,0.25)" stroke="#2a2f36" strokeWidth="3">
        <rect x="66" y="102" width="28" height="22" rx="6" />
        <rect x="106" y="102" width="28" height="22" rx="6" />
      </g>
      <path d="M94 112 h12" stroke="#2a2f36" strokeWidth="3" />
      <Brows mood={mood} lx={80} rx={120} y={94} color="#5a3b28" />
      <ellipse cx="80" cy="113" rx="5" ry="6" fill="#2a2a2a" />
      <ellipse cx="120" cy="113" rx="5" ry="6" fill="#2a2a2a" />
      <circle cx="82" cy="111" r="1.8" fill="#fff" />
      <circle cx="122" cy="111" r="1.8" fill="#fff" />
      <path d="M100 120 q-4 10 2 12" stroke="#d89f7c" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Mouth mood={mood} x={100} y={140} />
    </svg>
  )
}
