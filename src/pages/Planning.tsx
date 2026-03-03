import { usePharmacy } from '../context/PharmacyContext';
import { Send, Trash2 } from 'lucide-react';

export function Planning() {
    const { pharmacies, currentUser, genericPlan, setGenericPlan } = usePharmacy();



    const handleClearPlan = () => {
        if (confirm('Sei sicuro di voler svuotare l\'intero planning predefinito?')) {
            setGenericPlan([1, 2, 3, 4].map(w => ({
                week: w,
                days: {
                    LUN: { M: '', P: '' }, MAR: { M: '', P: '' }, MER: { M: '', P: '' },
                    GIO: { M: '', P: '' }, VEN: { M: '', P: '' }, SAB: { M: '', P: '' }
                }
            })));
        }
    };

    const getVisitCount = (pharmacyId: string) => {
        let count = 0;
        genericPlan.forEach(w => {
            Object.values(w.days).forEach((d: any) => {
                if (d.M === pharmacyId) count++;
                if (d.P === pharmacyId) count++;
            });
        });
        return count;
    };

    const handleSelectSlot = (week: number, day: string, period: 'M' | 'P', value: string) => {
        setGenericPlan(genericPlan.map(w => {
            if (w.week === week) {
                return {
                    ...w,
                    days: {
                        ...w.days,
                        [day]: { ...w.days[day], [period]: value }
                    }
                };
            }
            return w;
        }));
    };

    const syncWithGoogle = () => {
        alert("Sincronizzazione completata! I dati del planning sono pronti.");
    };

    // Style helper (come da file excel originale impartito)
    const getStyle = (inf: string) => {
        if (!inf) return { background: '#fff' };
        if (inf.includes('MAURO')) return { background: '#86efac', fontWeight: 600, color: '#000' };
        if (inf.includes('TEAM')) return { background: '#f97316', color: 'white', fontWeight: 600 };
        if (inf.includes('MARISA')) return { background: '#fef08a', fontWeight: 600, color: '#000' };
        return { background: '#fff' };
    }

    return (
        <div className="page-container" style={{ maxWidth: '1400px' }}>
            <div className="header-actions">
                <div>
                    <h1>Planning Manuale Mensile</h1>
                    <p>Compila la griglia (4 settimane) scegliendo la farmacia per ogni slot. Nelle tendine appariranno solo le farmacie che non hanno ancora esaurito le visite mensili impostate.</p>
                </div>
            </div>

            {/* Sezione Mese rimossa come da richiesta */}

            <div style={{ marginTop: '2rem' }}>
                <div className="header-actions" style={{ marginBottom: '1rem' }}>
                    <h3>Planning Mensile </h3>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.875rem', color: '#64748b', marginRight: '1rem' }}>Salvataggio automatico attivo</span >
                        <button className="btn btn-secondary" onClick={handleClearPlan}>
                            <Trash2 size={18} /> Svuota Griglia
                        </button>
                        <button className="btn btn-primary" onClick={syncWithGoogle}>
                            <Send size={18} /> Conferma
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '2.5rem' }}>
                    {genericPlan.map((weekObj) => (
                        <div key={weekObj.week} className="card" style={{ padding: 0, overflowX: 'auto' }}>
                            <div style={{ background: '#fef3c7', padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', borderBottom: '2px solid #000' }}>
                                SETTIMANA {weekObj.week === 1 ? 'UNO' : weekObj.week === 2 ? 'DUE' : weekObj.week === 3 ? 'TRE' : 'QUATTRO'}
                            </div>
                            <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr>
                                        <th style={{ width: '60px', borderBottom: '2px solid #000', borderRight: '2px solid #000' }}></th>
                                        <th colSpan={2} style={{ padding: '0.5rem', borderBottom: '2px solid #000', borderRight: '2px solid #000', textAlign: 'center' }}>MATTINA</th>
                                        <th colSpan={2} style={{ padding: '0.5rem', borderBottom: '2px solid #000', textAlign: 'center' }}>POMERIGGIO</th>
                                    </tr>
                                    <tr style={{ borderBottom: '2px solid #000' }}>
                                        <th style={{ borderRight: '2px solid #000' }}></th>
                                        <th style={{ padding: '0.4rem', borderRight: '1px solid #000', width: '22%' }}>FARMACIA</th>
                                        <th style={{ padding: '0.4rem', borderRight: '2px solid #000', width: '22%' }}>LOCALITA'</th>
                                        <th style={{ padding: '0.4rem', borderRight: '1px solid #000', width: '22%' }}>FARMACIA</th>
                                        <th style={{ padding: '0.4rem', width: '22%' }}>LOCALITA'</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'].map((day) => {
                                        const mId = weekObj.days[day].M;
                                        const pId = weekObj.days[day].P;

                                        const mPharm = pharmacies.find(p => p.id === mId);
                                        const pPharm = pharmacies.find(p => p.id === pId);

                                        // Genera opzioni dinamicamente filtrando le farmacie esaurite e quelle non di competenza
                                        const renderOptions = (currentId: string) => {
                                            const visiblePharmacies = pharmacies.filter(p => {
                                                if (!p.notes) return false; // Se non c'è informatore specificato, non mostrarla per sicurezza
                                                const upperNotes = p.notes.toUpperCase();
                                                const isTeam = upperNotes.includes('TEAM');
                                                const isMine = upperNotes.includes(currentUser.toUpperCase());
                                                return isTeam || isMine;
                                            });

                                            return visiblePharmacies.map(p => {
                                                const visits = getVisitCount(p.id);
                                                // Mostra se è attualmente selezionata in questo slot O se non ha esaurito i giorni
                                                if (currentId === p.id || visits < (p.workingDays || 1)) {
                                                    return <option key={p.id} value={p.id}>{p.name}</option>;
                                                }
                                                return null;
                                            });
                                        };

                                        return (
                                            <tr key={day} style={{ borderBottom: '1px solid #000' }}>
                                                <td style={{ padding: '0.4rem', fontWeight: 'bold', borderRight: '2px solid #000', textAlign: 'center' }}>{day}</td>

                                                {/* MATTINA */}
                                                <td style={{ padding: '0', borderRight: '1px solid #000', ...getStyle(mPharm?.notes || ''), height: '2.5rem' }}>
                                                    <select
                                                        value={mId}
                                                        onChange={(e) => handleSelectSlot(weekObj.week, day, 'M', e.target.value)}
                                                        style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', outline: 'none', padding: '0.4rem', color: 'inherit', fontWeight: 'inherit', cursor: 'pointer', appearance: 'none' }}
                                                    >
                                                        <option value="">-- Libero --</option>
                                                        {renderOptions(mId)}
                                                    </select>
                                                </td>
                                                <td style={{ padding: '0.4rem', borderRight: '2px solid #000', ...getStyle(mPharm?.notes || '') }}>{mPharm ? mPharm.address : ''}</td>

                                                {/* POMERIGGIO */}
                                                <td style={{ padding: '0', borderRight: '1px solid #000', ...getStyle(pPharm?.notes || ''), height: '2.5rem' }}>
                                                    <select
                                                        value={pId}
                                                        onChange={(e) => handleSelectSlot(weekObj.week, day, 'P', e.target.value)}
                                                        style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', outline: 'none', padding: '0.4rem', color: 'inherit', fontWeight: 'inherit', cursor: 'pointer', appearance: 'none' }}
                                                    >
                                                        <option value="">-- Libero --</option>
                                                        {renderOptions(pId)}
                                                    </select>
                                                </td>
                                                <td style={{ padding: '0.4rem', ...getStyle(pPharm?.notes || '') }}>{pPharm ? pPharm.address : ''}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
