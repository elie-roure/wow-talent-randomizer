import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import styles from './SpecPage.module.css';



export default function SpecPage() {
    const { specId } = useParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [spec, setSpec] = useState<any | null>(null);
    const [restriction_lines_class_tree, setRestrictionLinesClassTree] = useState<any | null>(null);

    //talent choice
    const [showPopup, setShowPopup] = useState(false);
    const [popupPosition, setPopupPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [talentNodeSelected, setTalentNodeSelected] = useState<any | null>(null);
    const resolveTalentChoice = useRef<(talentId: number) => void>(null);


    //talent tree class
    const [classTree, setClassTree] = useState<any | null>(null);
    const [talentRanks, setTalentRanks] = useState<Map<number, number>>(new Map());
    const [activeTalentNodeIds, setActiveTalentNodeIds] = useState<Set<number>>(new Set());
    const [selectableTalentNodeIds, setSelectableTalentNodeIds] = useState<Set<number>>(new Set());
    const [activeTalentIds, setActiveTalentIds] = useState<Map<number, number>>(new Map());

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
                        setSelectableTalentNodeIds(new Set(firstRowIds));


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

    const getActiveTalentsNode = (updatedRanks: Map<number, number>) => {
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


    const waitForTalentChoice = (talents: any[]): Promise<number> => {
        return new Promise((resolve) => {
            setTalentNodeSelected({ ranks: [{ talents }] });
            setShowPopup(true);

            // On stocke le resolve dans un ref pour l'appeler plus tard
            resolveTalentChoice.current = resolve;
        });
    };

    const handleTalentClick = async (
        event: React.MouseEvent<HTMLDivElement>,
        talent: any
    ) => {
        if (!talent || !selectableTalentNodeIds.has(talent.id)) return;

        const currentRank = talentRanks.get(talent.id) ?? 0;
        if (currentRank >= talent.ranks.length) return;

        let selectedTalentId: number;

        //selection du choix si besoin
        if (talent.type === "CHOICE") {
            setTalentNodeSelected(talent);
            setPopupPosition({ x: event.clientX, y: event.clientY });
            setShowPopup(true);
            selectedTalentId = await waitForTalentChoice(talent.ranks[0].talents);
        } else {
            selectedTalentId = talent.ranks[0].talents[0].talentId;
        }

        //Met a jour le rank du talent node
        const updatedRanks = new Map(talentRanks);
        updatedRanks.set(talent.id, currentRank + 1);
        setTalentRanks(updatedRanks);

        //Met a jour le rank du talent
        activeTalentIds.set(selectedTalentId, currentRank + 1);

        // Met à jour les talents node actifs
        const updatedActive = getActiveTalentsNode(updatedRanks);
        setActiveTalentNodeIds(updatedActive);

        // Recalcule les talents sélectionnables
        const newSelectable = getSelectableTalents(updatedActive, updatedRanks);
        setSelectableTalentNodeIds(newSelectable);
    };




    const handleTalentContextMenu = (talent: any) => {
        if (!talent || !activeTalentNodeIds.has(talent.id)) return;

        //check si des talents dépendent de ce talent
        const dependentActiveTalents = talent.unlocks.filter((id: number) => activeTalentNodeIds.has(id));

        const canRemove = dependentActiveTalents.every((id: number) => {
            const dependentActiveTalent = classTree.find((t: any) => t.id === id);
            const unlockBy = dependentActiveTalent?.lockedBy ?? [];

            // Vérifie s'il existe un autre talent actif qui débloque ce talent
            const isUnlockedByOther = Array.from(activeTalentNodeIds).some(
                (activeId: number) => {

                    let otherCanUnlock = unlockBy.includes(activeId) && activeId !== talent.id;
                    if (!otherCanUnlock) return false;

                    //check si dans les talents qui peuvent le debloquer ils sont au rank max
                    let activeTalent = classTree.filter((t: any) => t.id == activeId)[0];
                    const currentRank = talentRanks.get(activeId) ?? 0;
                    if (currentRank < activeTalent.ranks.length) return false;

                    return true;
                }
            );

            return isUnlockedByOther;
        });

        if (!canRemove) return;

        setTalentRanks(prevRanks => {
            const updatedRanks = new Map(prevRanks);
            const currentRank = updatedRanks.get(talent.id) ?? 0;

            // Vérifie si le rang minimum est atteint
            if (currentRank == 0) return prevRanks;

            // Décrémente le rang du talent node
            updatedRanks.set(talent.id, currentRank - 1);

            //Met a jour le rank du talent
            let selectedTalentId: number = 0;
            if (talent.type === "CHOICE") {
                talent.ranks[0].talents.forEach((talent: any) => {
                    if (activeTalentIds.has(talent.talentId) && (activeTalentIds.get(talent.talentId) ?? 0) > 0) selectedTalentId = talent.talentId;
                })
            } else {
                selectedTalentId = talent.ranks[0].talents[0].talentId;
            }
            activeTalentIds.set(selectedTalentId, currentRank - 1);

            // Met à jour les talents node actifs
            const updatedActive = getActiveTalentsNode(updatedRanks);
            setActiveTalentNodeIds(updatedActive);


            // Recalcule les talents sélectionnables
            const newSelectable = getSelectableTalents(updatedActive, updatedRanks);
            setSelectableTalentNodeIds(newSelectable);


            return updatedRanks;
        });
    };




    const renderTalentCell = (talent: any) => {
        if (!talent) return <h5>-</h5>;

        const currentRank = talentRanks.get(talent.id) ?? 0;
        const rankSelected = talent.ranks[Math.min(currentRank, talent.ranks.length - 1)];

        return (
            <>
                {rankSelected.talents.map((talentSelect: any) => {

                    {
                        const current = activeTalentIds.get(talentSelect.talentId) ?? 0;
                        return (
                            <div key={talentSelect.talentId} >
                                <h5>{talentSelect.talentName ?? JSON.stringify(talentSelect)}</h5>
                                <span>{current} / {talent.ranks.length}</span>
                            </div >
                        )
                    }
                })
                }
            </>
        );
    };

    const renderTalentTable = (talentTree : any) => {
        if (!talentTree || !Array.isArray(talentTree))
            return <div>No talent tree index available.</div>;

        const maxRow = Math.max(...talentTree.filter(t => (t.lockedBy || t.unlocks)).map(t => t.displayRow));
        const maxCol = Math.max(...talentTree.filter(t => (t.lockedBy || t.unlocks)).map(t => t.displayCol));
        return (
            <table>
                <tbody>
                    {Array.from({ length: maxRow }).map((_, rowIndex) => {
                        const displayRowTalents = rowIndex + 1;
                        const rowKey = `row-${displayRowTalents}`;
                        return (
                            <>
                                {/* check si il y a des talents dans la ligne */}
                                {talentTree.find(t => t.displayRow === displayRowTalents && (t.lockedBy || t.unlocks)) && (
                                    <tr key={rowKey} id={rowKey}>
                                        {Array.from({ length: maxCol }).map((_, colIndex) => {
                                            const displayColTalents = colIndex + 1;
                                            const talent = talentTree.find(
                                                t => t.displayRow === displayRowTalents && t.displayCol === displayColTalents
                                            );
                                            const talentUnlocks = talent?.unlocks ?? "";
                                            const isActive = activeTalentNodeIds.has(talent?.id);
                                            const isSelectable = selectableTalentNodeIds.has(talent?.id);


                                            const colKey = rowKey + `-col-${displayColTalents}`
                                            return (
                                                <>
                                                    {talent ? (
                                                        <td key={colKey} data-key={colKey} id={talent?.id} data-current-rank={talentRanks.get(talent.id) ?? 0} data-max-rank={talent.ranks.length} data-unlock={JSON.stringify(talentUnlocks)}
                                                            className={
                                                                isActive ? styles.active : isSelectable ? styles.selectable : styles.inactive
                                                            }
                                                            onClick={(event) => handleTalentClick(event, talent)}
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
                        <>

                            <div>
                                <h2>{spec.name?.['fr_FR'] ?? spec.name ?? `Spec ${specId}`}</h2>
                                {spec.media && <img src={spec.media} alt={spec.name} style={{ width: 64 }} />}
                                {spec.className && <div>Classe: {spec.className}</div>}

                                <h3 style={{ marginTop: 16 }}>Talent Class trees </h3>
                                {renderTalentTable(classTree)}
                            </div>
                            
                            <div>
                                <h2>{spec.name?.['fr_FR'] ?? spec.name ?? `Spec ${specId}`}</h2>
                                {spec.media && <img src={spec.media} alt={spec.name} style={{ width: 64 }} />}
                                {spec.className && <div>Classe: {spec.className}</div>}

                                <h3 style={{ marginTop: 16 }}>Talent Spec trees</h3>
                                {renderTalentTable(classTree)}
                            </div>
                        </>
                    ) : (
                        <div>Spécialisation introuvable (id {specId})</div>
                    )}

                    {showPopup && (
                        <div className={styles.popupBlur} onClick={() => setShowPopup(false)}>
                            <div className={styles.popupChoice}
                                style={{ top: popupPosition.y, left: popupPosition.x }}
                                onClick={(e) => e.stopPropagation()} // empêche la fermeture si on clique dans la popup
                            >
                                {
                                    talentNodeSelected.ranks[0].talents.map((talentSelect: any) => {
                                        return (
                                            <div key={'choice_' + talentSelect.talentId} onClick={() => {
                                                setShowPopup(false);
                                                resolveTalentChoice.current?.(talentSelect.talentId);
                                            }}>
                                                <h5>{talentSelect.talentName ?? JSON.stringify(talentSelect)}</h5>
                                            </div >
                                        )
                                    })
                                }
                            </div>
                        </div>


                    )}


                </div>
            )}

            <style>{`
            

      `}</style>
        </div>
    );

}
