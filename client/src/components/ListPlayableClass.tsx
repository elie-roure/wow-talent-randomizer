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
      const res = await fetch('/data/wow/playable-class/index')
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
        {loading ? 'Loading...' : 'Load Playable Class Index'}
      </button>

      {error && <div style={{ marginTop: 12, color: 'crimson' }}>Error: {error}</div>}

      {data && (
        <div style={{ marginTop: 12, textAlign: 'left' }}>
          <h3>Playable Class Index</h3>
          {Array.isArray(data) ? (
            <ul>
              {data.map((c: any) => (
                <li key={c.id} class-id={c.id}>
                  {c.name?.['fr_FR'] ?? c.name ?? JSON.stringify(c)}
                  <img src={c.media} alt={c.name?.['fr_FR'] ?? c.name} style={{ width: 32, height: 32, marginLeft: 8, verticalAlign: 'middle' }} />
                  <ul>
                    {Array.isArray(c.specializations)
                      ? c.specializations.map((s: any) => (
                          <li key={s.id} spec-id={s.id}>
                            {s.name?.['fr_FR'] ?? s.name ?? JSON.stringify(s)}
                            <img src={s.media} alt={s.name?.['fr_FR'] ?? s.name} style={{ width: 32, height: 32, marginLeft: 8, verticalAlign: 'middle' }} />
                          </li>
                        ))
                      : null}
                  </ul>
                </li>
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
