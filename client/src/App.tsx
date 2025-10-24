import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import TalentTreeIndex from './components/TalentTreeIndex'
import ListPlayableClass from './components/ListPlayableClass'
function App() {
  const [count, setCount] = useState(0)
  // keep a simple counter in App; fetching is handled by TalentTreeIndex component

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>

      <div className="card">
        <button onClick={() => setCount((c) => c + 1)}>count is {count}</button>

        <TalentTreeIndex />
        <ListPlayableClass />

        <p style={{ marginTop: 12 }}>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>

      <p className="read-the-docs">Click on the Vite and React logos to learn more</p>
    </>
  )
}

export default App
