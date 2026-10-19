import { useState } from 'react'
import { currentTheme, setTheme } from '../theme.js'
import './Menu.css'

const IconJersey = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7 L8 4 L10 5 Q12 6 14 5 L16 4 L20 7 L18 11 L17 11 L17 20 L7 20 L7 11 L6 11 Z" />
  </svg>
)

const IconStadium = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="14" rx="9" ry="5" />
    <path d="M3 14 V11 Q12 6 21 11 V14" />
    <path d="M6 9.2 V6 M10 7.4 V4 M14 7.4 V4 M18 9.2 V6" />
  </svg>
)

const IconCrest = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 L20 6 V12 Q20 17 12 21 Q4 17 4 12 V6 Z" />
    <path d="M8 10 H16 M12 8 V14" />
  </svg>
)

const IconSun = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2 V4 M12 20 V22 M2 12 H4 M20 12 H22 M4.9 4.9 L6.3 6.3 M17.7 17.7 L19.1 19.1 M4.9 19.1 L6.3 17.7 M17.7 6.3 L19.1 4.9" />
  </svg>
)

const IconMoon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
    <path d="M20 14.5 A8 8 0 1 1 9.5 4 A6.5 6.5 0 0 0 20 14.5 Z" />
  </svg>
)

function ThemeToggle() {
  const [theme, setThemeState] = useState(currentTheme)
  const next = theme === 'light' ? 'dark' : 'light'

  function toggle() {
    setTheme(next)
    setThemeState(next)
  }

  return (
    <button className="back-btn theme-toggle" onClick={toggle} aria-label={next === 'light' ? 'Włącz jasny motyw' : 'Włącz ciemny motyw'}>
      {next === 'light' ? <IconSun /> : <IconMoon />}
    </button>
  )
}

const MODES = [
  { id: 'kit-quiz',     code: '01', label: 'Koszulki', Icon: IconJersey,  active: true },
  { id: 'stadium-quiz', code: '02', label: 'Stadiony', Icon: IconStadium, active: true },
  // Hidden until the crest quiz exists
  { id: 'coming-soon',  code: '03', label: 'Herby',    Icon: IconCrest,   active: false, hidden: true },
]

export default function Menu({ onSelect }) {
  return (
    <div className="screen menu">
      <div className="menu-top">
        <ThemeToggle />
      </div>
      <h1 className="menu-title">
        Wizualna odprawa<br />
        <em>przedmeczowa.</em>
      </h1>

      <div className="menu-modes">
        {MODES.filter(m => !m.hidden).map(m => (
          <button
            key={m.id}
            className={`mode-card${m.active ? '' : ' mode-disabled'}`}
            onClick={() => m.active && onSelect(m.id)}
            disabled={!m.active}
          >
            <div className="mode-icon-box">
              <m.Icon />
            </div>
            <div className="mode-info">
              <div className="mode-label">{m.label}</div>
            </div>
            <div className="mode-arrow">{m.active ? '▸' : '○'}</div>
          </button>
        ))}
      </div>

      <figure className="menu-quote">
        <blockquote>„To jest młoda Hiszpania, fajna Hiszpania, ale to nie jest Hiszpania, która jest tak doświadczona, jak te poprzednie Hiszpanie.”</blockquote>
      </figure>
    </div>
  )
}
