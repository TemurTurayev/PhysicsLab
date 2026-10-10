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
  // Serious by default: the complex does not smile at its interns. Hard top light, muted palette.
  const look = mood === 'smile' ? 'serious' : mood
  return (
    <svg viewBox="0 0 200 240" className={className} role="img" aria-label="Daniil Orlov">
      <defs>
        <linearGradient id="int-coat" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9ddd9" />
          <stop offset="1" stopColor="#8f9792" />
        </linearGradient>
        <linearGradient id="int-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9b39a" />
          <stop offset="1" stopColor="#a8846f" />
        </linearGradient>
      </defs>
      {/* lab coat with folds, grey shirt, dark tie */}
      <path d="M16 240 q8 -62 84 -70 q76 8 84 70z" fill="url(#int-coat)" />
      <path d="M76 174 l24 36 l24 -36 q-24 -8 -48 0z" fill="#59636b" />
      <path d="M96 182 h8 l4 44 l-8 10 l-8 -10z" fill="#1b1f24" />
      <path d="M56 240 q4 -42 26 -64 l18 34 l18 -34 q22 22 26 64" fill="none" stroke="#6f7772" strokeWidth="3" />
      <path d="M40 240 q6 -30 20 -44" stroke="#7d847f" strokeWidth="2" fill="none" />
      {/* clearance pass on the pocket */}
      <rect x="126" y="200" width="30" height="22" rx="2" fill="#e8ebe6" stroke="#4a524c" strokeWidth="1.5" />
      <rect x="126" y="200" width="30" height="6" fill="#b3261e" />
      <rect x="129" y="209" width="9" height="10" fill="#7b8580" />
      {[141, 144, 146, 149, 151, 153].map((x) => (
        <rect key={x} x={x} y="210" width="1.2" height="8" fill="#222" />
      ))}
      {/* neck and head, lit from above */}
      <path d="M87 146 h26 v32 q-13 8 -26 0z" fill="#9c7a66" />
      <ellipse cx="100" cy="106" rx="42" ry="50" fill="url(#int-skin)" />
      <ellipse cx="58" cy="112" rx="6" ry="9" fill="#a8846f" />
      <ellipse cx="142" cy="112" rx="6" ry="9" fill="#a8846f" />
      {/* short dark hair, neat */}
      <path d="M58 96 q-4 -46 44 -48 q44 2 42 46 q-6 -20 -28 -26 q-28 -4 -44 8 q-10 8 -14 20z" fill="#24201d" />
      {/* brow shadow and cheek hollows */}
      <path d="M64 100 q36 -10 72 0 v8 q-36 -8 -72 0z" fill="#000" opacity="0.12" />
      <path d="M66 128 q6 14 16 18" stroke="#8c6b58" strokeWidth="2" fill="none" opacity="0.6" />
      <path d="M134 128 q-6 14 -16 18" stroke="#8c6b58" strokeWidth="2" fill="none" opacity="0.6" />
      {/* thin rectangular glasses */}
      <g fill="rgba(170,200,220,0.18)" stroke="#15181b" strokeWidth="2.5">
        <rect x="66" y="104" width="28" height="16" rx="2" />
        <rect x="106" y="104" width="28" height="16" rx="2" />
      </g>
      <path d="M94 110 h12" stroke="#15181b" strokeWidth="2.5" />
      {/* level brows, steady eyes */}
      <g stroke="#1e1a17" strokeWidth="4" strokeLinecap="round">
        <path d={look === 'wow' ? 'M70 92 l20 -2' : 'M70 98 l20 1'} />
        <path d={look === 'wow' ? 'M110 90 l20 2' : look === 'think' ? 'M110 97 l20 -3' : 'M110 99 l20 -1'} />
      </g>
      <ellipse cx="80" cy="112" rx="4" ry="4.5" fill="#1a1a1a" />
      <ellipse cx="120" cy="112" rx="4" ry="4.5" fill="#1a1a1a" />
      <path d="M100 116 q-3 10 1 13" stroke="#8c6b58" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {look === 'wow' ? <ellipse cx="100" cy="141" rx="4" ry="5" fill="#4a2e26" /> : <path d={look === 'think' ? 'M90 141 q10 -3 20 1' : 'M90 140 h20'} stroke="#4a2e26" strokeWidth="3" fill="none" strokeLinecap="round" />}
    </svg>
  )
}
