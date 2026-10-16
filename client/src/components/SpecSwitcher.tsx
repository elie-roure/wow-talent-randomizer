import { useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchClasses, useAsync } from '../api'
import { classColor } from '../lib/classColors'
import type { ClassSummary } from '../lib/types'

/** Class selector + spec buttons to jump to another specialization from the spec page. */
export default function SpecSwitcher({ specId }: { specId: number }) {
  const { data: classes } = useAsync(fetchClasses, [])
  if (!classes) return <div className="switcher" aria-busy />
  // Keyed by spec: the class picked in the selector resets on every navigation.
  return <SwitcherBody key={specId} classes={classes} specId={specId} />
}

function SwitcherBody({ classes, specId }: { classes: ClassSummary[]; specId: number }) {
  const navigate = useNavigate()
  const currentClass = classes.find((c) => c.specs.some((s) => s.id === specId))
  const [pickedClassId, setPickedClassId] = useState(currentClass?.id)
  const shownClass = classes.find((c) => c.id === pickedClassId) ?? currentClass

  const randomSpec = () => {
    const specs = classes.flatMap((c) => c.specs).filter((s) => s.id !== specId)
    navigate(`/spec/${specs[Math.floor(Math.random() * specs.length)].id}`)
  }

  return (
    <nav
      className="switcher"
      aria-label="Changer de classe et de spécialisation"
      style={shownClass ? ({ '--switch-color': classColor(shownClass.id) } as CSSProperties) : undefined}
    >
      <Link to="/" className="back-link">
        ← Classes
      </Link>

      <label className="switcher-class">
        <span className="visually-hidden">Classe</span>
        {shownClass?.icon && <img src={shownClass.icon} alt="" />}
        <select value={shownClass?.id ?? ''} onChange={(e) => setPickedClassId(Number(e.target.value))}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <div className="switcher-specs">
        {shownClass?.specs.map((spec) => (
          <Link
            key={spec.id}
            to={`/spec/${spec.id}`}
            className={`switcher-spec ${spec.id === specId ? 'is-active' : ''}`}
            aria-current={spec.id === specId ? 'page' : undefined}
          >
            {spec.icon && <img src={spec.icon} alt="" />}
            <span>{spec.name}</span>
          </Link>
        ))}
      </div>

      <button type="button" className="icon-btn switcher-random" title="Classe et spé au hasard" onClick={randomSpec}>
        🎲
      </button>
    </nav>
  )
}
