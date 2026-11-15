import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'

export const SECTIONS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/organizations', label: 'Organizations', end: false },
  { to: '/contacts', label: 'Contacts', end: false },
  { to: '/deals', label: 'Deals', end: false },
  { to: '/pipeline', label: 'Pipeline', end: false },
]

export function TopBar() {
  return (
    <header className="bg-ink text-mist">
      <div className="mx-auto flex h-[60px] max-w-[1440px] items-center gap-8 px-8">
        <NavLink to="/" className="flex items-center gap-2.5 text-[17px] font-bold text-white">
          <span className="grid size-[26px] place-items-center rounded-[7px] bg-sea-green" aria-hidden>
            <span className="size-[9px] rounded-[3px] bg-ink" />
          </span>
          Accountable
        </NavLink>
        <nav aria-label="Sections" className="flex gap-1">
          {SECTIONS.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              end={s.end}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3.5 py-[7px] font-medium text-mist transition-colors hover:text-white',
                  isActive && 'bg-mist-pill font-semibold text-white',
                )
              }
            >
              {s.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
