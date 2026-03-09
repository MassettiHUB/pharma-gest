import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Download, Upload, Trash2, Settings,
    ArrowUpRight, ArrowDownRight, CheckCircle2, Star, ThumbsUp, MessageCircle, Ear
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import {
    ResponsiveContainer, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, Tooltip, RadialBarChart, RadialBar, Cell
} from 'recharts';

interface DashboardData {
    kpi: {
        appuntamentiMese: number;
        appuntamentiAttesa: number;
        tassoConversione: number;
        daRicontattare: number;
        noShowRate: number;
        avgLeadTime: number;
        completatiTeam: number;
        completatiPersonale: number;
        totaleCompletati: number;
        followUpPercent: number;
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
    const { exportData, importData, resetAppointments, pharmacies } = usePharmacy();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Calculate dynamic FILL RATE from Context + Backend
    const totalSlotCapacity = pharmacies.length * 16; // Esempio semplificato: 16 slot medi per farmacia visitata al mese
    const fillRate = data?.kpi?.appuntamentiMese && totalSlotCapacity > 0
        ? Math.min(100, Math.round((data.kpi.appuntamentiMese / totalSlotCapacity) * 100))
        : 92; // Mock fallback if no data

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/stats');
                if (!response.ok) throw new Error(`Errore HTTP: ${response.status}`);
                const result = await response.json();
                if (result.success) setData(result.data);
                else setError(result.error || "Errore sconosciuto nel recupero dei dati.");
            } catch (error: any) {
                console.error("Errore caricamento statistiche:", error);
                setError(error.message || "Impossibile caricare le statistiche.");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return (
        <div style={{ background: '#090f1e', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="spinner" style={{ borderTopColor: '#0ea5e9', width: '40px', height: '40px' }} />
        </div>
    );

    if (error) return (
        <div style={{ background: '#090f1e', minHeight: '100vh', padding: '2rem', color: '#fff' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '1.5rem', borderRadius: '12px' }}>
                <h2 style={{ color: '#f87171', margin: '0 0 1rem 0' }}>Errore Caricamento Dashboard</h2>
                <p>{error}</p>
            </div>
        </div>
    );

    // Mock trend for No Show chart
    const noShowTrend = [
        { name: '1', score: 9 }, { name: '2', score: 7 }, { name: '3', score: 6 },
        { name: '4', score: 8 }, { name: '5', score: 5 }, { name: '6', score: parseFloat(data?.kpi.noShowRate.toString() || "4.1") }
    ];

    // Mock trend for Lead Time
    const leadTimeDistrib = [
        { day: '1', val: 10 }, { day: '2', val: 25 }, { day: '3', val: 40 }, { day: '4', val: 65 },
        { day: '5', val: 90 }, { day: '6', val: 70 }, { day: '7', val: 100 }, { day: '8', val: 60 },
        { day: '9', val: 45 }, { day: '10', val: 25 }, { day: '11', val: 15 }, { day: '12', val: 5 }
    ];

    // Bar chart data for completati
    const completionData = [
        { name: 'Team', val: data?.kpi.completatiTeam || 0, fill: '#3b82f6' },
        { name: 'Personale', val: data?.kpi.completatiPersonale || 0, fill: '#14b8a6' }
    ];

    return (
        <div style={{ background: '#0f172a', minHeight: '100vh', padding: '2rem', color: '#e2e8f0', fontFamily: '"Inter", sans-serif' }}>
            {/* Dark Theme Overrides for Global UI inside Dashboard */}
            <style>{`
                .dark-panel {
                    background: rgba(30, 41, 59, 0.5);
                    border: 1px solid rgba(148, 163, 184, 0.1);
                    border-radius: 16px;
                    padding: 1.5rem;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
                }
                .dark-panel-title {
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 1.5rem;
                }
            `}</style>

            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid rgba(148,163,184,0.1)', paddingBottom: '1rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.75rem', textTransform: 'uppercase' }}>
                    <LayoutDashboard size={28} color="#0ea5e9" />
                    PHARMAMAS - <span style={{ color: '#0ea5e9', fontWeight: 400 }}>QUALITÀ E OPERATIVITÀ DEL CRUSCOTTO</span>
                </h1>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <select style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '8px', padding: '0.5rem 1rem', outline: 'none' }}>
                        <option>Mese Corrente</option>
                        <option>Ultimi 3 Mesi</option>
                        <option>Anno Corrente</option>
                    </select>
                    <div style={{ background: 'rgba(14, 165, 233, 0.1)', padding: '0.6rem', borderRadius: '50%', border: '1px solid rgba(14, 165, 233, 0.3)' }}>
                        <Ear size={20} color="#0ea5e9" />
                    </div>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem' }}>
                {/* ---------- LEFT COL: EFFICIENZA OPERATIVA ---------- */}
                <div>
                    <h2 style={{ fontSize: '1.1rem', color: '#0ea5e9', margin: '0 0 1rem 0', letterSpacing: '0.05em' }}>EFFICIENZA OPERATIVA</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

                        {/* 1. FILL RATE */}
                        <div className="dark-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                            <div className="dark-panel-title" style={{ width: '100%' }}>
                                <span>1. FILL RATE <span style={{ textTransform: 'none', fontWeight: 400 }}>(Tasso di Occupazione)</span></span>
                                <ArrowUpRight size={16} color="#10b981" />
                            </div>
                            <div style={{ width: 160, height: 160 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={12} data={[{ name: 'Fill', value: fillRate, fill: '#0ea5e9' }]} startAngle={180} endAngle={0}>
                                        <RadialBar background={{ fill: '#334155' }} dataKey="value" cornerRadius={10} />
                                    </RadialBarChart>
                                </ResponsiveContainer>
                                <div style={{ position: 'absolute', top: '55%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                    <h3 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800, color: '#f8fafc' }}>{fillRate}%</h3>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>OBIETTIVO &gt; 90%</p>
                                </div>
                            </div>
                            <div style={{ color: '#10b981', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '-20px' }}>
                                <CheckCircle2 size={14} /> Tempo Lavorativo Ottimizzato
                            </div>
                        </div>

                        {/* 2. NO SHOW RATE */}
                        <div className="dark-panel">
                            <div className="dark-panel-title">
                                <span>2. TASSO DI NO-SHOW</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', height: '110px' }}>
                                <div style={{ width: '50%', height: '100%' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={noShowTrend}>
                                            <defs>
                                                <linearGradient id="colorNoShow" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Area type="monotone" dataKey="score" stroke="#0ea5e9" fill="url(#colorNoShow)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ width: '45%', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" barSize={8} data={[{ name: 'NS', value: data?.kpi.noShowRate || 4.1, fill: '#3b82f6' }]} startAngle={90} endAngle={-270}>
                                            <RadialBar background={{ fill: '#334155' }} dataKey="value" cornerRadius={10} />
                                        </RadialBarChart>
                                    </ResponsiveContainer>
                                    <div style={{ position: 'absolute', fontWeight: 800, fontSize: '1.25rem', color: '#f8fafc' }}>
                                        {data?.kpi.noShowRate || 4.1}%
                                    </div>
                                </div>
                            </div>
                            <div style={{ color: '#10b981', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <ArrowDownRight size={14} /> Migliorare Promemoria
                            </div>
                        </div>

                    </div>

                    {/* 3. LEAD TIME MEDIO */}
                    <div className="dark-panel">
                        <div className="dark-panel-title">
                            <span>3. LEAD TIME MEDIO <span style={{ textTransform: 'none', fontWeight: 400 }}>(Giorni da Prenotazione)</span></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '3rem', fontWeight: 800, color: '#f8fafc' }}>{data?.kpi.avgLeadTime || '6.5'} <span style={{ fontSize: '1.5rem', fontWeight: 600 }}>gg</span></h3>
                                <div style={{ color: '#10b981', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.75rem', borderRadius: '2rem' }}>
                                    <CheckCircle2 size={14} /> In Target (Bilanciato)
                                </div>
                            </div>
                            <div style={{ flex: 1.5, height: '140px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={leadTimeDistrib}>
                                        <defs>
                                            <linearGradient id="colorLT" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#0ea5e9" />
                                                <stop offset="100%" stopColor="#8b5cf6" />
                                            </linearGradient>
                                        </defs>
                                        <Bar dataKey="val" fill="url(#colorLT)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.7rem', padding: '0 0.5rem' }}>
                                    <span>1 gg</span>
                                    <span>14 gg+</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ---------- RIGHT COL: QUALITA' CLINICA ---------- */}
                <div>
                    <h2 style={{ fontSize: '1.1rem', color: '#0ea5e9', margin: '0 0 1rem 0', letterSpacing: '0.05em' }}>QUALITÀ CLINICA E SATURAZIONE</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

                        {/* 4. APPUNTAMENTI COMPLETATI */}
                        <div className="dark-panel">
                            <div className="dark-panel-title">
                                <span>4. COMPLETED <span style={{ textTransform: 'none', fontWeight: 400 }}>(Categoria)</span></span>
                            </div>
                            <h3 style={{ margin: '-1rem 0 1rem 0', fontSize: '2rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                {data?.kpi.totaleCompletati || 0} <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 500 }}>Test eseguiti</span>
                            </h3>
                            <div style={{ height: '120px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={completionData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#f8fafc', fontSize: 11 }} width={70} />
                                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1e293b', border: 'none', color: '#fff', borderRadius: '8px' }} />
                                        <Bar dataKey="val" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20}>
                                            {completionData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 5. FOLLOW UP REALIZZATI */}
                        <div className="dark-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                            <div className="dark-panel-title" style={{ width: '100%' }}>
                                <span>5. FOLLOW-UP</span>
                            </div>
                            <div style={{ width: 140, height: 140, marginTop: '-10px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={10} data={[{ name: 'FU', value: data?.kpi.followUpPercent || 78, fill: '#10b981' }]} startAngle={90} endAngle={-270}>
                                        <RadialBar background={{ fill: '#334155' }} dataKey="value" cornerRadius={10} />
                                    </RadialBarChart>
                                </ResponsiveContainer>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                    <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#f8fafc' }}>{data?.kpi.followUpPercent || 78}%</h3>
                                    <p style={{ margin: 0, fontSize: '0.65rem', color: '#94a3b8' }}>Completed vs Planned</p>
                                </div>
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '10px' }}>
                                Fidelizzazione Clienti
                            </div>
                        </div>

                    </div>

                    {/* 6. SODDISFAZIONE E PUNTEGGI QUALITATIVI */}
                    <div className="dark-panel">
                        <div className="dark-panel-title">
                            <span>6. SODDISFAZIONE & PUNTEGGI QUALITATIVI</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '0.25rem', color: '#facc15' }}>
                                    <Star fill="#facc15" size={24} />
                                    <Star fill="#facc15" size={24} />
                                    <Star fill="#facc15" size={24} />
                                    <Star fill="#facc15" size={24} />
                                    <Star fill="#facc15" size={24} opacity={0.5} />
                                </div>
                                <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', color: '#f8fafc' }}>4.8 <span style={{ fontSize: '1rem', color: '#64748b' }}>/5.0</span></h3>
                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Sondaggi Post-Test</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '40%' }}>
                                {[5, 4, 3].map(star => (
                                    <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{star}★</span>
                                        <div style={{ flex: 1, height: '6px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: star === 5 ? '85%' : star === 4 ? '12%' : '3%',
                                                height: '100%',
                                                background: star === 5 ? '#10b981' : star === 4 ? '#0ea5e9' : '#8b5cf6'
                                            }} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '0.75rem', borderRadius: '50%' }}><ThumbsUp size={24} color="#10b981" /></div>
                                <div style={{ background: 'rgba(14, 165, 233, 0.2)', padding: '0.75rem', borderRadius: '50%' }}><MessageCircle size={24} color="#0ea5e9" /></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Admin & Backup Section - Styled for dark mode */}
            <div className="dark-panel" style={{ marginTop: '2rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: '#f8fafc' }}>
                    <Settings size={20} color="#94a3b8" /> Impostazioni di Sistema
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.1)' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#cbd5e1' }}>Backup Dati</h4>
                        <button onClick={exportData} style={{ width: '100%', background: '#0ea5e9', color: '#fff', border: 'none', padding: '0.5rem', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <Download size={16} /> Scarica Backup
                        </button>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.1)' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#cbd5e1' }}>Ripristino</h4>
                        <input type="file" accept=".json" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = (ev) => importData(ev.target?.result as string); r.readAsText(f); } }} />
                        <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', background: 'transparent', color: '#0ea5e9', border: '1px solid #0ea5e9', padding: '0.5rem', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <Upload size={16} /> Carica JSON
                        </button>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#f87171' }}>Attenzione</h4>
                        <button onClick={() => { if (window.confirm("Azzera sicuri?")) resetAppointments(); }} style={{ width: '100%', background: '#ef4444', color: '#fff', border: 'none', padding: '0.5rem', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <Trash2 size={16} /> Reset Appuntamenti
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
