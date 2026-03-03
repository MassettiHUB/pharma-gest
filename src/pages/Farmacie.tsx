import { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { Plus, Trash2, Edit2 } from 'lucide-react';

export function Farmacie() {
    const { pharmacies, addPharmacy, removePharmacy, updatePharmacy, currentUser } = usePharmacy();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewingPharmacy, setViewingPharmacy] = useState<any | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        workingDays: 1,
        notes: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            updatePharmacy(editingId, formData);
            setEditingId(null);
        } else {
            addPharmacy(formData);
            setIsAdding(false);
        }
        setFormData({ name: '', address: '', phone: '', workingDays: 1, notes: '' });
    };

    const startEdit = (pharmacy: any) => {
        setFormData({
            name: pharmacy.name,
            address: pharmacy.address,
            phone: pharmacy.phone || '',
            workingDays: pharmacy.workingDays,
            notes: pharmacy.notes || '',
        });
        setEditingId(pharmacy.id);
        setIsAdding(true);
        setViewingPharmacy(null); // Chiudiamo la modale quando passiamo in modifica
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
                    <h1>Gestione Farmacie</h1>
                    <p>Configura le farmacie di tua competenza e i relativi giorni lavorativi.</p>
                </div>
                {!isAdding && (
                    <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
                        <Plus size={18} /> Aggiungi Farmacia
                    </button>
                )}
            </div>

            {isAdding && (
                <form className="card form-card" onSubmit={handleSubmit}>
                    <h3>{editingId ? 'Modifica Farmacia' : 'Nuova Farmacia'}</h3>
                    <div className="form-group">
                        <label>Nome Farmacia *</label>
                        <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Indirizzo *</label>
                            <input required type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Telefono</label>
                            <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Giorni di presenza mensili presunti * (es. 4)</label>
                        <input required type="number" min="1" max="31" value={formData.workingDays} onChange={(e) => setFormData({ ...formData, workingDays: parseInt(e.target.value) || 1 })} />
                    </div>
                    <div className="form-group">
                        <label>Note</label>
                        <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => { setIsAdding(false); setEditingId(null); setFormData({ name: '', address: '', phone: '', workingDays: 1, notes: '' }); }}>
                            Annulla
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {editingId ? 'Salva Modifiche' : 'Aggiungi'}
                        </button>
                    </div>
                </form>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {visiblePharmacies.length === 0 && !isAdding && (
                    <div className="empty-state" style={{ padding: '2rem' }}>Nessuna farmacia configurata per l'utente {currentUser}.</div>
                )}
                {visiblePharmacies.length > 0 && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '1rem', fontWeight: 600, color: '#475569' }}>Farmacia</th>
                                <th style={{ padding: '1rem', fontWeight: 600, color: '#475569' }}>Indirizzo / Comune</th>
                                <th style={{ padding: '1rem', fontWeight: 600, color: '#475569' }}>Telefono</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visiblePharmacies.map((p) => (
                                <tr
                                    key={p.id}
                                    onClick={() => setViewingPharmacy(p)}
                                    style={{ cursor: 'pointer', borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    title="Clicca per aprire i dettagli o modificare"
                                >
                                    <td style={{ padding: '1rem', fontWeight: 500, color: '#1e293b' }}>{p.name}</td>
                                    <td style={{ padding: '1rem', color: '#64748b' }}>{p.address}</td>
                                    <td style={{ padding: '1rem', color: '#64748b' }}>{p.phone || 'N/D'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modale di Dettaglio Farmacia */}
            {viewingPharmacy && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={() => setViewingPharmacy(null)}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', margin: 0, padding: '2rem' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, color: '#0f172a' }}>{viewingPharmacy.name}</h2>
                            <button className="icon-btn" onClick={() => setViewingPharmacy(null)} style={{ background: '#f1f5f9', padding: '0.5rem', borderRadius: '50%' }}>✕</button>
                        </div>

                        <div style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>
                            <p><strong>Indirizzo / Comune:</strong> {viewingPharmacy.address}</p>
                            <p><strong>Telefono:</strong> {viewingPharmacy.phone || 'Nessun telefono registrato'}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <strong>Giornate Lavorative Mensili:</strong>
                                <input
                                    type="number"
                                    min="1"
                                    max="31"
                                    value={viewingPharmacy.workingDays || 1}
                                    onChange={(e) => {
                                        const newDays = parseInt(e.target.value) || 1;
                                        updatePharmacy(viewingPharmacy.id, { workingDays: newDays });
                                        setViewingPharmacy({ ...viewingPharmacy, workingDays: newDays });
                                    }}
                                    style={{ width: '70px', padding: '0.35rem', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '1rem', textAlign: 'center' }}
                                /> gg
                            </div>
                            {viewingPharmacy.notes && (
                                <div style={{ background: '#fffbeb', padding: '1rem', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                                    <strong>Note / Info Interne:</strong>
                                    <p style={{ margin: '0.5rem 0 0 0', whiteSpace: 'pre-wrap' }}>{viewingPharmacy.notes}</p>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                            <button type="button" className="btn btn-secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => {
                                if (confirm('Sei sicuro di voler eliminare questa farmacia?')) {
                                    removePharmacy(viewingPharmacy.id);
                                    setViewingPharmacy(null);
                                }
                            }}>
                                <Trash2 size={18} style={{ marginRight: '0.5rem' }} /> Elimina
                            </button>
                            <button type="button" className="btn btn-primary" onClick={() => startEdit(viewingPharmacy)}>
                                <Edit2 size={18} style={{ marginRight: '0.5rem' }} /> Modifica
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
