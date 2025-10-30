import { Routes, Route, Link } from 'react-router-dom'
import './App.css'
import ListPlayableClass from './components/ListPlayableClass'
import TalentTreeIndex from './components/TalentTreeIndex'
import SpecPage from './components/SpecPage'

export default function App() {
  return (
    <>
      <header style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>WoW Talent Randomizer</h1>
        <nav style={{ marginLeft: 'auto' }}>
          <Link to="/">Home</Link>
        </nav>
      </header>

      <main>
        <Routes>
          <Route
            path="/"
            element={(
              <div className="card">
                <ListPlayableClass />
                <TalentTreeIndex />
              </div>
            )}
          />
          <Route path="/spec/:specId" element={<SpecPage />} />
        </Routes>
      </main>
    </>
  )
}
