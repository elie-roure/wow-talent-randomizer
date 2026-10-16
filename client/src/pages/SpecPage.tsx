import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { fetchMeta, fetchSpecTalents, useAsync } from '../api'
import TalentTreeView from '../components/TalentTreeView'
import ExportPanel from '../components/ExportPanel'
import SpecSwitcher from '../components/SpecSwitcher'
import { classColor, ROLE_LABELS } from '../lib/classColors'
import { decodeBuild, encodeBuild } from '../lib/exportString'
import {
  emptyBuild,
  getTrees,
  randomizeBuild,
  randomizeTree,
  resetTree,
  switchHeroTree,
  type Build,
  type Tree,
} from '../lib/talents'
import type { SpecTalentData } from '../lib/types'

export default function SpecPage() {
  const specId = Number(useParams().specId)
  const { data, error, loading } = useAsync(() => fetchSpecTalents(specId), [specId])

  return (
    <>
      <SpecSwitcher specId={specId} />
      {loading ? (
        <p className="status">Chargement des talents…</p>
      ) : error || !data ? (
        <p className="status status-error">Impossible de charger les talents : {error}</p>
      ) : (
        <SpecEditor key={data.specId} data={data} />
      )}
    </>
  )
}

/** Warns when Blizzard serves a different patch than the one the rules were calibrated for. */
function VersionNotice({ liveVersion }: { liveVersion: string | null }) {
  const { data: meta } = useAsync(fetchMeta, [])
  if (!meta || !liveVersion || liveVersion === meta.supportedVersion.patch) return null
  return (
    <p className="version-notice" role="status">
      ⚠️ Les données Blizzard sont en patch {liveVersion}, mais le randomizer a été calibré pour le patch{' '}
      {meta.supportedVersion.patch}. Les builds restent cohérents avec l'arbre affiché, mais les budgets de points ou les
      nœuds accordés ont pu changer.
    </p>
  )
}

function initialBuild(data: SpecTalentData, code: string | null): Build {
  if (code) {
    try {
      return decodeBuild(data, code)
    } catch {
      // Invalid shared link: fall back to a fresh random build.
    }
  }
  return randomizeBuild(data)
}

function SpecEditor({ data }: { data: SpecTalentData }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [build, setBuild] = useState(() => initialBuild(data, searchParams.get('build')))
  const [heroChoice, setHeroChoice] = useState<'random' | number>('random')

  const code = useMemo(() => encodeBuild(data, build), [data, build])
  const trees = useMemo(() => getTrees(data, build.heroTreeId), [data, build.heroTreeId])

  useEffect(() => {
    setSearchParams({ build: code }, { replace: true })
  }, [code, setSearchParams])

  const randomizeAll = () =>
    setBuild(randomizeBuild(data, { heroTreeId: heroChoice === 'random' ? null : heroChoice }))

  const heroTree = data.heroTrees.find((h) => h.id === build.heroTreeId)

  const treeActions = (tree: Tree) => (
    <span className="tree-actions">
      <button
        type="button"
        className="icon-btn"
        title="Relancer cet arbre"
        onClick={() => setBuild(randomizeTree(build, tree))}
      >
        🎲
      </button>
      <button type="button" className="icon-btn" title="Vider cet arbre" onClick={() => setBuild(resetTree(build, tree))}>
        ✕
      </button>
    </span>
  )

  const [classTree, specTree, heroTreeView] = trees

  return (
    <div className="spec-page" style={{ '--class-color': classColor(data.classId) } as CSSProperties}>
      <div className="spec-head">
        <div className="spec-identity">
          {data.specIcon && <img src={data.specIcon} alt="" className="spec-identity-icon" />}
          <div>
            <h1>
              {data.specName} <span className="spec-identity-class">{data.className}</span>
            </h1>
            <p className="spec-identity-meta">
              {ROLE_LABELS[data.role] ?? data.role}
              {data.gameVersion && ` · Données Blizzard : patch ${data.gameVersion}`}
            </p>
          </div>
        </div>

        <div className="toolbar">
          <button type="button" className="btn btn-primary btn-large" onClick={randomizeAll}>
            🎲 Générer un build
          </button>
          <label className="field">
            <span>Héros</span>
            <select
              value={heroChoice}
              onChange={(e) => setHeroChoice(e.target.value === 'random' ? 'random' : Number(e.target.value))}
            >
              <option value="random">Au hasard</option>
              {data.heroTrees.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn" onClick={() => setBuild(emptyBuild(build.heroTreeId))}>
            Tout effacer
          </button>
        </div>
      </div>

      <VersionNotice liveVersion={data.gameVersion} />
      <ExportPanel code={code} data={data} onImport={setBuild} />

      <div className="trees">
        <TalentTreeView
          title={data.className}
          icon={data.classIcon}
          tree={classTree}
          build={build}
          onChange={setBuild}
          actions={treeActions(classTree)}
        />
        <section className="hero-column">
          <div className="hero-tabs" role="tablist">
            {data.heroTrees.map((h) => (
              <button
                key={h.id}
                type="button"
                role="tab"
                aria-selected={h.id === build.heroTreeId}
                className={`hero-tab ${h.id === build.heroTreeId ? 'is-active' : ''}`}
                onClick={() => h.id !== build.heroTreeId && setBuild(switchHeroTree(build, data, h.id))}
              >
                {h.icon && <img src={h.icon} alt="" />}
                {h.name}
              </button>
            ))}
          </div>
          {heroTreeView && heroTree ? (
            <TalentTreeView
              title={heroTree.name}
              icon={heroTree.icon}
              tree={heroTreeView}
              build={build}
              onChange={setBuild}
              actions={treeActions(heroTreeView)}
            />
          ) : (
            <p className="status">Choisis un arbre de héros.</p>
          )}
        </section>
        <TalentTreeView
          title={data.specName}
          icon={data.specIcon}
          tree={specTree}
          build={build}
          onChange={setBuild}
          actions={treeActions(specTree)}
        />
      </div>

      <p className="help">
        Clic gauche pour ajouter un point, clic droit pour le retirer. Le lien de la page contient le build : partage-le tel
        quel.
      </p>
    </div>
  )
}
