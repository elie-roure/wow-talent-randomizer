import { Link, Route, Routes } from 'react-router-dom'
import { fetchMeta, useAsync } from './api'
import HomePage from './pages/HomePage'
import SpecPage from './pages/SpecPage'
import './App.css'

export default function App() {
  const { data: meta } = useAsync(fetchMeta, [])
  const version = meta?.supportedVersion

  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="app-title">
          <span className="app-title-dice" aria-hidden>
            🎲
          </span>
          WoW Talent Randomizer
        </Link>
        {version && (
          <span
            className="version-badge"
            title={`Règles de talents calibrées pour World of Warcraft : ${version.expansion}, patch ${version.patch} (niveau ${version.maxLevel}) : ${meta.budgets.class} points de classe, ${meta.budgets.spec} de spécialisation et ${meta.budgets.hero} de héros.`}
          >
            {version.expansion} · patch {version.patch}
          </span>
        )}
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/spec/:specId" element={<SpecPage />} />
          <Route path="*" element={<p className="status">Page introuvable.</p>} />
        </Routes>
      </main>

      <footer className="app-footer">
        {version && (
          <p>
            {`Randomizer conçu pour World of Warcraft : ${version.expansion}, patch ${version.patch} ` +
              `(niveau ${version.maxLevel}) : ${meta.budgets.class} points de classe, ` +
              `${meta.budgets.spec} de spécialisation (Apex compris) et ${meta.budgets.hero} de héros.`}
          </p>
        )}
        <p>Données : API Battle.net. World of Warcraft est une marque de Blizzard Entertainment.</p>
      </footer>
    </div>
  )
}
