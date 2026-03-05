import { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { FileSpreadsheet, Plus, Download, Users, Check, Clock, CalendarCheck2, Printer, X, Mail } from 'lucide-react';
import type { Appointment } from '../types/pharmacy';

export function Appointments() {
    const { pharmacies, currentUser, genericPlan, calendarOverrides, appointments, setAppointments, googleToken } = usePharmacy();
    const [isAdding, setIsAdding] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [showCallList, setShowCallList] = useState(false);
    const [callListDate, setCallListDate] = useState('');
    const [sendingEmail, setSendingEmail] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        birthDate: '',
        phone: '',
        notes: '',
        status: 'In attesa' as const,
    });

    const [selectedPharmacyId, setSelectedPharmacyId] = useState('');
    const [selectedDateStr, setSelectedDateStr] = useState('');
    const [selectedTimeSlot, setSelectedTimeSlot] = useState('');

    const getAvailableDates = (pharmId: string) => {
        if (!pharmId) return [];
        const available = [];
        const today = new Date();
        const daysMap = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];

        for (let i = 0; i < 60; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() + i);
            const dateStr = checkDate.toISOString().split('T')[0];
            const dayOfMonth = checkDate.getDate();
            const weekdayCode = daysMap[checkDate.getDay()];

            let baseM = '';
            let baseP = '';

            if (dayOfMonth <= 28 && weekdayCode !== 'DOM') {
                const weekIndex = Math.floor((dayOfMonth - 1) / 7);
                const planForDay = genericPlan[weekIndex]?.days[weekdayCode as any];
                if (planForDay) {
                    baseM = planForDay.M;
                    baseP = planForDay.P;
                }
            }

            const override = calendarOverrides[dateStr];
            const finalM = override && override.M !== undefined ? override.M : baseM;
            const finalP = override && override.P !== undefined ? override.P : baseP;

            if (finalM === pharmId || finalP === pharmId) {
                available.push(dateStr);
            }
        }
        return available;
    };

    const getAvailableSlots = (pharmId: string, dateStr: string) => {
        if (!pharmId || !dateStr) return [];
        const dateObj = new Date(dateStr);
        const dayOfMonth = dateObj.getDate();
        const daysMap = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];
        const weekdayCode = daysMap[dateObj.getDay()];

        let baseM = '';
        let baseP = '';

        if (dayOfMonth <= 28 && weekdayCode !== 'DOM') {
            const weekIndex = Math.floor((dayOfMonth - 1) / 7);
            const planForDay = genericPlan[weekIndex]?.days[weekdayCode as any];
            if (planForDay) {
                baseM = planForDay.M;
                baseP = planForDay.P;
            }
        }

        const override = calendarOverrides[dateStr];
        const finalM = override && override.M !== undefined ? override.M : baseM;
        const finalP = override && override.P !== undefined ? override.P : baseP;

        const hasM = finalM === pharmId;
        const hasP = finalP === pharmId;

        const slots: string[] = [];
        if (hasM) {
            slots.push('09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30');
        }
        if (hasP) {
            slots.push('15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30');
        }
        return slots;
    };

    const checkDuplicate = (firstName: string, lastName: string, birthDate: string) => {
        return appointments.find(
            a => a.firstName.toLowerCase() === firstName.toLowerCase() &&
                a.lastName.toLowerCase() === lastName.toLowerCase() &&
                a.birthDate === birthDate
        );
    };

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        const duplicate = checkDuplicate(formData.firstName, formData.lastName, formData.birthDate);

        const newAppt: Appointment = {
            ...formData,
            pharmacyId: selectedPharmacyId,
            dateStr: selectedDateStr,
            timeSlot: selectedTimeSlot,
            id: crypto.randomUUID(),
            isDuplicate: !!duplicate,
            firstAppointmentDate: duplicate?.dateStr
        };

        setAppointments([...appointments, newAppt]);

        // Reset solo il form paziente per permettere di caricare altri slot
        setFormData({
            firstName: '', lastName: '', birthDate: '', phone: '', notes: '', status: 'In attesa'
        });
        setSelectedTimeSlot('');
    };

    const syncSheets = async () => {
        if (appointments.length === 0) {
            alert("Nessun appuntamento da sincronizzare.");
            return;
        }
        setSyncing(true);
        try {
            const syncPayload = appointments.map(a => ({
                ...a,
                pharmacyName: pharmacies.find(p => p.id === a.pharmacyId)?.name || ''
            }));

            const syncRes = await fetch('/api/sync-sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointments: syncPayload })
            });
            const syncData = await syncRes.json();

            if (syncData.success) {
                alert(`Sincronizzazione completata!\\n- Inseriti: ${syncData.inserted}\\n- Duplicati ignorati: ${syncData.duplicated}`);
            } else {
                const detailMsg = syncData.details ? ` (${syncData.details})` : '';
                alert("Errore durante la sincronizzazione su Google Fogli: " + syncData.error + detailMsg);
            }
        } catch (e) {
            console.error("Fetch Error syncing sheets:", e);
            alert("Errore di rete durante la sincronizzazione su Google Sheets.");
        } finally {
            setSyncing(false);
        }
    };

    const generateDailyList = () => {
        // Calcola la data "Oggi + 2 giorni"
        const target = new Date();
        target.setDate(target.getDate() + 2);
        const yyyy = target.getFullYear();
        const mm = String(target.getMonth() + 1).padStart(2, '0');
        const dd = String(target.getDate()).padStart(2, '0');
        setCallListDate(`${yyyy}-${mm}-${dd}`);
        setShowCallList(true);
    };

    // Raggruppa gli appuntamenti della Call List per Farmacia
    const getGroupedCallList = () => {
        const filtered = appointments.filter(a => a.dateStr === callListDate);
        const grouped: Record<string, Appointment[]> = {};

        filtered.forEach(apt => {
            if (!grouped[apt.pharmacyId]) {
                grouped[apt.pharmacyId] = [];
            }
            grouped[apt.pharmacyId].push(apt);
        });

        // Ordina gli appuntamenti cronologicamente in ogni farmacia
        Object.keys(grouped).forEach(k => {
            grouped[k].sort((a, b) => (a.timeSlot || '00:00').localeCompare(b.timeSlot || '00:00'));
        });

        return grouped;
    };

    const handleSendTestEmail = async () => {
        if (!googleToken) {
            alert("Devi effettuare l'accesso con Google prima di testare l'invio.");
            return;
        }
        setSendingEmail(true);
        try {
            const res = await fetch('/api/test-cron-email');
            const data = await res.json();
            if (data.detail && data.detail.skipped) {
                alert("Nessun appuntamento trovato per dopodomani nel Foglio Google. L'email è stata annullata perché non ci sono contatti da chiamare.");
            } else if (data.message) {
                alert("Email inviata con successo! Controlla la casella di Marisa.");
            } else {
                alert("Errore invio email: " + (data.error || "Sconosciuto") + (data.detail ? `\n\nDettaglio: ${data.detail}` : ""));
            }
        } catch (e) {
            console.error(e);
            alert("Errore di rete durante l'invio dell'email.");
        } finally {
            setSendingEmail(false);
        }
    };

    const visiblePharmacies = pharmacies.filter(p => {
        if (!p.notes) return true;
        const upperNotes = p.notes.toUpperCase();
        return upperNotes.includes('TEAM') || upperNotes.includes(currentUser.toUpperCase());
    });

    return (
        <div className="page-container">
            <div className="header-actions">
                <div>
                    <h1>Gestione Appuntamenti</h1>
                    <p>Registra pazienti, sincronizza con Sheets e genera la lista per le chiamate.</p>
                </div>
                {!isAdding && (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn btn-secondary" onClick={generateDailyList}>
                            <Download size={18} /> Lista Marisa
                        </button>
                        <button className="btn btn-primary" onClick={syncSheets} disabled={syncing}>
                            <FileSpreadsheet size={18} /> {syncing ? 'Sincronizzazione...' : 'Sincronizza Sheets'}
                        </button>
                        <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
                            <Plus size={18} /> Nuovo Appuntamento
                        </button>
                    </div>
                )}
            </div>

            {isAdding && (
                <div className="card form-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                        <h3 style={{ margin: 0, color: '#0f172a' }}>Registra Appuntamento</h3>
                        <button className="icon-btn" onClick={() => { setIsAdding(false); setSelectedPharmacyId(''); setSelectedTimeSlot(''); }}>✕</button>
                    </div>

                    {/* Step 1: Selezione Farmacia e Data */}
                    <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
                        <div className="form-group">
                            <label>1. Seleziona Farmacia *</label>
                            <select required value={selectedPharmacyId} onChange={e => { setSelectedPharmacyId(e.target.value); setSelectedTimeSlot(''); }}>
                                <option value="">Scegli una farmacia...</option>
                                {visiblePharmacies.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>2. Data Appuntamento *</label>
                            <select required value={selectedDateStr} onChange={e => { setSelectedDateStr(e.target.value); setSelectedTimeSlot(''); }} disabled={!selectedPharmacyId}>
                                <option value="">Scegli una data...</option>
                                {selectedPharmacyId && getAvailableDates(selectedPharmacyId).map(d => {
                                    const dObj = new Date(d);
                                    const formatted = dObj.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });
                                    return <option key={d} value={d}>{formatted.charAt(0).toUpperCase() + formatted.slice(1)}</option>;
                                })}
                            </select>
                            {selectedPharmacyId && getAvailableDates(selectedPharmacyId).length === 0 && (
                                <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.25rem' }}>Nessuna data programmata per questa farmacia nei prossimi 60 giorni.</p>
                            )}
                        </div>
                    </div>

                    {/* Step 2: Griglia Slot */}
                    {selectedPharmacyId && selectedDateStr && (
                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
                                3. Scegli uno Slot Orario *
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.75rem' }}>
                                {getAvailableSlots(selectedPharmacyId, selectedDateStr).map(slot => {
                                    const isOccupied = appointments.some(a => a.pharmacyId === selectedPharmacyId && a.dateStr === selectedDateStr && a.timeSlot === slot);
                                    const isSelected = selectedTimeSlot === slot;

                                    return (
                                        <button
                                            key={slot}
                                            type="button"
                                            disabled={isOccupied}
                                            onClick={() => setSelectedTimeSlot(slot)}
                                            style={{
                                                padding: '0.5rem',
                                                borderRadius: '8px',
                                                border: isSelected ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                                                background: isOccupied ? '#f1f5f9' : (isSelected ? '#eff6ff' : '#fff'),
                                                color: isOccupied ? '#94a3b8' : (isSelected ? '#1d4ed8' : '#334155'),
                                                cursor: isOccupied ? 'not-allowed' : 'pointer',
                                                fontWeight: isSelected ? 600 : 400,
                                                textDecoration: isOccupied ? 'line-through' : 'none'
                                            }}
                                        >
                                            {slot}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Form Paziente */}
                    {selectedTimeSlot && (
                        <form onSubmit={handleAdd} style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>4. Dati Paziente per le {selectedTimeSlot}</h4>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Nome *</label>
                                    <input required type="text" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Cognome *</label>
                                    <input required type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Data di Nascita *</label>
                                    <input required type="date" value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Telefono *</label>
                                    <input required type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Note</label>
                                <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2}></textarea>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary">Conferma Appuntamento</button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            <div style={{ marginTop: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarCheck2 size={24} color="#3b82f6" /> {appointments.length} Appuntamenti Registrati
                </h3>
                {appointments.length === 0 ? (
                    <div className="empty-state" style={{ padding: '3rem', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                        <Users size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
                        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Nessun appuntamento in lista.</p>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Clicca su "Nuovo Appuntamento" per iniziare.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '1.5rem' }}>
                        {appointments.map(a => {
                            const pharmacy = pharmacies.find(p => p.id === a.pharmacyId);
                            return (
                                <div key={a.id} style={{
                                    background: '#fff',
                                    borderRadius: '16px',
                                    padding: '1.5rem',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
                                    border: '1px solid #f1f5f9',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem',
                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                    cursor: 'default'
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)'; }}
                                >
                                    {/* Intestazione */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '1.125rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {a.firstName} {a.lastName}
                                            </h4>
                                            {a.isDuplicate && (
                                                <span style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 600 }}>
                                                    2° App. (Primo: {a.firstAppointmentDate})
                                                </span>
                                            )}
                                        </div>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.75rem',
                                            borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 600,
                                            background: a.status === 'Confermato' ? '#dcfce7' : '#f1f5f9',
                                            color: a.status === 'Confermato' ? '#166534' : '#475569'
                                        }}>
                                            {a.status === 'Confermato' ? <Check size={14} /> : <Clock size={14} />}
                                            {a.status}
                                        </span>
                                    </div>

                                    <div style={{ height: '1px', background: '#f1f5f9' }} />

                                    {/* Corpo */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: '#475569' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#94a3b8' }}>Data Nascita</span>
                                            <span style={{ fontWeight: 500, color: '#334155' }}>{a.birthDate}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#94a3b8' }}>Telefono</span>
                                            <span style={{ fontWeight: 500, color: '#334155' }}>{a.phone}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#94a3b8' }}>Farmacia</span>
                                            <span style={{ fontWeight: 500, color: '#3b82f6', textAlign: 'right', maxWidth: '60%' }}>{pharmacy?.name}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#94a3b8' }}>Appuntamento</span>
                                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{a.dateStr} - {a.timeSlot || '--:--'}</span>
                                        </div>
                                    </div>

                                    {/* Note */}
                                    {a.notes && (
                                        <div style={{ marginTop: 'auto', paddingTop: '1rem', fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', borderTop: '1px dashed #e2e8f0' }}>
                                            "{a.notes}"
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* MODALE LISTA CHIAMATE. Con classe .print-only-section per la stampa */}
            {showCallList && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.5)', zIndex: 100, overflowY: 'auto'
                }}>
                    <div className="print-only-section" style={{
                        background: '#fff', maxWidth: '800px', margin: '2rem auto',
                        padding: '2rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        position: 'relative' // relative per il bottone X
                    }}>
                        {/* Header Modale (Solo a Schermo) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }} className="print-hidden-header">
                            <h2 style={{ margin: 0, color: '#0f172a' }}>Lista Chiamate Promemoria per il {new Date(callListDate).toLocaleDateString('it-IT')}</h2>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn btn-secondary" disabled={sendingEmail} onClick={handleSendTestEmail} style={{ background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1' }}>
                                    <Mail size={18} /> {sendingEmail ? 'Invio...' : 'Invia a Marisa via Email'}
                                </button>
                                <button className="btn btn-primary" onClick={() => window.print()}>
                                    <Printer size={18} /> Stampa Scheda
                                </button>
                                <button className="icon-btn" onClick={() => setShowCallList(false)} style={{ background: '#f1f5f9' }}>
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Stili inline specifici per nascondere l'header in fase di stampa, per pulizia extra */}
                        <style>{`
                            @media print {
                                .print-hidden-header { display: none !important; }
                                .print-only-section { margin: 0 !important; padding: 0 !important; box-shadow: none !important; border-radius: 0 !important; max-width: 100% !important; }
                            }
                        `}</style>

                        {/* Contenuto da stampare */}
                        <div className="print-content">
                            <h1 style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid #000', paddingBottom: '0.5rem' }}>
                                Chiamate Conferma per il: {new Date(callListDate).toLocaleDateString('it-IT')}
                            </h1>

                            {Object.keys(getGroupedCallList()).length === 0 ? (
                                <p style={{ textAlign: 'center', fontStyle: 'italic' }}>Nessun appuntamento previsto per questa giornata.</p>
                            ) : (
                                Object.entries(getGroupedCallList()).map(([pharmId, apts]) => {
                                    const pharmName = pharmacies.find(p => p.id === pharmId)?.name || 'Farmacia Sconosciuta';
                                    return (
                                        <div key={pharmId} className="print-pharmacy-block">
                                            <h3 style={{ background: '#e2e8f0', padding: '0.5rem', marginBottom: '0', border: '1px solid #000', borderBottom: 'none' }}>
                                                {pharmName}
                                            </h3>
                                            <table className="print-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '10%' }}>Orario</th>
                                                        <th style={{ width: '30%' }}>Paziente</th>
                                                        <th style={{ width: '25%' }}>Telefono</th>
                                                        <th style={{ width: '25%' }}>Note</th>
                                                        <th style={{ width: '10%', textAlign: 'center' }}>Chiamato</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {apts.map(a => (
                                                        <tr key={a.id}>
                                                            <td style={{ fontWeight: 'bold' }}>{a.timeSlot}</td>
                                                            <td>{a.firstName} {a.lastName}</td>
                                                            <td>{a.phone}</td>
                                                            <td style={{ fontSize: '0.85rem' }}>{a.notes || '-'}</td>
                                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                                <div style={{ width: '20px', height: '20px', border: '2px solid #000', margin: '0 auto' }}></div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
