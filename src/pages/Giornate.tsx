import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, MapPin, Phone, Check, X, Clock, User, ArrowLeft, CalendarDays, MessageSquare } from 'lucide-react';

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
    assegnatoA?: string;
}

export function Giornate() {
    // Formattiamo la data per rendere il confronto più facile
    const formatDateForSort = (dateString: string) => {
        if (!dateString) return '9999-12-31';
        if (dateString.includes('/')) {
            const parts = dateString.split('/');
            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateString;
    };

    const [appointments, setAppointments] = useState<CallRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Level 2 View State
    const [selectedPharmacyView, setSelectedPharmacyView] = useState<{ farmacia: string, dataTarget: string } | null>(null);

    // Modal State - Esito
    const [selectedAptForOutcome, setSelectedAptForOutcome] = useState<CallRow | null>(null);
    const [outcomeForm, setOutcomeForm] = useState({ esitoVisita: '', venduto: '', followUp: false, dataRivisita: '', assegnatoA: 'Mauro' });
    const [savingOutcome, setSavingOutcome] = useState(false);

    // Modal State - Suggestions (Smart Fill)
    const [suggestedModalOpen, setSuggestedModalOpen] = useState(false);
    const [suggestedTargetFarmacia, setSuggestedTargetFarmacia] = useState('');
    const [suggestedPatients, setSuggestedPatients] = useState<any[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    useEffect(() => {
        const fetchAppointments = async () => {
            setLoading(true);
            setError('');
            try {
                // Fetching all future appointments
                const res = await fetch(`/api/calls-for-date?date=all`);
                const data = await res.json();
                if (data.success) {
                    setAppointments(data.data);
                } else {
                    const detailMsg = data.details ? ` (${data.details})` : '';
                    setError('Errore API: ' + data.error + detailMsg);
                }
            } catch (err: any) {
                setError('Impossibile connettersi al Server: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAppointments();
    }, []);

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
                    dataRivisita: outcomeForm.dataRivisita,
                    assegnatoA: outcomeForm.assegnatoA
                })
            });
            const data = await res.json();
            if (data.success) {
                // Aggiorna UI locale
                setAppointments(prev => prev.map(a => {
                    if (a.rowIndex === selectedAptForOutcome.rowIndex) {
                        return {
                            ...a,
                            esitoVisita: outcomeForm.esitoVisita,
                            venduto: outcomeForm.venduto,
                            followUp: outcomeForm.followUp ? 'Sì' : 'No',
                            dataRivisita: outcomeForm.dataRivisita,
                            assegnatoA: outcomeForm.assegnatoA
                        };
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

    // LOGICA LIVELLO 1: AGGREGAZIONE GRIGLIA
    const getGridCards = () => {
        const farmacieMap: Record<string, { appts: CallRow[], dates: Set<string> }> = {};

        appointments.forEach(a => {
            const fName = a.farmacia || 'Sconosciuta';
            if (!farmacieMap[fName]) farmacieMap[fName] = { appts: [], dates: new Set() };
            farmacieMap[fName].appts.push(a);
            farmacieMap[fName].dates.add(formatDateForSort(a.data));
        });

        // Per ogni farmacia, trova la data MIN (più vicina)
        const cards = Object.keys(farmacieMap).map(fName => {
            const fData = farmacieMap[fName];

            // Ordiniamo le date per trovare la prima
            const sortedDates = Array.from(fData.dates).sort((a, b) => a.localeCompare(b));
            const nextDateSortable = sortedDates[0];

            // Troviamo l'appuntamento reale per formattare la data originale se necessario 
            // ma useremo semplicemente il primo appuntamento utile di quel giorno per estrarre la label
            const firstApptOfNextDate = fData.appts.find(a => formatDateForSort(a.data) === nextDateSortable);

            return {
                farmacia: fName,
                nextDateStr: firstApptOfNextDate?.data || nextDateSortable, // Fallback a formato YYYY-MM-DD se null
                nextDateSortable: nextDateSortable,
                totalFutureDates: sortedDates.length,
                totalApptsNextDate: fData.appts.filter(a => formatDateForSort(a.data) === nextDateSortable).length
            };
        });

        // Ordina le cards in base alla data del prossimo appuntamento
        cards.sort((a, b) => a.nextDateSortable.localeCompare(b.nextDateSortable));

        return cards;
    };


    const AppCard = ({ appt }: { appt: CallRow }) => {
        let statusBadge = null;
        if (appt.status === 'confermato') {
            statusBadge = <span style={{ background: '#dcfce7', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Check size={12} /> Confermato</span>;
        } else if (appt.status === 'annullato') {
            statusBadge = <span style={{ background: '#fee2e2', color: '#991b1b', padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><X size={12} /> Annullato</span>;
        } else {
            statusBadge = <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> Attesa</span>;
        }

        const assignToBadge = (appt.assegnatoA === 'Marisa') ?
            <span style={{ background: '#fce7f3', color: '#be185d', padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #fbcfe8' }}><User size={12} /> {appt.assegnatoA}</span>
            :
            <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #bae6fd' }}><User size={12} /> {appt.assegnatoA || 'Mauro'}</span>;

        const handleSendSMS = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (!appt.telefono || appt.telefono.trim().length < 5) {
                alert("Nessun numero di telefono valido disponibile per questo paziente.");
                return;
            }
            const cleanPhone = appt.telefono.replace(/[^\d+]/g, '');
            const formLink = import.meta.env.VITE_GOOGLE_FORM_LINK || "https://forms.gle/VQvv5aaQ351pxmCB6";
            const message = `Gentile ${appt.paziente}, ci piacerebbe conoscere la sua opinione sul test uditivo effettuato presso la nostra farmacia. Lasci una breve recensione al link per aiutarci a crescere. È un contributo completamente anonimo. ${formLink}`;
            const encodedMessage = encodeURIComponent(message);
            window.location.href = `sms:${cleanPhone}?body=${encodedMessage}`;
        };

        return (
            <div
                style={{
                    background: '#fff', padding: '1.25rem', borderRadius: '12px', borderLeft: '5px solid #cbd5e1',
                    borderLeftColor: appt.status === 'confermato' ? '#10b981' : appt.status === 'annullato' ? '#ef4444' : '#f59e0b',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                    marginBottom: '1rem', cursor: 'pointer', transition: 'all 0.2s ease-in-out'
                }}
                className="hover-card"
                onClick={() => {
                    setSelectedAptForOutcome(appt);
                    setOutcomeForm({
                        esitoVisita: appt.esitoVisita || '',
                        venduto: appt.venduto || '',
                        followUp: appt.followUp === 'Sì',
                        dataRivisita: appt.dataRivisita || '',
                        assegnatoA: appt.assegnatoA || 'Mauro'
                    });
                }}
            >
                <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 'bold', color: '#0f172a', background: '#f1f5f9', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.95rem', border: '1px solid #e2e8f0' }}>
                                <Clock size={14} style={{ marginRight: '6px', verticalAlign: 'text-bottom', color: '#64748b' }} />
                                {appt.orario}
                            </span>
                            <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b' }}>{appt.paziente}</h4>
                            {statusBadge}
                            {assignToBadge}
                        </div>
                        {appt.esitoVisita && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#1d4ed8', background: '#dbeafe', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}>ESITO COMPILATO</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                            {appt.telefono && <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#334155', fontWeight: 500 }}><Phone size={14} color="#94a3b8" /> {appt.telefono}</span>}
                            {appt.note && <span style={{ fontStyle: 'italic', background: '#f8fafc', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>Note: {appt.note}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            {appt.esitoVisita && appt.status !== 'annullato' && (
                                <button
                                    onClick={handleSendSMS}
                                    style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(22, 163, 74, 0.1)' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#dcfce7'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#f0fdf4'; }}
                                >
                                    <MessageSquare size={14} /> Chiedi Recensione
                                </button>
                            )}
                            {appt.status === 'annullato' && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); fetchSuggestions(appt.farmacia); }}
                                    style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(220, 38, 38, 0.1)' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                                >
                                    🚀 Trova Sostituto
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };


    const renderLevel1Grid = () => {
        const cards = getGridCards();

        if (cards.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '5rem', background: '#f8fafc', borderRadius: '16px', color: '#64748b', border: '2px dashed #cbd5e1' }}>
                    <CalendarDays size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                    <h3>Nido vuoto!</h3>
                    <p>Nessuna farmacia ha appuntamenti pianificati nel futuro.</p>
                </div>
            );
        }

        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {cards.map((card, idx) => (
                    <button
                        key={idx}
                        className="hover-card"
                        onClick={() => setSelectedPharmacyView({ farmacia: card.farmacia, dataTarget: card.nextDateStr })}
                        style={{
                            background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', textAlign: 'left',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', cursor: 'pointer',
                            display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
                        }}
                    >
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#3b82f6' }}></div>

                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem', display: 'block' }}>FARMACIA</span>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', lineHeight: '1.2' }}>{card.farmacia.toUpperCase()}</h3>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                <CalendarIcon size={14} /> Prossima Data
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                                {card.nextDateStr}
                            </div>
                            <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                {card.totalApptsNextDate} {card.totalApptsNextDate === 1 ? 'appuntamento' : 'appuntamenti'}
                            </div>
                        </div>

                        {card.totalFutureDates > 1 && (
                            <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#f1f5f9', padding: '0.5rem', borderRadius: '8px' }}>
                                <CalendarDays size={14} color="#94a3b8" />
                                <span>+ {card.totalFutureDates - 1} {card.totalFutureDates - 1 === 1 ? 'altra giornata' : 'altre giornate'} in programma</span>
                            </div>
                        )}
                    </button>
                ))}
            </div>
        );
    };

    const renderLevel2Detail = () => {
        if (!selectedPharmacyView) return null;

        // Filtra solo gli appuntamenti di QUEL giorno PER QUELLA farmacia
        const dayAppts = appointments.filter(a =>
            (a.farmacia || 'Sconosciuta') === selectedPharmacyView.farmacia &&
            a.data === selectedPharmacyView.dataTarget
        );

        // Ordina cronologicamente le ore
        dayAppts.sort((a, b) => {
            const aTime = a.orario ? a.orario.replace(',', ':') : '00:00';
            const bTime = b.orario ? b.orario.replace(',', ':') : '00:00';
            return aTime.localeCompare(bTime);
        });

        // Controlla se ha altre giornate in generale
        const allApptsForPharmacy = appointments.filter(a => (a.farmacia || 'Sconosciuta') === selectedPharmacyView.farmacia);
        const uniqueDates = new Set(allApptsForPharmacy.map(a => a.data));
        const hasOtherDates = uniqueDates.size > 1;

        return (
            <div className="fade-in-up">
                <button
                    onClick={() => setSelectedPharmacyView(null)}
                    style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '2rem', padding: '0.5rem 0', transition: 'color 0.2s' }}
                    className="hover-opacity"
                >
                    <ArrowLeft size={18} /> Torna all'elenco Farmacie
                </button>

                <div style={{ background: '#fff', borderRadius: '24px', padding: '2rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '2px dashed #e2e8f0' }}>
                        <div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#eff6ff', color: '#2563eb', padding: '0.4rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                                <MapPin size={14} /> {selectedPharmacyView.farmacia.toUpperCase()}
                            </div>
                            <h2 style={{ fontSize: '2rem', color: '#0f172a', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <CalendarIcon size={28} color="#94a3b8" />
                                {selectedPharmacyView.dataTarget}
                            </h2>
                            <p style={{ color: '#64748b', fontSize: '1.05rem', margin: 0 }}>
                                {dayAppts.length} {dayAppts.length === 1 ? 'visita in programma' : 'visite in programma'} per questa singola giornata.
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-end' }}>
                            <button
                                onClick={() => fetchSuggestions(selectedPharmacyView.farmacia)}
                                style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px rgba(59, 130, 246, 0.25)', transition: 'transform 0.1s, box-shadow 0.1s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(59, 130, 246, 0.3)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.25)'; }}
                            >
                                <Phone size={18} /> Pazienti da ricontattare
                            </button>

                            {hasOtherDates && (
                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <CalendarDays size={16} /> Nota: questa farmacia ha {uniqueDates.size - 1} {uniqueDates.size - 1 === 1 ? 'altra data' : 'altre date'} in database.
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {dayAppts.map(a => <AppCard key={a.rowIndex} appt={a} />)}

                        {dayAppts.length === 0 && (
                            <p style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', padding: '2rem' }}>Nessun appuntamento trovato per questa configurazione.</p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="page-container" style={{ paddingBottom: '4rem' }}>
            <div className="header-actions" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1>{selectedPharmacyView ? `Dettaglio Giornata` : `Giornate`}</h1>
                    <p>{selectedPharmacyView ? `Gestisci gli appuntamenti della giornata selezionata.` : `Lista delle prossime farmacie in visita.`}</p>
                </div>
            </div>

            {loading && <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b', fontSize: '1.1rem' }}><div className="spinner" style={{ marginBottom: '1rem' }}></div> Elaborazione Appuntamenti...</div>}

            {error && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #fecaca' }}>{error}</div>}

            {!loading && !error && (
                <>
                    {selectedPharmacyView ? renderLevel2Detail() : renderLevel1Grid()}
                </>
            )}

            {/* MODAL ESITO VISITA */}
            {selectedAptForOutcome && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', width: '90%', maxWidth: '600px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    App. di: {selectedAptForOutcome.paziente}
                                </h3>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}><b>{selectedAptForOutcome.farmacia}</b> • {selectedAptForOutcome.data} alle {selectedAptForOutcome.orario}</p>
                            </div>
                            <button onClick={() => setSelectedAptForOutcome(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* NEW: Assegnato A */}
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>Gestito da</label>
                                <select
                                    className="input-field"
                                    value={outcomeForm.assegnatoA}
                                    onChange={e => setOutcomeForm({ ...outcomeForm, assegnatoA: e.target.value })}
                                >
                                    <option value="Mauro">Mauro</option>
                                    <option value="Marisa">Marisa</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>Esito / Note Mediche</label>
                                <textarea
                                    className="input-field"
                                    rows={3}
                                    placeholder="Annotazioni della visita..."
                                    value={outcomeForm.esitoVisita}
                                    onChange={e => setOutcomeForm({ ...outcomeForm, esitoVisita: e.target.value })}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '1rem' }}>
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
                                        <option value="No-Show">No-Show (Assente)</option>
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
                                {savingOutcome ? 'Salvataggio...' : 'Salva Modifiche'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL SUGGERIMENTI FOLLOW-UP (SMART FILL) */}
            {suggestedModalOpen && (
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
                                    <Phone size={22} color="#3b82f6" /> Lista Attesa / Sostituti (Anti-Buco)
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
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>{p.paziente}</h4>
                                                {p.suggestionReason && (
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0369a1', background: '#e0f2fe', padding: '0.2rem 0.6rem', borderRadius: '2rem', border: '1px solid #bae6fd' }}>
                                                        {p.suggestionReason}
                                                    </span>
                                                )}
                                            </div>

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
            )}
        </div >
    );
}
