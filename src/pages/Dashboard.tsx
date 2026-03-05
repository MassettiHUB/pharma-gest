import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    Users,
    Calendar,
    Target,
    TrendingUp,
    Clock,
    ArrowUpRight,
    PieChart as PieChartIcon,
    Download,
    Upload,
    Trash2,
    Settings
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    XAxis,
    YAxis,
    CartesianGrid,
    AreaChart,
    Area
} from 'recharts';

interface DashboardData {
    kpi: {
        appuntamentiMese: number;
        appuntamentiAttesa: number;
        tassoConversione: number;
        daRicontattare: number;
    };
    charts: {
        esiti: Array<{ name: string; value: number; fill: string }>;
        trend: Array<{ mese: string; appuntamenti: number }>;
    };
}

export function Dashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { exportData, importData, resetAppointments, resetToDefaults } = usePharmacy();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/stats');
                if (!response.ok) {
                    throw new Error(`Errore HTTP: ${response.status}`);
                }
                const result = await response.json();
                if (result.success) {
                    setData(result.data);
                } else {
                    // Mostra l'errore principale e il dettaglio se presente
                    const errorMsg = result.error || "Errore sconosciuto nel recupero dei dati.";
                    const details = result.details ? ` (${result.details})` : "";
                    setError(`${errorMsg}${details}`);
                }
            } catch (error: any) {
                console.error("Errore caricamento statistiche:", error);
                const errorMessage = error.message || "Impossibile caricare le statistiche.";
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                    <p style={{ color: '#64748b' }}>Analisi dei dati in corso...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ textAlign: 'center', padding: '2rem', background: '#fff1f2', borderRadius: '12px', border: '1px solid #fda4af', maxWidth: '500px' }}>
                    <h2 style={{ color: '#be123c', marginBottom: '1rem' }}>Spiacenti, si è verificato un errore</h2>
                    <p style={{ color: '#9f1239', marginBottom: '1.5rem' }}>{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ background: '#be123c', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Riprova
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0 0 0.5rem 0' }}>
                    <LayoutDashboard size={32} color="#3b82f6" />
                    Dashboard Prestazioni
                </h1>
                <p style={{ color: '#64748b', margin: 0 }}>Riepilogo attività e indicatori di performance.</p>
            </header>

            {data && (
                <>
                    {/* KPI Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
                        gap: '1.5rem',
                        marginBottom: '2.5rem'
                    }}>
                        <StatCard
                            title="Appuntamenti Mese"
                            value={data.kpi.appuntamentiMese}
                            icon={<Calendar color="#3b82f6" />}
                            color="#eff6ff"
                            detail="Mese corrente"
                        />
                        <StatCard
                            title="Appuntamenti in Attesa"
                            value={data.kpi.appuntamentiAttesa}
                            icon={<Clock color="#f59e0b" />}
                            color="#fffbeb"
                            detail="Slot da confermare"
                        />
                        <StatCard
                            title="Tasso Conversione"
                            value={`${data.kpi.tassoConversione}%`}
                            icon={<Target color="#10b981" />}
                            color="#ecfdf5"
                            detail="Visite vs Vendite"
                        />
                        <StatCard
                            title="Da Ricontattare"
                            value={data.kpi.daRicontattare}
                            icon={<Users color="#8b5cf6" />}
                            color="#f5f3ff"
                            detail="Follow-up attivi"
                        />
                    </div>

                    {/* Charts Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '2rem' }}>
                        {/* Trend Chart */}
                        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                                <TrendingUp size={20} color="#3b82f6" /> Trend Appuntamenti Mensile
                            </h3>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <AreaChart data={data.charts.trend}>
                                        <defs>
                                            <linearGradient id="colorApp" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="mese" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="appuntamenti"
                                            stroke="#3b82f6"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorApp)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Outcomes Chart */}
                        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                                <PieChartIcon size={20} color="#10b981" /> Distribuzione Esiti Visite
                            </h3>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={data.charts.esiti}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {data.charts.esiti.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>
                </>
            )}

            {/* Admin & Backup Section */}
            <div style={{ marginTop: '3rem', background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', color: '#0f172a' }}>
                    <Settings size={22} color="#475569" /> Impostazioni di Sistema e Backup
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Gestisci i dati locali dell'applicazione. Usa il backup prima di effettuare aggiornamenti o se vuoi spostare i dati su un altro dispositivo.</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#334155' }}>Backup Dati</h4>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>Scarica un file JSON con tutte le farmacie, gli appuntamenti e il planning.</p>
                        <button className="btn btn-primary" onClick={exportData} style={{ width: '100%', justifyContent: 'center' }}>
                            <Download size={18} /> Scarica Backup Completo
                        </button>
                    </div>

                    <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#334155' }}>Ripristino Dati</h4>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>Carica un file JSON di backup precedentemente scaricato.</p>
                        <input
                            type="file"
                            accept=".json"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (e) => importData(e.target?.result as string);
                                    reader.readAsText(file);
                                }
                            }}
                        />
                        <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ width: '100%', justifyContent: 'center', background: '#fff', border: '1px solid #cbd5e1' }}>
                            <Upload size={18} /> Importa Backup JSON
                        </button>
                    </div>

                    <div style={{ padding: '1rem', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#991b1b' }}>Area Test & Reset</h4>
                        <p style={{ fontSize: '0.8rem', color: '#b91c1c', marginBottom: '1rem' }}>Attenzione: queste azioni cancellano i dati attuali.</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <button
                                className="btn"
                                onClick={() => {
                                    if (window.confirm("Sei sicuro di voler CANCELLARE TUTTI GLI APPUNTAMENTI? L'operazione è irreversibile.")) {
                                        resetAppointments();
                                    }
                                }}
                                style={{
                                    width: '100%', justifyContent: 'center', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5'
                                }}>
                                <Trash2 size={16} /> Azzera Solo Appuntamenti
                            </button>
                            <button
                                className="btn"
                                onClick={() => {
                                    if (window.confirm("Sei sicuro di voler RIPRISTINARE L'APP ALLE IMPOSTAZIONI DI FABBRICA? Verranno cancellati appuntamenti, planning e farmacie modificate.")) {
                                        resetToDefaults();
                                    }
                                }}
                                style={{
                                    width: '100%', justifyContent: 'center', background: '#ef4444', color: 'white', border: 'none'
                                }}>
                                <Trash2 size={16} /> Hard Reset App
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

function StatCard({ title, value, icon, color, detail }: { title: string, value: string | number, icon: React.ReactNode, color: string, detail: string }) {
    return (
        <div style={{
            background: '#fff',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s',
            cursor: 'default'
        }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ background: color, padding: '0.75rem', borderRadius: '12px' }}>
                    {icon}
                </div>
                <div style={{ background: '#f8fafc', padding: '0.25rem 0.5rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <ArrowUpRight size={12} /> Live
                </div>
            </div>
            <div>
                <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}>{title}</span>
                <h2 style={{ margin: '0.25rem 0', fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>{value}</h2>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{detail}</span>
            </div>
        </div>
    );
}
