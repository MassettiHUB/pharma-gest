import { useState, useRef } from 'react';
import { Camera, UploadCloud, ScanLine, FileText, CheckCircle2, Edit2, Save, X } from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { useNavigate } from 'react-router-dom';
import type { Appointment } from '../types/pharmacy';

export function OCR() {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractedData, setExtractedData] = useState<any | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { pharmacies, appointments, setAppointments } = usePharmacy();
    const navigate = useNavigate();

    // Gestione Edit Mode
    const [editingHeader, setEditingHeader] = useState(false);
    const [headerForm, setHeaderForm] = useState({ pharmacyName: '', date: '' });
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [rowForm, setRowForm] = useState<any>({});

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
                setExtractedData(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const processOCR = async () => {
        if (!imagePreview) return;
        setIsProcessing(true);

        try {
            const response = await fetch(imagePreview);
            const blob = await response.blob();
            const formData = new FormData();
            formData.append('image', blob);

            const apiRes = await fetch('/api/ocr', {
                method: 'POST',
                body: formData,
            });
            const data = await apiRes.json();

            if (apiRes.ok) {
                setExtractedData(data);
                setEditingHeader(false);
                setEditingIdx(null);
            } else {
                alert('Errore API: ' + (data.error || 'Server error'));
            }
        } catch (err) {
            console.error(err);
            alert('Errore di connessione al server');
        } finally {
            setIsProcessing(false);
        }
    };

    const autofillAppointment = async () => {
        if (!extractedData || !extractedData.appointments || extractedData.appointments.length === 0) {
            alert("Nessun appuntamento valido da salvare.");
            return;
        }

        setIsProcessing(true);

        // 1. Trovare la Farmacia (Mappatura Testo OCR -> ID Farmacia)
        const typedName = extractedData.pharmacyName?.toLowerCase() || '';
        let matchedPharmacyId = pharmacies[0]?.id; // Fallback

        for (const p of pharmacies) {
            if (typedName.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(typedName)) {
                matchedPharmacyId = p.id;
                break;
            }
        }

        // 2. Parsare la data dal formato testuale (es 19/02/2026 -> 2026-02-19)
        let formattedDate = new Date().toISOString().split('T')[0];
        const dateRegex = /(\\d{1,2})[\\/\\.\\-](\\d{1,2})[\\/\\.\\-](\\d{2,4})/;
        const dateMatch = extractedData.date?.match(dateRegex);
        if (dateMatch) {
            let [, d, m, y] = dateMatch;
            if (y.length === 2) y = '20' + y;
            formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }

        // 3. Generare gli Appuntamenti per la Lista Globale
        const newAppointments: Appointment[] = extractedData.appointments.map((apt: any) => {
            // Dividi il nome in Nome (Prima parola) e Cognome (Resto)
            const pts = (apt.patientName || apt.details || 'Paziente Sconosciuto').split(' ');
            const fName = pts[0] || '';
            const lName = pts.slice(1).join(' ') || '';

            return {
                id: crypto.randomUUID(),
                firstName: fName,
                lastName: lName,
                birthDate: '',
                phone: apt.phone || '',
                pharmacyId: matchedPharmacyId,
                notes: apt.luogo || '',
                status: 'In attesa',
                isDuplicate: false,
                dateStr: formattedDate,
                timeSlot: apt.time || '10:00'
            };
        });

        // 4. Salvare nello State Globale
        setAppointments([...appointments, ...newAppointments]);

        // 5. Sincronizzazione con Google Sheets Cloud Database
        try {
            const syncPayload = newAppointments.map(a => ({
                ...a,
                // Inseriamo anche il nome letterale della farmacia per il Foglio Google
                pharmacyName: extractedData.pharmacyName || pharmacies.find(p => p.id === a.pharmacyId)?.name || ''
            }));

            const syncRes = await fetch('/api/sync-sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointments: syncPayload })
            });
            const syncData = await syncRes.json();

            if (syncData.success) {
                console.log(`Sincronizzazione completata: ${syncData.inserted} inseriti, ${syncData.duplicated} duplicati saltati.`);
            } else {
                console.error("Errore Sheets:", syncData.error);
                alert("Appuntamenti salvati localmente ma errore durante la sincronizzazione su Google Sheets.");
            }
        } catch (e) {
            console.error("Fetch Error syncing sheets:", e);
            alert("Errore di rete durante la sincronizzazione su Google Sheets.");
        } finally {
            setIsProcessing(false);
            // 6. Redirigere alla vista appuntamenti
            navigate('/appointments');
        }
    };

    return (
        <div className="page-container" translate="no">
            <div className="header-actions">
                <div>
                    <h1>Acquisizione Biglietti (OCR)</h1>
                    <p>Carica o scatta una foto al biglietto stampato per estrarre automaticamente i dati del paziente.</p>
                </div>
            </div>

            <div className="ocr-container" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '2rem' }}>

                {/* Upload Column */}
                <div className="card">
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Camera size={20} color="var(--primary)" /> Acquisizione
                    </h3>

                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />

                    {!imagePreview ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                border: '2px dashed #cbd5e1',
                                borderRadius: 'var(--radius-lg)',
                                padding: '3rem 2rem',
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: '#f8fafc',
                                transition: 'all 0.2s',
                            }}
                            className="upload-area"
                            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                            onMouseOut={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                        >
                            <UploadCloud size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
                            <h4>Trascina o clicca per caricare</h4>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                Supporta formati JPG, PNG
                            </p>
                            <button className="btn btn-secondary" style={{ marginTop: '1.5rem' }}>
                                <Camera size={16} /> Usa Fotocamera
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                <img src={imagePreview} alt="Preview" style={{ width: '100%', display: 'block' }} />
                                {isProcessing && (
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <ScanLine size={48} color="var(--primary)" className="scanning-pulse" />
                                        <p style={{ marginTop: '1rem', fontWeight: 600, color: 'var(--primary)' }}>Analisi in corso...</p>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setImagePreview(null)}>
                                    Rimuovi
                                </button>
                                <button className="btn btn-primary" style={{ flex: 2 }} onClick={processOCR} disabled={isProcessing || extractedData}>
                                    <ScanLine size={18} /> Avvia OCR
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Results Column */}
                <div className="card" style={{ background: extractedData ? '#f0fdf4' : 'white', border: extractedData ? '1px solid #bbf7d0' : '1px solid var(--border)' }}>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={20} color={extractedData ? '#16a34a' : 'var(--primary)'} /> Risultati Analisi
                    </h3>

                    {!extractedData ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '3rem' }}>
                            I dati estratti dal biglietto appariranno qui.
                        </div>
                    ) : (
                        <div className="extracted-data animation-fade-in">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', marginBottom: '1.5rem', fontWeight: 600 }}>
                                <CheckCircle2 size={20} /> Lettura testo e analisi completata
                            </div>

                            <div className="form-grid" style={{ gap: '1rem', marginBottom: '1.5rem', position: 'relative', padding: '0.5rem', background: editingHeader ? '#f8fafc' : 'transparent', borderRadius: '8px' }}>
                                {!editingHeader ? (
                                    <button onClick={() => { setHeaderForm({ pharmacyName: extractedData.pharmacyName, date: extractedData.date }); setEditingHeader(true); }} style={{ position: 'absolute', right: '0.5rem', top: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Modifica Intestazione">
                                        <Edit2 size={16} />
                                    </button>
                                ) : (
                                    <div style={{ position: 'absolute', right: '0.5rem', top: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => { setExtractedData({ ...extractedData, pharmacyName: headerForm.pharmacyName, date: headerForm.date }); setEditingHeader(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a' }} title="Salva Intestazione"><Save size={16} /></button>
                                        <button onClick={() => setEditingHeader(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} title="Annulla"><X size={16} /></button>
                                    </div>
                                )}
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nome Farmacia</label>
                                    {editingHeader ?
                                        <input className="form-input" value={headerForm.pharmacyName} onChange={(e) => setHeaderForm({ ...headerForm, pharmacyName: e.target.value })} style={{ padding: '0.4rem', marginTop: '0.2rem' }} /> :
                                        <p style={{ fontWeight: 500, paddingBottom: '0.5rem', borderBottom: '1px solid #dcfce7', minHeight: '1.5rem' }}>{extractedData.pharmacyName}</p>
                                    }
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Data della giornata</label>
                                    {editingHeader ?
                                        <input className="form-input" value={headerForm.date} onChange={(e) => setHeaderForm({ ...headerForm, date: e.target.value })} style={{ padding: '0.4rem', marginTop: '0.2rem' }} /> :
                                        <p style={{ fontWeight: 500, paddingBottom: '0.5rem', borderBottom: '1px solid #dcfce7', minHeight: '1.5rem' }}>{extractedData.date}</p>
                                    }
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Slot Appuntamenti</label>
                                {extractedData.appointments && extractedData.appointments.length > 0 ? (
                                    <ul style={{ listStyle: 'none', padding: 0 }}>
                                        {extractedData.appointments.map((apt: any, idx: number) => (
                                            <li key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.5rem', background: idx % 2 === 0 ? 'rgba(255,255,255,0.5)' : 'transparent', borderBottom: '1px solid var(--border)', position: 'relative' }}>
                                                {editingIdx === idx ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '8px' }}>
                                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                            <input className="form-input" placeholder="Orario" value={rowForm.time || ''} onChange={e => setRowForm({ ...rowForm, time: e.target.value })} style={{ width: '80px', padding: '0.3rem' }} />
                                                            <input className="form-input" placeholder="Paziente" value={rowForm.patientName || ''} onChange={e => setRowForm({ ...rowForm, patientName: e.target.value })} style={{ flex: 1, minWidth: '150px', padding: '0.3rem' }} />
                                                            <input className="form-input" placeholder="Telefono" value={rowForm.phone || ''} onChange={e => setRowForm({ ...rowForm, phone: e.target.value })} style={{ width: '130px', padding: '0.3rem' }} />
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: '40px' }}>Note:</span>
                                                            <input className="form-input" placeholder="Note/Luogo" value={rowForm.luogo || ''} onChange={e => setRowForm({ ...rowForm, luogo: e.target.value })} style={{ flex: 1, padding: '0.3rem' }} />
                                                            <button onClick={() => {
                                                                const newApts = [...extractedData.appointments];
                                                                newApts[idx] = rowForm;
                                                                setExtractedData({ ...extractedData, appointments: newApts });
                                                                setEditingIdx(null);
                                                            }} className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}><Save size={14} style={{ marginRight: '0.2rem' }} /> Salva</button>
                                                            <button onClick={() => setEditingIdx(null)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: '#ef4444', borderColor: '#ef4444' }}><X size={14} style={{ marginRight: '0.2rem' }} /> Annulla</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button onClick={() => { setRowForm({ ...apt }); setEditingIdx(idx); }} style={{ position: 'absolute', right: '0.5rem', top: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Modifica Slot">
                                                            <Edit2 size={16} className="hover:text-primary transition-colors" />
                                                        </button>
                                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', paddingRight: '2rem' }}>
                                                            <strong style={{ minWidth: '60px', color: 'var(--primary)' }}>{apt.time}</strong>
                                                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                                                <span style={{ fontWeight: 500 }}>{apt.patientName || apt.details}</span>
                                                            </div>
                                                            {apt.phone && (
                                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                                                                    📞 {apt.phone}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {apt.luogo && (
                                                            <div style={{ paddingLeft: '76px', color: 'var(--text-muted)', fontSize: '0.85rem', paddingRight: '2rem' }}>
                                                                <span style={{ fontStyle: 'italic' }}>Note:</span> {apt.luogo}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p style={{ color: 'var(--text-muted)' }}>Nessun appuntamento rilevato con certezza.</p>
                                )}
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Testo Grezzo (Debug)</label>
                                <pre style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.5)', padding: '0.5rem', borderRadius: '4px', marginTop: '0.25rem' }}>
                                    {extractedData.rawText}
                                </pre>
                            </div>

                            <div style={{ marginTop: '2rem' }}>
                                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={autofillAppointment}>
                                    Crea Appuntamento
                                </button>
                            </div>
                        </div>
                    )}
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
        .animation-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @media (max-width: 768px) {
          .ocr-container {
            grid-template-columns: 1fr !important;
          }
        }
      `}} />
        </div>
    );
}
