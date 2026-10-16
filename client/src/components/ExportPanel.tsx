import { useRef, useState, type FormEvent } from 'react'
import { decodeBuild } from '../lib/exportString'
import type { Build } from '../lib/talents'
import type { SpecTalentData } from '../lib/types'

interface Props {
  code: string
  data: SpecTalentData
  onImport: (build: Build) => void
}

export default function ExportPanel({ code, data, onImport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      inputRef.current?.select()
      document.execCommand('copy')
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const submitImport = (event: FormEvent) => {
    event.preventDefault()
    try {
      onImport(decodeBuild(data, importText))
      setImportText('')
      setImportError(null)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="export-panel">
      <div className="export-row">
        <label htmlFor="export-code">Chaîne d'export</label>
        <input id="export-code" ref={inputRef} readOnly value={code} onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn btn-primary" onClick={copy}>
          {copied ? '✓ Copié' : 'Copier'}
        </button>
      </div>
      <p className="export-help">
        En jeu : fenêtre des talents → menu des configurations → <em>Importer</em>, puis colle la chaîne.
      </p>

      <details className="import">
        <summary>Importer une chaîne existante</summary>
        <form className="export-row" onSubmit={submitImport}>
          <input
            aria-label="Chaîne à importer"
            placeholder="Colle une chaîne de talents…"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <button type="submit" className="btn" disabled={!importText.trim()}>
            Importer
          </button>
        </form>
        {importError && <p className="status-error">{importError}</p>}
      </details>
    </div>
  )
}
