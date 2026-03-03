import { useState, useEffect } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { LayoutDashboard, Store, Calendar as CalendarIcon, CheckCircle, XCircle } from 'lucide-react';

export function Home() {
    const { currentUser, pharmacies, genericPlan } = usePharmacy();

    // Possiamo aggiungere qualche stat di base
    const myPharmacies = pharmacies.filter(p => p.notes?.toUpperCase().includes(currentUser.toUpperCase()) || p.notes?.toUpperCase().includes('TEAM'));

    let totalVisits = 0;
    genericPlan.forEach(w => Object.values(w.days).forEach(d => {
        if (d.M && myPharmacies.find(p => p.id === d.M)) totalVisits++;
        if (d.P && myPharmacies.find(p => p.id === d.P)) totalVisits++;
    }));

    const [stats, setStats] = useState({
        confirmedWeek: 0,
        cancelledWeek: 0,
        confirmedMonth: 0,
        cancelledMonth: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/stats');
                const data = await res.json();
                if (data.success) {
                    setStats(data.data);
                }
            } catch (err) {
                console.error("Errore fetch stats:", err);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="page-container">
            <div className="header-actions">
                <div>
                    <h1>Dashboard</h1>
                    <p>Benvenuto, {currentUser}. Panoramica generale del tuo account.</p>
                </div>
                <LayoutDashboard size={24} color="#64748b" />
            </div>

            <div className="form-grid" style={{ marginTop: '2rem' }}>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '50%' }}>
                        <Store size={24} color="#3b82f6" />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{myPharmacies.length}</h3>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Farmacie Assegnate</p>
                    </div>
                </div>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '50%' }}>
                        <CalendarIcon size={24} color="#d97706" />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{totalVisits}</h3>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Visite Mensili Pianificate</p>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
                <h3 style={{ color: '#0f172a', marginBottom: '1rem' }}>Andamento Chiamate (Questa Settimana)</h3>
                <div className="form-grid">
                    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #10b981' }}>
                        <div style={{ background: '#d1fae5', padding: '1rem', borderRadius: '50%' }}>
                            <CheckCircle size={24} color="#10b981" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#047857' }}>{stats.confirmedWeek}</h3>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Confermati</p>
                        </div>
                    </div>
                    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #ef4444' }}>
                        <div style={{ background: '#fee2e2', padding: '1rem', borderRadius: '50%' }}>
                            <XCircle size={24} color="#ef4444" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#b91c1c' }}>{stats.cancelledWeek}</h3>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Annullati</p>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
                <h3 style={{ color: '#0f172a', marginBottom: '1rem' }}>Andamento Chiamate (Questo Mese)</h3>
                <div className="form-grid">
                    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #10b981' }}>
                        <div style={{ background: '#d1fae5', padding: '1rem', borderRadius: '50%' }}>
                            <CheckCircle size={24} color="#10b981" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#047857' }}>{stats.confirmedMonth}</h3>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Confermati</p>
                        </div>
                    </div>
                    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #ef4444' }}>
                        <div style={{ background: '#fee2e2', padding: '1rem', borderRadius: '50%' }}>
                            <XCircle size={24} color="#ef4444" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#b91c1c' }}>{stats.cancelledMonth}</h3>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Annullati</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
