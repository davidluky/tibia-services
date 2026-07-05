import type { SVGProps } from 'react'

export type FantasyIconProps = SVGProps<SVGSVGElement>

const baseIconProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  width: '1em',
  height: '1em',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export function KnightIcon(props: FantasyIconProps) {
  return (
    <svg {...baseIconProps} aria-hidden="true" {...props}>
      <path d="M12 3.4 5.7 5.8v5.4c0 4.1 2.6 7.4 6.3 9.4 3.7-2 6.3-5.3 6.3-9.4V5.8L12 3.4Z" />
      <path d="M12 6.5v10.9" />
      <path d="m8.6 10.2 6.8 3.6" />
      <path d="M17.9 3.4 7.1 14.2" />
      <path d="m16.2 5.1 2.7 2.7" />
    </svg>
  )
}

export function PaladinIcon(props: FantasyIconProps) {
  return (
    <svg {...baseIconProps} aria-hidden="true" {...props}>
      <path d="M7.2 4.3c5.1 2.3 7.9 7.4 6.6 15.4" />
      <path d="M16.8 4.3c-5.1 2.3-7.9 7.4-6.6 15.4" />
      <path d="M5 12h14" />
      <path d="m15.8 8.8 3.2 3.2-3.2 3.2" />
      <path d="M9.6 12h4.8" />
    </svg>
  )
}

export function SorcererIcon(props: FantasyIconProps) {
  return (
    <svg {...baseIconProps} aria-hidden="true" {...props}>
      <path d="M8 21 17.4 3.8" />
      <path d="m14.7 4.7 4.5 2.5" />
      <path d="M15.7 9.5c2.2-.7 3.5-2.5 3.6-5 .9 1.1 1.4 2.3 1.3 3.5-.1 2-1.6 3.6-3.5 3.9-1 .1-1.9-.1-2.7-.6.4-.5.8-1.1 1.3-1.8Z" />
      <path d="M6.6 18.4h3.2" />
    </svg>
  )
}

export function DruidIcon(props: FantasyIconProps) {
  return (
    <svg {...baseIconProps} aria-hidden="true" {...props}>
      <path d="M8.2 21 15.8 3" />
      <path d="M10.4 13.9c-2.9-.3-4.8-2.2-5.3-5.5 3.1.1 5.4 1.8 6.4 4.6" />
      <path d="M13.3 10.2c3.2-.2 5.5-2.1 6.3-5.3-3.3-.1-5.8 1.6-6.9 4.7" />
      <path d="M9.2 8.7c1.4 1.2 2.7 2.9 3.7 5.1" />
      <path d="M15.8 7.4c-1.2 1.2-2.1 2.6-2.8 4.2" />
    </svg>
  )
}

export function HuntIcon(props: FantasyIconProps) {
  return (
    <svg {...baseIconProps} aria-hidden="true" {...props}>
      <path d="M7.2 15.2c-1.4 0-2.6-1-2.6-2.4 0-1.3 1.1-2.4 2.6-2.4s2.6 1.1 2.6 2.4c0 1.4-1.2 2.4-2.6 2.4Z" />
      <path d="M16.8 15.2c-1.4 0-2.6-1-2.6-2.4 0-1.3 1.1-2.4 2.6-2.4s2.6 1.1 2.6 2.4c0 1.4-1.2 2.4-2.6 2.4Z" />
      <path d="M9.6 17.4c.7 1.4 1.5 2.1 2.4 2.1s1.7-.7 2.4-2.1" />
      <path d="M8.1 8.2 5.9 5.9" />
      <path d="m15.9 8.2 2.2-2.3" />
      <path d="M12 7.5V4.4" />
    </svg>
  )
}

export function QuestIcon(props: FantasyIconProps) {
  return (
    <svg {...baseIconProps} aria-hidden="true" {...props}>
      <path d="M7.4 4.2h9.2a2 2 0 0 1 2 2v11.6a2 2 0 0 0 2 2H8.2a2.8 2.8 0 0 1-2.8-2.8V6.2a2 2 0 0 1 2-2Z" />
      <path d="M18.6 17.8v-1.6" />
      <path d="m9 9 5.8 5.8" />
      <path d="m14.8 9-5.8 5.8" />
    </svg>
  )
}

export function BestiaryIcon(props: FantasyIconProps) {
  return (
    <svg {...baseIconProps} aria-hidden="true" {...props}>
      <path d="M4.4 5.3c2.5-.7 5-.2 7.6 1.4v13c-2.6-1.6-5.1-2-7.6-1.4v-13Z" />
      <path d="M19.6 5.3c-2.5-.7-5-.2-7.6 1.4v13c2.6-1.6 5.1-2 7.6-1.4v-13Z" />
      <path d="M8.1 9.2h.1" />
      <path d="M15.9 9.2h.1" />
      <path d="M8.5 13.5c1 .6 2.1.9 3.5.9s2.5-.3 3.5-.9" />
    </svg>
  )
}

export function BossIcon(props: FantasyIconProps) {
  return (
    <svg {...baseIconProps} aria-hidden="true" {...props}>
      <path d="M5.2 19.1h13.6l.9-8.4-4.2 2.6L12 5.1l-3.5 8.2-4.2-2.6.9 8.4Z" />
      <path d="M5.9 8.4 3.7 5.6" />
      <path d="m18.1 8.4 2.2-2.8" />
      <path d="M8 16h8" />
    </svg>
  )
}

export function CoinIcon(props: FantasyIconProps) {
  return (
    <svg {...baseIconProps} aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="8.3" />
      <circle cx="12" cy="12" r="5.2" />
      <path d="M9 9.3h6" />
      <path d="M12 9.3v5.4" />
      <path d="M9.6 14.7h4.8" />
    </svg>
  )
}

export function VerifiedIcon(props: FantasyIconProps) {
  return (
    <svg {...baseIconProps} aria-hidden="true" {...props}>
      <path d="m12 3.4 2 1.9 2.8-.4.7 2.7 2.4 1.4-1.2 2.5 1.2 2.5-2.4 1.4-.7 2.7-2.8-.4-2 1.9-2-1.9-2.8.4-.7-2.7-2.4-1.4 1.2-2.5L4.1 9l2.4-1.4.7-2.7 2.8.4 2-1.9Z" />
      <path d="m8.6 12.2 2.1 2.1 4.7-5" />
    </svg>
  )
}

export function ShieldCheckIcon(props: FantasyIconProps) {
  return (
    <svg {...baseIconProps} aria-hidden="true" {...props}>
      <path d="M12 3.5 5.6 6v5.2c0 4 2.6 7.4 6.4 9.3 3.8-1.9 6.4-5.3 6.4-9.3V6L12 3.5Z" />
      <path d="m8.8 12.1 2.2 2.2 4.4-4.8" />
    </svg>
  )
}
