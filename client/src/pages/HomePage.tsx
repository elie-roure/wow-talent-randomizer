import type { CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchClasses, useAsync } from '../api'
import { classColor, ROLE_LABELS } from '../lib/classColors'

export default function HomePage() {
  const { data: classes, error, loading } = useAsync(fetchClasses, [])
  const navigate = useNavigate()

  const randomSpec = () => {
    if (!classes) return
    const specs = classes.flatMap((c) => c.specs)
    navigate(`/spec/${specs[Math.floor(Math.random() * specs.length)].id}`)
  }

  return (
    <div className="home">
      <section className="home-intro">
        <h1>Choisis ta classe et ta spécialisation</h1>
        <p>Un build de talents complet et valide est généré au hasard, prêt à être importé en jeu.</p>
        <button className="btn btn-primary" onClick={randomSpec} disabled={!classes}>
          🎲 Classe et spé au hasard
        </button>
      </section>

      {loading && <p className="status">Chargement des classes…</p>}
      {error && <p className="status status-error">Impossible de charger les classes : {error}</p>}

      <div className="class-grid">
        {classes?.map((cls) => (
          <section key={cls.id} className="class-card" style={{ '--class-color': classColor(cls.id) } as CSSProperties}>
            <h2 className="class-card-title">
              {cls.icon && <img src={cls.icon} alt="" className="class-card-icon" />}
              {cls.name}
            </h2>
            <ul className="spec-list">
              {cls.specs.map((spec) => (
                <li key={spec.id}>
                  <Link to={`/spec/${spec.id}`} className="spec-link">
                    {spec.icon && <img src={spec.icon} alt="" />}
                    <span className="spec-link-name">{spec.name}</span>
                    <span className="spec-link-role">{ROLE_LABELS[spec.role] ?? spec.role}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
