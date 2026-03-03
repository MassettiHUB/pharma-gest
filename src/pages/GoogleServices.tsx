import React, { useState } from 'react';
import { Camera, Mail, Send } from 'lucide-react';

export function GoogleServices() {
    const [image, setImage] = useState<File | null>(null);
    const [visionResult, setVisionResult] = useState<string[]>([]);
    const [visionError, setVisionError] = useState('');
    const [isVisionLoading, setIsVisionLoading] = useState(false);

    const [emailData, setEmailData] = useState({ to: '', subject: '', message: '', accessToken: '' });
    const [emailStatus, setEmailStatus] = useState('');
    const [isEmailLoading, setIsEmailLoading] = useState(false);

    const handleVisionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!image) return;

        setIsVisionLoading(true);
        setVisionError('');
        setVisionResult([]);
        const formData = new FormData();
        formData.append('image', image);

        try {
            const response = await fetch('/api/vision', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            if (response.ok && data.labels) {
                const labels = Array.isArray(data.labels)
                    ? data.labels.map((l: any) => l?.description || 'Etichetta senza descrizione')
                    : [];
                if (labels.length === 0) setVisionError('Nessuna etichetta trovata in questa immagine.');
                setVisionResult(labels);
            } else {
                setVisionError('Errore API: ' + (data.error || 'Risposta inaspettata dal server'));
            }
        } catch (error: any) {
            console.error(error);
            setVisionError('Errore di connessione al server: ' + error.message);
        } finally {
            setIsVisionLoading(false);
        }
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsEmailLoading(true);
        setEmailStatus('');

        try {
            const response = await fetch('/api/send-mail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(emailData),
            });
            const data = await response.json();
            if (data.success) {
                setEmailStatus('Email inviata con successo!');
            } else {
                setEmailStatus('Errore: ' + data.error);
            }
        } catch (error) {
            console.error(error);
            setEmailStatus('Errore di connessione al server');
        }
        setIsEmailLoading(false);
    };

    return (
        <div translate="no" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <h2>Integrazione Servizi Google</h2>

            <section style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
                <h3><Camera size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Cloud Vision API</h3>
                <form onSubmit={handleVisionSubmit}>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImage(e.target.files?.[0] || null)}
                        style={{ marginBottom: '1rem', display: 'block' }}
                    />
                    <button type="submit" disabled={!image || isVisionLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        {isVisionLoading ? <span className="spin" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }}></span> : <Camera size={16} />}
                        Analizza Immagine
                    </button>
                </form>
                {visionError && <p style={{ color: 'red', marginTop: '1rem' }}><strong>{visionError}</strong></p>}
                {Array.isArray(visionResult) && visionResult.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                        <strong>Etichette trovate:</strong>
                        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                            {visionResult.map((label, idx) => <li key={idx}>{typeof label === 'string' ? label : JSON.stringify(label)}</li>)}
                        </ul>
                    </div>
                )}
            </section>

            <section style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px' }}>
                <h3><Mail size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Gmail API</h3>
                <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Access Token da Google OAuth"
                        value={emailData.accessToken}
                        onChange={(e) => setEmailData({ ...emailData, accessToken: e.target.value })}
                        required
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                    <small>Puoi generare un token reale e temporaneo da <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noreferrer">OAuth Playground</a> (con scope Gmail).</small>
                    <input
                        type="email"
                        placeholder="Destinatario"
                        value={emailData.to}
                        onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                        required
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                    <input
                        type="text"
                        placeholder="Oggetto"
                        value={emailData.subject}
                        onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                        required
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                    <textarea
                        placeholder="Messaggio"
                        value={emailData.message}
                        onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                        required
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', minHeight: '100px' }}
                    />
                    <button type="submit" disabled={isEmailLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: 'fit-content' }}>
                        {isEmailLoading ? <span className="spin" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }}></span> : <Send size={16} />}
                        Invia Email
                    </button>
                    {emailStatus && <p><strong>{emailStatus}</strong></p>}
                </form>
            </section>
        </div >
    );
}
