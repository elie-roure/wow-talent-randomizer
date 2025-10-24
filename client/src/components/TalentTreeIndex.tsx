import { useState } from 'react'

export default function TalentTreeIndex() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)

  async function load() {
    setError(null)
    setLoading(true)
    setData(null)
    try {
      const res = await fetch('/data/wow/talent-tree/index')
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <button onClick={load} disabled={loading}>
        {loading ? 'Loading...' : 'Load Talent Tree Index'}
      </button>

      {error && <div style={{ marginTop: 12, color: 'crimson' }}>Error: {error}</div>}

      {data && (
        <div style={{ marginTop: 12, textAlign: 'left' }}>
          <h3>Talent Tree Index</h3>
          {Array.isArray(data.talent_trees) ? (
            <ul>
              {data.talent_trees.map((t: any) => (
                <li key={t.key ?? t.id}>{t.name?.['en_US'] ?? t.name ?? JSON.stringify(t)}</li>
              ))}
            </ul>
          ) : (
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(data, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  )
}
