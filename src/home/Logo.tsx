/** The site mark (same drawing as the favicon): trebuchet frame, a dashed throw, the stone at the apex, a target. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="pl-logo-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2318" />
          <stop offset="1" stopColor="#110e0a" />
        </linearGradient>
        <linearGradient id="pl-logo-brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd28a" />
          <stop offset="1" stopColor="#d98a2b" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#pl-logo-bg)" />
      <path d="M7 53.5H57" stroke="#5a4a33" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 31C24 6 41 6 51 46" fill="none" stroke="url(#pl-logo-brass)" strokeWidth="3.2" strokeLinecap="round" strokeDasharray="1 5.2" />
      <path d="M8 53L14 37L20 53" fill="none" stroke="url(#pl-logo-brass)" strokeWidth="3.4" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M10 43L16 31" stroke="url(#pl-logo-brass)" strokeWidth="3" strokeLinecap="round" />
      <rect x="8.2" y="41.8" width="5.6" height="5.6" rx="1.2" fill="#ffd28a" transform="rotate(-25 11 44.6)" />
      <circle cx="32" cy="12.6" r="4.3" fill="#f6efe0" />
      <circle cx="51.5" cy="47" r="6.4" fill="#e04a35" />
      <circle cx="51.5" cy="47" r="3.9" fill="#f6efe0" />
      <circle cx="51.5" cy="47" r="1.7" fill="#e04a35" />
    </svg>
  )
}
