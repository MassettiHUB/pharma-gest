import { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { Calendar as CalendarIcon, AlertCircle, RefreshCw } from 'lucide-react';

export function CalendarSync() {
    const { pharmacies, currentUser, genericPlan, calendarOverrides, setCalendarOverrides, appointments } = usePharmacy();
    const [syncing, setSyncing] = useState(false);
    const [syncMonths, setSyncMonths] = useState(3);
    const [movingAppt, setMovingAppt] = useState<{ dateStr: string; period: 'M' | 'P'; pharmacyId: string; pharmacyName: string } | null>(null);
    const [targetDateStr, setTargetDateStr] = useState<string>('');
    const [targetPeriod, setTargetPeriod] = useState<'M' | 'P'>('M');

    const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());

    const months = [
        'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];

    const handleSync = () => {
        setSyncing(true);
        // Simula chiamata API a Google Calendar
        setTimeout(() => {
            setSyncing(false);
            alert(`Sincronizzazione di ${syncMonths} mesi completata su Google Calendar con successo!`);
        }, 2000);
    };

    // Generazione array giorni del mese per la griglia
    const getDaysInMonth = (month: number, year: number) => {
        const date = new Date(year, month, 1);
        const days = [];
        // Spazi vuoti per offset primo giorno (0 = Domenica)
        const firstDay = date.getDay();
        for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
            days.push(null);
        }
        // Giorni effettivi
        while (date.getMonth() === month) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    };

    const calendarDays = getDaysInMonth(currentMonth, currentYear);
    const today = new Date();

    const confirmMove = () => {
        if (!movingAppt || !targetDateStr) return;

        // Verifica disponibilità slot destinazione
        const targetDate = new Date(targetDateStr);
        const dayOfMonth = targetDate.getDate();
        const daysMap = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];
        const weekdayCode = daysMap[targetDate.getDay()];

        let targetBaseVal = '';
        if (dayOfMonth <= 28 && weekdayCode !== 'DOM') {
            const weekIndex = Math.floor((dayOfMonth - 1) / 7);
            const planForDay = genericPlan[weekIndex]?.days[weekdayCode as any];
            if (planForDay) {
                targetBaseVal = targetPeriod === 'M' ? planForDay.M : planForDay.P;
            }
        }

        const targetOverride = calendarOverrides[targetDateStr];
        const finalTargetVal = targetOverride && targetOverride[targetPeriod] !== undefined ? targetOverride[targetPeriod] : targetBaseVal;

        if (finalTargetVal && finalTargetVal !== null) {
            alert("Attenzione: Il turno selezionato nella data di destinazione è già occupato da un'altra farmacia.\\nScegli un giorno o un turno libero prima di spostare.");
            return;
        }

        const newOverrides = { ...calendarOverrides };

        // Svuotiamo lo slot di origine (override esplicito a null se nel planning base c'era qualcosa)
        newOverrides[movingAppt.dateStr] = {
            ...newOverrides[movingAppt.dateStr],
            [movingAppt.period]: null
        };

        // Riempiamo lo slot di destinazione
        newOverrides[targetDateStr] = {
            ...newOverrides[targetDateStr],
            [targetPeriod]: movingAppt.pharmacyId
        };

        setCalendarOverrides(newOverrides);
        setMovingAppt(null);
    };

    const isPharmacyVisible = (p: any) => {
        if (!p || !p.notes) return false;
        const upperNotes = p.notes.toUpperCase();
        return upperNotes.includes('TEAM') || upperNotes.includes(currentUser.toUpperCase());
    };

    const getPharmacyStyle = (notes: string) => {
        if (notes.includes('MAURO')) return { background: '#86efac', color: '#000' };
        if (notes.includes('TEAM')) return { background: '#fdba74', color: '#8a2be2' };
        if (notes.includes('MARISA')) return { background: '#fef08a', color: '#000' };
        return { background: '#fff' };
    };


    return (
        <div className="page-container" style={{ maxWidth: '1200px' }}>
            <div className="header-actions">
                <div>
                    <h1>Calendario di Sincronizzazione</h1>
                    <p>Visualizza le date e sincronizza la programmazione di {currentUser} o del Team con Google Calendar.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Esporta per:</span>
                        <select
                            style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border)' }}
                            value={syncMonths}
                            onChange={(e) => setSyncMonths(parseInt(e.target.value))}
                        >
                            <option value={1}>1 Mese</option>
                            <option value={3}>3 Mesi</option>
                            <option value={6}>6 Mesi</option>
                            <option value={12}>1 Anno</option>
                        </select>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={handleSync}
                        disabled={syncing}
                    >
                        {syncing ? <><RefreshCw className="scanning-pulse" size={18} /> Sincronizzazione...</> : <><CalendarIcon size={18} /> Avvia Sync Google</>}
                    </button>
                </div>
            </div>

            <div className="card form-card" style={{ marginBottom: '2rem' }}>
                <div className="form-grid" style={{ alignItems: 'flex-end', display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                        <label>Mese</label>
                        <select value={currentMonth} onChange={(e) => setCurrentMonth(parseInt(e.target.value))}>
                            {months.map((m, idx) => (
                                <option key={idx} value={idx}>{m}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                        <label>Anno</label>
                        <select value={currentYear} onChange={(e) => setCurrentYear(parseInt(e.target.value))}>
                            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                    {['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'].map(day => (
                        <div key={day} style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>
                            {day}
                        </div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(100px, auto)' }}>
                    {calendarDays.map((date, idx) => {
                        const isToday = date && date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();

                        return (
                            <div key={idx} style={{
                                padding: '0.5rem',
                                borderRight: '1px solid #e2e8f0',
                                borderBottom: '1px solid #e2e8f0',
                                background: date ? '#fff' : '#f8fafc',
                                minHeight: '120px'
                            }}>
                                {date && (
                                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                        <div style={{
                                            marginBottom: '0.5rem',
                                            fontWeight: isToday ? 700 : 500,
                                            color: isToday ? 'var(--primary)' : 'inherit',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            background: isToday ? '#eff6ff' : 'transparent',
                                            border: isToday ? '1px solid var(--primary)' : 'none'
                                        }}>
                                            {date.getDate()}
                                        </div>
                                        {/* Mapping Eventi/Appuntamenti M e P dal Planning Generico + Override */}
                                        {(() => {
                                            const dayOfMonth = date.getDate();
                                            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
                                            const override = calendarOverrides[dateStr];

                                            const daysMap = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];
                                            const weekdayCode = daysMap[date.getDay()];

                                            if (weekdayCode === 'DOM') return null; // Salta Domenica

                                            // Applica piano generico solo per giorni <= 28
                                            let baseM = '';
                                            let baseP = '';
                                            if (dayOfMonth <= 28) {
                                                const weekIndex = Math.floor((dayOfMonth - 1) / 7); // Settimana 0, 1, 2, 3
                                                const planForDay = genericPlan[weekIndex]?.days[weekdayCode as any];
                                                if (planForDay) {
                                                    baseM = planForDay.M;
                                                    baseP = planForDay.P;
                                                }
                                            }

                                            // Applica Override
                                            const finalM = override && override.M !== undefined ? override.M : baseM;
                                            const finalP = override && override.P !== undefined ? override.P : baseP;

                                            const renderSlot = (period: 'M' | 'P', value: string | null) => {
                                                if (!value) {
                                                    return <div style={{ flex: 1, padding: '0.15rem 0.25rem', fontSize: '0.7rem', color: '#cbd5e1' }}> Libero </div>;
                                                }

                                                const currentPharm = pharmacies.find(p => p.id === value);
                                                const hiddenOtherUser = value && currentPharm && !isPharmacyVisible(currentPharm);

                                                if (hiddenOtherUser) {
                                                    return (
                                                        <div style={{ flex: 1, padding: '0.15rem 0.25rem', borderRadius: '4px', visibility: 'hidden' }}>
                                                            Occupato
                                                        </div>
                                                    );
                                                }

                                                const countAppts = appointments.filter(a => a.pharmacyId === value && a.dateStr === dateStr).length;

                                                return (
                                                    <div
                                                        onClick={() => {
                                                            if (currentPharm) {
                                                                setMovingAppt({ dateStr, period, pharmacyId: value, pharmacyName: currentPharm.name });
                                                                setTargetDateStr(dateStr);
                                                                setTargetPeriod(period);
                                                            }
                                                        }}
                                                        style={{
                                                            flex: 1,
                                                            border: '1px solid var(--border)',
                                                            borderRadius: '4px',
                                                            background: currentPharm ? getPharmacyStyle(currentPharm.notes || '').background : '#f8fafc',
                                                            color: currentPharm ? getPharmacyStyle(currentPharm.notes || '').color : 'inherit',
                                                            fontSize: '0.7rem',
                                                            padding: '0.25rem 0.35rem',
                                                            cursor: 'pointer',
                                                            fontWeight: currentPharm ? 600 : 400,
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}
                                                        title="Clicca per spostare questa farmacia"
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {currentPharm ? currentPharm.name : 'Libero'}
                                                            </span>
                                                            {countAppts > 0 && (
                                                                <span style={{
                                                                    background: '#ef4444',
                                                                    color: 'white',
                                                                    borderRadius: '10px',
                                                                    padding: '0.1rem 0.35rem',
                                                                    fontSize: '0.65rem',
                                                                    fontWeight: 'bold',
                                                                    marginLeft: '0.2rem'
                                                                }}>
                                                                    {countAppts}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            };

                                            return (
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0 0.25rem', marginTop: 'auto', marginBottom: 'auto' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                        <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, width: '10px' }}>M</span>
                                                        {renderSlot('M', finalM)}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                        <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, width: '10px' }}>P</span>
                                                        {renderSlot('P', finalP)}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="card mt-4" style={{ marginTop: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <AlertCircle size={20} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                        <h4 style={{ color: '#334155', marginBottom: '0.25rem' }}>Visualizzazione e Sincronizzazione</h4>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                            Il calendario esporta e sincronizza gli appuntamenti creati per l'utente loggato ({currentUser}) verso l'account Google. Per l'integrazione effettiva servirà abilitare le Google Calendar API.
                        </p>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
        .scanning-pulse {
          animation: pulse 1.5s infinite ease-in-out;
        }
      `}} />

            {/* Modal per lo spostamento */}
            {movingAppt && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '400px', margin: 0 }}>
                        <h3 style={{ marginTop: 0 }}>Sposta: {movingAppt.pharmacyName}</h3>
                        <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                            Data origine: {movingAppt.dateStr} - {movingAppt.period === 'M' ? 'Mattina' : 'Pomeriggio'}
                        </p>

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label>Nuova Data d'Arrivo</label>
                            <input
                                type="date"
                                value={targetDateStr}
                                onChange={e => setTargetDateStr(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label>Nuovo Turno</label>
                            <select
                                value={targetPeriod}
                                onChange={e => setTargetPeriod(e.target.value as 'M' | 'P')}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                            >
                                <option value="M">Mattina</option>
                                <option value="P">Pomeriggio</option>
                            </select>
                        </div>

                        <div className="form-actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setMovingAppt(null)}>Annulla</button>
                            <button className="btn btn-primary" onClick={confirmMove}>Conferma Spostamento</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
