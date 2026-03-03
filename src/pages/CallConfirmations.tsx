import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, X, Save, Phone, AlertCircle } from 'lucide-react';

interface CallRow {
    rowIndex: number;
    farmacia: string;
    data: string;
    orario: string;
    paziente: string;
    telefono: string;
    note: string;
    status: 'attesa' | 'confermato' | 'annullato';
}

export function CallConfirmations() {
    const [searchParams] = useSearchParams();
    const dateParam = searchParams.get('date') || '';

    const [calls, setCalls] = useState<CallRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        if (!dateParam) {
            setError('Data non specificata.');
            setLoading(false);
            return;
        }

        const fetchCalls = async () => {
            try {
                const res = await fetch(`/api/calls-for-date?date=${dateParam}`);
                const data = await res.json();
                if (data.success) {
                    setCalls(data.data);
                } else {
                    setError('Errore API: ' + data.error);
                }
            } catch (err: any) {
                setError('Impossibile connettersi al Server: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchCalls();
    }, [dateParam]);

    const handleStatusChange = (rowIndex: number, newStatus: 'attesa' | 'confermato' | 'annullato') => {
        setCalls(prev => prev.map(c => c.rowIndex === rowIndex ? { ...c, status: newStatus } : c));
        // Se c'era un messaggio di successo, lo resettiamo perché ci sono modifiche non salvate
        setSuccessMsg('');
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSuccessMsg('');

        // Prendiamo solo le chiamate in cui lo stato non è 'attesa'
        // E per sicrezza prenderemo tutti quelli valorizzati
        const updates = calls
            .filter(c => c.status === 'confermato' || c.status === 'annullato')
            .map(c => ({
                rowIndex: c.rowIndex,
                newStatus: c.status,
                originalNotes: c.note
            }));

        if (updates.length === 0) {
            setError('Nessuna chiamata confermata o annullata da salvare.');
            setSaving(false);
            return;
        }

        try {
            const res = await fetch('/api/update-call-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates })
            });
            const data = await res.json();

            if (data.success) {
                setSuccessMsg(`Salvataggio cloud completato! ${data.updatedRows} pazienti aggiornati.`);
            } else {
                setError('Errore salvataggio: ' + data.error);
            }
        } catch (err: any) {
            setError("Impossibile contattare il server: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Caricamento appuntamenti dal Cloud...</div>;

    if (!dateParam) return <div style={{ padding: '3rem', textAlign: 'center', color: 'red' }}>Errore: Nessun parametro data specificato nell'URL.</div>;

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>Cruscotto Chiamate</h1>
                <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
                    Promemoria per gli appuntamenti del: <strong>{new Date(dateParam).toLocaleDateString('it-IT')}</strong>
                </p>
            </div>

            {error && (
                <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={20} /> {error}
                </div>
            )}

            {successMsg && (
                <div style={{ background: '#f0fdf4', color: '#15803d', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Check size={20} /> {successMsg}
                </div>
            )}

            {calls.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                    Nessun appuntamento trovato per questa Data nel Foglio Google.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {calls.map(call => (
                        <div key={call.rowIndex} style={{
                            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
                            background: '#fff', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            borderLeft: `4px solid ${call.status === 'confermato' ? '#10b981' :
                                call.status === 'annullato' ? '#ef4444' : '#cbd5e1'
                                }`,
                            transition: 'all 0.2s'
                        }}>

                            <div style={{ flex: '1 1 300px', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <span style={{ background: '#e2e8f0', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                        {call.orario}
                                    </span>
                                    <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                                        {call.farmacia}
                                    </span>
                                </div>
                                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: '#1e293b' }}>
                                    {call.paziente}
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.9rem' }}>
                                    <Phone size={14} /> {call.telefono || 'Nessun Telefono'}
                                </div>
                                {call.note && (
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                        "{call.note}"
                                    </div>
                                )}
                            </div>

                            {/* Azioni */}
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => handleStatusChange(call.rowIndex, 'confermato')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                                        padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #10b981',
                                        background: call.status === 'confermato' ? '#10b981' : 'transparent',
                                        color: call.status === 'confermato' ? '#fff' : '#10b981',
                                        cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s'
                                    }}
                                >
                                    <Check size={16} /> Confermato
                                </button>

                                <button
                                    onClick={() => handleStatusChange(call.rowIndex, 'annullato')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                                        padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #ef4444',
                                        background: call.status === 'annullato' ? '#ef4444' : 'transparent',
                                        color: call.status === 'annullato' ? '#fff' : '#ef4444',
                                        cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s'
                                    }}
                                >
                                    <X size={16} /> Annullato
                                </button>
                            </div>

                        </div>
                    ))}
                </div>
            )}

            {/* Sticky Save Bar */}
            {calls.length > 0 && (
                <div style={{
                    position: 'sticky', bottom: '2rem', marginTop: '3rem',
                    background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)',
                    padding: '1.5rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0'
                }}>
                    <div>
                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
                            Confermati: {calls.filter(c => c.status === 'confermato').length} |
                            Annullati: {calls.filter(c => c.status === 'annullato').length}
                        </span>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none',
                            background: '#4f46e5', color: '#fff', fontSize: '1rem', fontWeight: 600,
                            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1
                        }}
                    >
                        <Save size={18} />
                        {saving ? 'Scrittura su Sheets...' : 'Salva Modifiche al Cloud'}
                    </button>
                </div>
            )}
        </div>
    );
}
