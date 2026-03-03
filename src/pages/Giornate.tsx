import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, MapPin, Phone, Check, X, Clock, Sun, Moon } from 'lucide-react';
// import { usePharmacy } from '../context/PharmacyContext';

interface CallRow {
    rowIndex: number;
    farmacia: string;
    data: string;
    orario: string;
    paziente: string;
    telefono: string;
    note: string;
    status: 'attesa' | 'confermato' | 'annullato';
    esitoVisita?: string;
    venduto?: string;
    followUp?: string;
    dataRivisita?: string;
}

const AM_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30'];
const PM_SLOTS = ['15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'];

export function Giornate() {
    // Di default mostriamo la data di oggi
    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(todayStr);

    const [appointments, setAppointments] = useState<CallRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Modal State - Esito
    const [selectedAptForOutcome, setSelectedAptForOutcome] = useState<CallRow | null>(null);
    const [outcomeForm, setOutcomeForm] = useState({ esitoVisita: '', venduto: '', followUp: false, dataRivisita: '' });
    const [savingOutcome, setSavingOutcome] = useState(false);

    // Modal State - Suggestions (Smart Fill)
    const [suggestedModalOpen, setSuggestedModalOpen] = useState(false);
    const [suggestedTargetFarmacia, setSuggestedTargetFarmacia] = useState('');
    const [suggestedPatients, setSuggestedPatients] = useState<any[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    useEffect(() => {
        const fetchAppointments = async () => {
            if (!selectedDate) return;
            setLoading(true);
            setError('');
            try {
                // Utilizza il fighissimo endpoint riusato
                const res = await fetch(`/api/calls-for-date?date=${selectedDate}`);
                const data = await res.json();
                if (data.success) {
                    setAppointments(data.data);
                } else {
                    setError('Errore API: ' + data.error);
                }
            } catch (err: any) {
                setError('Impossibile connettersi al Server: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAppointments();
    }, [selectedDate]);

    const handleSaveOutcome = async () => {
        if (!selectedAptForOutcome) return;
        setSavingOutcome(true);
        try {
            const res = await fetch('/api/update-visit-outcome', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rowIndex: selectedAptForOutcome.rowIndex,
                    esitoVisita: outcomeForm.esitoVisita,
                    venduto: outcomeForm.venduto,
                    followUp: outcomeForm.followUp,
                    dataRivisita: outcomeForm.dataRivisita
                })
            });
            const data = await res.json();
            if (data.success) {
                // Aggiorna UI locale
                setAppointments(prev => prev.map(a => {
                    if (a.rowIndex === selectedAptForOutcome.rowIndex) {
                        return { ...a, esitoVisita: outcomeForm.esitoVisita, venduto: outcomeForm.venduto, followUp: outcomeForm.followUp ? 'Sì' : 'No', dataRivisita: outcomeForm.dataRivisita };
                    }
                    return a;
                }));
                setSelectedAptForOutcome(null);
            } else {
                alert('Errore salvataggio esito: ' + data.error);
            }
        } catch (e: any) {
            alert('Errore rete: ' + e.message);
        } finally {
            setSavingOutcome(false);
        }
    };

    const fetchSuggestions = async (farmaciaName: string) => {
        setSuggestedTargetFarmacia(farmaciaName);
        setSuggestedModalOpen(true);
        setLoadingSuggestions(true);
        try {
            const res = await fetch('/api/follow-ups?farmacia=' + encodeURIComponent(farmaciaName));
            const data = await res.json();
            if (data.success) {
                setSuggestedPatients(data.data);
            } else {
                alert('Errore API: ' + data.error);
            }
        } catch (e: any) {
            alert('Errore rete: ' + e.message);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    // Parsing Orari per smistare in MACRO AREE (Mattina vs Pomeriggio)
    // Assumiamo che l'orario sia nel formato "HH:MM" o "HH,MM"
    const isMorning = (timeStr: string) => {
        if (!timeStr) return true; // fallback
        const cleanStr = timeStr.replace(',', ':');
        const parts = cleanStr.split(':');
        if (parts.length > 0) {
            const hour = parseInt(parts[0].trim(), 10);
            if (!isNaN(hour) && hour < 13) return true;
        }
        return false;
    };

    const amAppts = appointments.filter(a => isMorning(a.orario));
    const pmAppts = appointments.filter(a => !isMorning(a.orario));

    const amStats = {
        attesa: amAppts.filter(a => a.status === 'attesa').length,
        confermato: amAppts.filter(a => a.status === 'confermato').length,
        annullato: amAppts.filter(a => a.status === 'annullato').length,
    };

    const pmStats = {
        attesa: pmAppts.filter(a => a.status === 'attesa').length,
        confermato: pmAppts.filter(a => a.status === 'confermato').length,
        annullato: pmAppts.filter(a => a.status === 'annullato').length,
    };

    // Raggruppa per farmacia internamente a un blocco
    const groupByPharmacy = (appts: CallRow[]) => {
        const grouped: Record<string, CallRow[]> = {};
        appts.forEach(a => {
            const fName = a.farmacia || 'Sconosciuta';
            if (!grouped[fName]) grouped[fName] = [];
            grouped[fName].push(a);
        });

        // Ordina orari cronologicamente
        Object.keys(grouped).forEach(k => {
            grouped[k].sort((x, y) => x.orario.localeCompare(y.orario));
        });
        return grouped;
    };

    const groupedAM = groupByPharmacy(amAppts);
    const groupedPM = groupByPharmacy(pmAppts);

    // Componente riga Appuntamento singolo
    const AppCard = ({ appt }: { appt: CallRow }) => {
        let statusBadge = null;
        if (appt.status === 'confermato') {
            statusBadge = <span style={{ background: '#dcfce7', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Check size={12} /> Confermato</span>;
        } else if (appt.status === 'annullato') {
            statusBadge = <span style={{ background: '#fee2e2', color: '#991b1b', padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><X size={12} /> Annullato</span>;
        } else {
            statusBadge = <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> Attesa</span>;
        }

        return (
            <div
                style={{
                    background: '#fff', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #cbd5e1',
                    borderLeftColor: appt.status === 'confermato' ? '#10b981' : appt.status === 'annullato' ? '#ef4444' : '#f59e0b',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    marginBottom: '0.5rem', cursor: 'pointer', transition: 'box-shadow 0.2s'
                }}
                className="hover-card"
                onClick={() => {
                    setSelectedAptForOutcome(appt);
                    setOutcomeForm({
                        esitoVisita: appt.esitoVisita || '',
                        venduto: appt.venduto || '',
                        followUp: appt.followUp === 'Sì',
                        dataRivisita: appt.dataRivisita || ''
                    });
                }}
            >
                <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontWeight: 'bold', color: '#0f172a', background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>{appt.orario}</span>
                            <h4 style={{ margin: 0, fontSize: '1rem', color: '#334155' }}>{appt.paziente}</h4>
                            {statusBadge}
                        </div>
                        {appt.esitoVisita && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#3b82f6', background: '#eff6ff', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #bfdbfe' }}>ESITO COMPILATO</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={14} /> {appt.telefono || '-'}</span>
                        {appt.note && <span style={{ fontStyle: 'italic' }}>Note: {appt.note}</span>}
                    </div>
                </div>
            </div>
        );
    };

    const FreeSlotCard = ({ time }: { time: string }) => (
        <div style={{
            background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px dashed #cbd5e1',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontWeight: 'bold', color: '#94a3b8', background: '#e2e8f0', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.9rem' }}>{time}</span>
                <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.9rem' }}>SLOT LIBERO</span>
            </div>
        </div>
    );

    const renderPharmacyBlock = (farmaciaName: string, appts: CallRow[], standardSlots: string[]) => {
        // Raccogliamo tutti gli orari (sia quelli standard sia quelli anomali presenti negli appuntamenti)
        const allTimes = Array.from(new Set([...standardSlots, ...appts.map(a => a.orario)])).sort((a, b) => a.localeCompare(b));

        // Determiniamo se c'è almeno uno slot libero in questa farmacia
        const hasFreeSlots = allTimes.some(time => {
            const apptsAtTime = appts.filter(a => a.orario === time);
            if (apptsAtTime.length === 0) return true;
            return apptsAtTime.filter(a => a.status !== 'annullato').length === 0;
        });

        return (
            <div key={farmaciaName} style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6', fontSize: '1.1rem' }}>
                        <MapPin size={18} /> {farmaciaName.toUpperCase()}
                    </h3>

                    {hasFreeSlots && (
                        <button
                            onClick={() => fetchSuggestions(farmaciaName)}
                            style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)' }}
                        >
                            <Phone size={16} /> Lista Pazienti per Inserimenti
                        </button>
                    )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    {allTimes.map(time => {
                        // Troviamo gli appuntamenti per questo orario
                        const apptsAtTime = appts.filter(a => a.orario === time);

                        if (apptsAtTime.length === 0) {
                            // Nessun appuntamento -> Slot Libero
                            return <FreeSlotCard key={`free-${time}`} time={time} />;
                        }

                        // Se ci sono appuntamenti, li renderizziamo.
                        // Ma se sono SOLO annullati, renderizziamo uno Slot Libero (il requisito chiede di liberare lo slot annullato).
                        // Se c'è almeno un "confermato" o "attesa", mostriamo le AppCard normali.
                        const activeAppts = apptsAtTime.filter(a => a.status !== 'annullato');

                        if (activeAppts.length === 0) {
                            // Tutti gli appuntamenti a questo orario sono annullati -> Libera lo slot
                            return <FreeSlotCard key={`free-cancelled-${time}`} time={time} />;
                        }

                        // Altrimenti mostriamo gli appuntamenti attivi
                        return activeAppts.map(a => <AppCard key={a.rowIndex} appt={a} />);
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="page-container">
            <div className="header-actions" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1>Giornate (Riepilogo Visite)</h1>
                    <p>Pianifica la giornata e controlla lo status chiamate dei pazienti.</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <CalendarIcon size={18} color="#64748b" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{ border: 'none', outline: 'none', color: '#334155', fontWeight: 600, background: 'transparent' }}
                        />
                    </div>
                    <button className="btn btn-secondary" onClick={() => setSelectedDate(todayStr)}>Oggi</button>
                </div>
            </div>

            {loading && <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Caricamento Appuntamenti dal Cloud...</div>}

            {error && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}

            {!loading && appointments.length === 0 && !error && (
                <div style={{ textAlign: 'center', padding: '4rem', background: '#f8fafc', borderRadius: '12px', color: '#64748b', border: '1px dashed #cbd5e1' }}>
                    Nessun appuntamento in programma per questa data.
                </div>
            )}

            {!loading && appointments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* SEZIONE MATTINA */}
                    <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid #cbd5e1', paddingBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Sun size={28} color="#f59e0b" />
                                <h2 style={{ margin: 0, color: '#0f172a' }}>MATTINA <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'normal' }}>(08:00 - 13:00)</span></h2>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem' }}>
                                <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.3rem 0.75rem', borderRadius: '2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> In attesa: {amStats.attesa}</span>
                                <span style={{ background: '#dcfce7', color: '#166534', padding: '0.3rem 0.75rem', borderRadius: '2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Check size={14} /> Confermati: {amStats.confermato}</span>
                                <span style={{ background: '#fee2e2', color: '#991b1b', padding: '0.3rem 0.75rem', borderRadius: '2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><X size={14} /> Annullati: {amStats.annullato}</span>
                            </div>
                        </div>

                        {amAppts.length === 0 ? (
                            <p style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>Nessuna visita la mattina.</p>
                        ) : (
                            Object.entries(groupedAM).map(([farmaciaName, appts]) =>
                                renderPharmacyBlock(farmaciaName, appts, AM_SLOTS)
                            )
                        )}
                    </div>

                    {/* SEZIONE POMERIGGIO */}
                    <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid #cbd5e1', paddingBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Moon size={28} color="#4f46e5" />
                                <h2 style={{ margin: 0, color: '#0f172a' }}>POMERIGGIO <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'normal' }}>(13:00 - 20:00)</span></h2>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem' }}>
                                <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.3rem 0.75rem', borderRadius: '2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> In attesa: {pmStats.attesa}</span>
                                <span style={{ background: '#dcfce7', color: '#166534', padding: '0.3rem 0.75rem', borderRadius: '2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Check size={14} /> Confermati: {pmStats.confermato}</span>
                                <span style={{ background: '#fee2e2', color: '#991b1b', padding: '0.3rem 0.75rem', borderRadius: '2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><X size={14} /> Annullati: {pmStats.annullato}</span>
                            </div>
                        </div>

                        {pmAppts.length === 0 ? (
                            <p style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>Nessuna visita il pomeriggio.</p>
                        ) : (
                            Object.entries(groupedPM).map(([farmaciaName, appts]) =>
                                renderPharmacyBlock(farmaciaName, appts, PM_SLOTS)
                            )
                        )}
                    </div>

                </div>
            )}

            {/* MODAL ESITO VISITA */}
            {selectedAptForOutcome && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', width: '90%', maxWidth: '600px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    Esito Visita: {selectedAptForOutcome.paziente}
                                </h3>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>{selectedAptForOutcome.farmacia} - {selectedAptForOutcome.orario}</p>
                            </div>
                            <button onClick={() => setSelectedAptForOutcome(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>Esito / Note Mediche</label>
                                <textarea
                                    className="input-field"
                                    rows={4}
                                    placeholder="Scrivi qui i dettagli della visita..."
                                    value={outcomeForm.esitoVisita}
                                    onChange={e => setOutcomeForm({ ...outcomeForm, esitoVisita: e.target.value })}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>Venduto / Chiusura</label>
                                    <select
                                        className="input-field"
                                        value={outcomeForm.venduto}
                                        onChange={e => setOutcomeForm({ ...outcomeForm, venduto: e.target.value })}
                                    >
                                        <option value="">-- Seleziona --</option>
                                        <option value="Sì">Sì, Venduto</option>
                                        <option value="No">No, Non Venduto</option>
                                        <option value="In Valutazione">In Valutazione</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ display: 'block', fontWeight: 600, color: '#334155' }}>Follow Up Richiesto</label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={outcomeForm.followUp}
                                            onChange={e => setOutcomeForm({ ...outcomeForm, followUp: e.target.checked })}
                                            style={{ width: '1.2rem', height: '1.2rem', accentColor: '#3b82f6' }}
                                        />
                                        <span style={{ color: '#475569' }}>Da ricontattare</span>
                                    </label>
                                </div>
                            </div>

                            {outcomeForm.followUp && (
                                <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#1d4ed8' }}>Data Proposta Rivisita</label>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={outcomeForm.dataRivisita}
                                        onChange={e => setOutcomeForm({ ...outcomeForm, dataRivisita: e.target.value })}
                                        style={{ borderColor: '#93c5fd' }}
                                    />
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                            <button className="btn btn-secondary" onClick={() => setSelectedAptForOutcome(null)} disabled={savingOutcome}>
                                Annulla
                            </button>
                            <button className="btn btn-primary" onClick={handleSaveOutcome} disabled={savingOutcome}>
                                {savingOutcome ? 'Salvataggio...' : 'Salva Esito Visita'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL SUGGERIMENTI FOLLOW-UP (SMART FILL) */}
            {
                suggestedModalOpen && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000,
                        paddingTop: '3rem', paddingBottom: '3rem', overflowY: 'auto'
                    }}>
                        <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '2rem', width: '95%', maxWidth: '700px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 0.25rem 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Phone size={22} color="#3b82f6" /> Suggerimenti Follow-up
                                    </h3>
                                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Pazienti di <strong>{suggestedTargetFarmacia.toUpperCase()}</strong> da ricontattare.</p>
                                </div>
                                <button onClick={() => setSuggestedModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.5rem' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            {loadingSuggestions ? (
                                <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
                                    Cerco pazienti da ricontattare in database...
                                </div>
                            ) : suggestedPatients.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8', fontStyle: 'italic', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                    Nessun paziente in lista d'attesa o da rivedere per questa farmacia.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {suggestedPatients.map((p, idx) => (
                                        <div key={idx} style={{ background: '#fff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: '#1e293b' }}>{p.paziente}</h4>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                                                    <Phone size={14} color="#64748b" /> {p.telefono}
                                                </div>

                                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                                    {p.dataRivisita && <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Rivisita attesa: {p.dataRivisita}</span>}
                                                    <span>Ultima visita: {p.data}</span>
                                                </div>
                                                {p.esitoVisita && (
                                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', fontStyle: 'italic', background: '#f8fafc', padding: '0.5rem', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>
                                                        "{p.esitoVisita}"
                                                    </p>
                                                )}
                                            </div>
                                            <a
                                                href={`tel:${p.telefono.replace(/\s+/g, '')}`}
                                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#22c55e', color: '#fff', padding: '0.6rem 1rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 4px 6px -1px rgba(34, 197, 94, 0.2)' }}
                                            >
                                                <Phone size={16} /> Chiama Subito
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
        </div >
    );
}

