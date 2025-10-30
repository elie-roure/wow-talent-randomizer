import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

export default function SpecPage() {
    const { specId } = useParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [spec, setSpec] = useState<any | null>(null);
    const [restriction_lines_class_tree, setRestrictionLinesClassTree] = useState<any | null>(null);

    //talent tree class
    const [classTree, setClassTree] = useState<any | null>(null);
    const [talentRanks, setTalentRanks] = useState<Map<number, number>>(new Map());
    const [activeTalentIds, setActiveTalentIds] = useState<Set<number>>(new Set());
    const [selectableTalentIds, setSelectableTalentIds] = useState<Set<number>>(new Set());

    //talent tree spec
    const [specTree, setSpecTree] = useState<any | null>(null);


    //recuperer les talents tree
    useEffect(() => {
        async function load() {
            if (!specId) return
            setLoading(true)
            setError(null)
            try {
                // Load playable classes to find the specialization object
                const res = await fetch('/data/wow/playable-class/index')
                if (!res.ok) throw new Error(`Server returned ${res.status}`)
                const classes = await res.json()
                let found: any | null = null
                for (const c of classes) {
                    if (Array.isArray(c.specializations)) {
                        const match = c.specializations.find((s: any) => String(s.id) === String(specId))
                        if (match) {
                            found = { ...match, className: c.name?.['fr_FR'] ?? c.name }
                            break
                        }
                    }
                }
                setSpec(found)

                // Attempt to load talent trees for this spec using the new server endpoint.
                // If the server route is not present (404 or non-ok), fall back to the general index.
                try {
                    const bySpecRes = await fetch(`/data/wow/talent-tree/spec/${specId}`)
                    if (bySpecRes.ok) {
                        const bySpecJson = await bySpecRes.json()
                        
                        setClassTree(bySpecJson.talentNodesClass)
                        setSpecTree(bySpecJson.talentNodesSpec)
                        setRestrictionLinesClassTree(bySpecJson.restrictionsLineClass);

                        //Initialiser les talents de la première ligne comme sélectionnables
                        const firstRow = Math.min(...bySpecJson.talentNodesClass.map((t: any) => t.displayRow));
                        const firstRowIds = bySpecJson.talentNodesClass
                            .filter((t: any) => t.displayRow === firstRow)
                            .map((t: any) => t.id);
                        setSelectableTalentIds(new Set(firstRowIds));


                    } else {
                        // fallback to general index
                        const tres = await fetch('/data/wow/talent-tree/index')
                        if (!tres.ok) throw new Error(`Server returned ${tres.status}`)
                        const tjson = await tres.json()
                    }
                } catch (innerErr) {
                    // network or other error when fetching by-spec; fallback to index
                    const tres = await fetch('/data/wow/talent-tree/index')
                    if (tres.ok) {
                        const tjson = await tres.json()
                    } else {
                        throw innerErr
                    }
                }
            } catch (err: any) {
                setError(err?.message || String(err))
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [specId])

    const getActiveTalents = (updatedRanks: Map<number, number>) => {
        const updatedActive = new Set<number>();
        updatedRanks.forEach((rank, id) => {
            if (rank > 0) updatedActive.add(id);
        });
        return updatedActive;
    };


    const getSelectableTalents = (updatedActive: Set<number>, updatedRanks: Map<number, number>) => {
        const newSelectable = new Set<number>();

        // Toujours garder la première ligne sélectionnable
        const firstRow = Math.min(
            ...classTree
                .map((t: any) => t.displayRow)
        );
        classTree
            .filter((t: any) => t.displayRow === firstRow)
            .forEach((t: any) => newSelectable.add(t.id));


        // Ajouter les talents débloqués par les talents actifs
        updatedActive.forEach(activeId => {
            const activeTalent = classTree.find((t: any) => t.id === activeId);
            if (!activeTalent) return;

            //check si le rank du talent est au max
            const currentRank = updatedRanks.get(activeId) ?? 0;
            if (currentRank < activeTalent.ranks.length) return;

            // Parcourir les talents débloqués
            activeTalent?.unlocks?.forEach((id: number) => {
                const unlockedTalent = classTree.find((t: any) => t.id === id);
                if (!unlockedTalent) return;
                const talentPointSpent = Array.from(updatedRanks.values()).reduce((a, b) => a + b, 0);
                const isBlocked = restriction_lines_class_tree.some((restriction: any) =>
                    unlockedTalent.displayRow >= restriction.restrictedRow &&
                    talentPointSpent < restriction.requiredPoints
                );

                if (!isBlocked) {
                    newSelectable.add(id);
                }
            });
        });
        return newSelectable;
    }

    const handleTalentClick = (talent: any) => {
        if (!talent || !selectableTalentIds.has(talent.id)) return;

        setTalentRanks(prevRanks => {
            const updatedRanks = new Map(prevRanks);
            const currentRank = updatedRanks.get(talent.id) ?? 0;

            // Vérifie si le rang maximum est atteint
            if (currentRank >= talent.ranks.length) return prevRanks;

            // Incrémente le rang du talent
            updatedRanks.set(talent.id, currentRank + 1);

            // Met à jour les talents actifs
            const updatedActive = getActiveTalents(updatedRanks);
            setActiveTalentIds(updatedActive);

            // Recalcule les talents sélectionnables
            const newSelectable = getSelectableTalents(updatedActive, updatedRanks);
            setSelectableTalentIds(newSelectable);

            return updatedRanks;
        });
    };

    const handleTalentContextMenu = (talent: any) => {
        if (!talent || !activeTalentIds.has(talent.id)) return;

        //check si des talents dépendent de ce talent
        const dependentTalents = activeTalentIds.has(talent.unlocks[0]);

        // On regroupe tout dans une mise à jour synchronisée
        setTalentRanks(prevRanks => {
            const updatedRanks = new Map(prevRanks);
            const currentRank = updatedRanks.get(talent.id) ?? 0;

            // Vérifie si le rang minimum est atteint
            if (currentRank == 0) return prevRanks;

            // Décrémente le rang du talent
            updatedRanks.set(talent.id, currentRank - 1);

            // Met à jour les talents actifs
            const updatedActive = getActiveTalents(updatedRanks);
            setActiveTalentIds(updatedActive);

            // Recalcule les talents sélectionnables
            const newSelectable = getSelectableTalents(updatedActive, updatedRanks);
            setSelectableTalentIds(newSelectable);

            return updatedRanks;
        });
    };

    const renderTalentCell = (talent: any) => {
        if (!talent) return <h5>-</h5>;

        const currentRank = talentRanks.get(talent.id) ?? 0;
        const rankSelected = talent.ranks[Math.min(currentRank, talent.ranks.length - 1)];

        if (rankSelected.tooltip) {
            return (
                <>
                    <h5>{rankSelected.tooltip.talent.name ?? JSON.stringify(talent)}</h5>
                    <span>{currentRank} / {talent.ranks.length}</span>
                </>
            );
        }

        if (rankSelected.choice_of_tooltips) {
            return (
                <>
                    {rankSelected.choice_of_tooltips.map((tooltip: any) => (
                        <div key={tooltip.talent.id}>
                            <h5>{tooltip.talent.name ?? JSON.stringify(talent)}</h5>
                            <span>{currentRank} / {talent.ranks.length}</span>
                        </div>
                    ))}
                </>
            );
        }


        return <h5>-</h5>;
    };





    const renderTalentTable = () => {
        if (!classTree || !Array.isArray(classTree))
            return <div>No talent tree index available.</div>;

        const maxRow = Math.max(...classTree.filter(t => (t.lockedBy || t.unlocks)).map(t => t.displayRow));
        const maxCol = Math.max(...classTree.filter(t => (t.lockedBy || t.unlocks)).map(t => t.displayCol));
        return (
            <table>
                <tbody>
                    {Array.from({ length: maxRow }).map((_, rowIndex) => {
                        const displayRowTalents = rowIndex + 1;
                        const rowKey = `row-${displayRowTalents}`;
                        return (
                            <>
                                {/* check si il y a des talents dans la ligne */}
                                {classTree.find(t => t.displayRow === displayRowTalents && (t.lockedBy || t.unlocks)) && (
                                    <tr key={rowKey} id={rowKey}>
                                        {Array.from({ length: maxCol }).map((_, colIndex) => {
                                            const displayColTalents = colIndex + 1;
                                            const talent = classTree.find(
                                                t => t.displayRow === displayRowTalents && t.displayCol === displayColTalents
                                            );
                                            const talentUnlocks = talent?.unlocks ?? "";
                                            const isActive = activeTalentIds.has(talent?.id);
                                            const isSelectable = selectableTalentIds.has(talent?.id);


                                            const colKey = rowKey + `-col-${displayColTalents}`
                                            return (
                                                <>
                                                    {talent ? (
                                                        <td key={colKey} data-key={colKey} id={talent?.id} data-current-rank={talentRanks.get(talent.id) ?? 0} data-max-rank={talent.ranks.length} data-unlock={JSON.stringify(talentUnlocks)}
                                                            className={
                                                                isActive ? 'active' : isSelectable ? 'selectable' : 'inactive'
                                                            }
                                                            onClick={() => handleTalentClick(talent)}
                                                            onContextMenu={(event) => {
                                                                event.preventDefault();
                                                                handleTalentContextMenu(talent);
                                                            }}>
                                                            {renderTalentCell(talent)}
                                                        </td >
                                                    ) : (
                                                        <td key={colKey} data-key={colKey}></td>
                                                    )}
                                                </>
                                            )
                                        })}
                                    </tr >
                                )}

                            </>
                        );
                    })}
                </tbody>
            </table >
        );

    };
    return (
        <div style={{ marginTop: 16 }}>
            <p>
                <Link to="/">← Retour</Link>
            </p>
            {loading && <div>Loading...</div>}
            {error && <div style={{ color: 'crimson' }}>Error: {error}</div>}

            {!loading && !error && (
                <div>
                    {spec ? (
                        <div>
                            <h2>{spec.name?.['fr_FR'] ?? spec.name ?? `Spec ${specId}`}</h2>
                            {spec.media && <img src={spec.media} alt={spec.name} style={{ width: 64 }} />}
                            {spec.className && <div>Classe: {spec.className}</div>}

                            <h3 style={{ marginTop: 16 }}>Talent trees (index)</h3>
                            {renderTalentTable()}
                        </div>
                    ) : (
                        <div>Spécialisation introuvable (id {specId})</div>
                    )}
                </div>
            )}

            <style>{`
        td {
          border: 1px solid;
          padding: 8px;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }
        td.inactive {
          opacity: 0.2;
          pointer-events: none;
        }
        td.selectable {
          opacity: 1;
          background-color: lightblue;
          color: black;
        }
        td.active {
          background-color: green;
          font-weight: bold;
        }

      `}</style>
        </div>
    );

}
