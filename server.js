import express from 'express';
// Deploy Trigger v1.0.1 - Refreshing Netlify public status
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import { google } from 'googleapis';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import serverless from 'serverless-http';

// Carica variabili d'ambiente
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Middleare di log per debuggare le rotte su Netlify
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Configura Multer per ricevere immagini in memoria (senza salvarle su disco)
const upload = multer({ storage: multer.memoryStorage() });

// Definiamo il Router per le API
const apiRouter = express.Router();

// Health check endpoint per verificare la connettività
apiRouter.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Il server è attivo e vegeto!' });
});

// ==========================================
// 1.5. ENDPOINT OCR API (Gemini Multimodal)
// ==========================================
apiRouter.post('/ocr', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nessuna immagine fornita' });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'Variabile GEMINI_API_KEY non configurata' });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const base64Image = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;

        const prompt = `
Sei un assistente specializzato nella lettura di fogli degli appuntamenti farmaceutici scritti a mano.
Riceverai l'immagine di un foglio degli appuntamenti. Devi analizzarla e restituire ESATTAMENTE un oggetto JSON valido.

Istruzioni per l'estrazione:
1. "pharmacyName": Cerca l'intestazione, spesso in alto. Se contiene "ZAMARDELLI", scrivi "ZAMARDELLI". Se "MONTIRONE", scrivi "Biccherai MONTIRONE". Se "DEI SANTI" o "DEI SAMTI", scrivi "FARMACIA DEI SANTI". Altrimenti estrai il nome che trovi. Se assente, "Non trovato".
2. "date": Estrai la data riportata in alto o nel foglio. Se presente, formattala come testuale (es "19-02-2026", "16-02-2026"). Se non presente, "Non trovata".
3. "appointments": Questo è un array di oggetti (uno per ogni riga/orario). Le colonne previste sono di solito Orario (es 9:00), Paziente (il nome o dettaglio), Telefono, Luogo/Note (ad es: FA/AB o annotazioni varie sparse vicine al nome).
   - "time": l'orario della riga (es "9:00", "10:30"). Normalizza gli orari senza i : (es "1130" -> "11:30", "10" -> "10:00").
   - "patientName": Il nome del paziente sulla riga. Se non c'è, scrivi "Libero / Non Rilevato".
   - "phone": Il numero di telefono sulla riga. Associa correttamente cifre scritte minuscole o a margine sulla riga e scarta frecce o segni >, ad es. unificando "328 4560006".
   - "luogo": Eventuali note a margine, scritte nella colonna Luogo, note tipo "CHIAMARE LE 14", "LEG", "TELEFON MOM", "ha".

Ragiona riga per riga per evitare sovrapposizioni.

REQUISITO FONDAMENTALE STRICT SCHEMA:
Devi restituire ESCLUSIVAMENTE codice JSON grezzo (senza formattazione markdown \`\`\`json). L'output deve corrispondere esattamente allo schema JSON in uscita:
{
  "pharmacyName": "string",
  "date": "string",
  "appointments": [
    {
      "time": "string",
      "patientName": "string",
      "phone": "string",
      "luogo": "string"
    }
  ],
  "rawText": "string"
}
Per il campo "rawText" riporta un log di debug testuale "Time -> Patient - Phone - Note" unito da \n.
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                prompt,
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: mimeType
                    }
                }
            ],
            config: {
                temperature: 0.1, // Bassa temperatura per parsing preciso e deterministico
                responseMimeType: "application/json"
            }
        });

        const textRes = response.text;
        const parsedJson = JSON.parse(textRes);

        res.json(parsedJson);
    } catch (error) {
        console.error('Errore Gemini API (Multimodal OCR):', error);
        res.status(500).json({ error: 'Errore durante l analisi del foglio con l IA' });
    }
});

// ==========================================
// 2. ENDPOINT GMAIL API
// ==========================================
apiRouter.post('/send-mail', async (req, res) => {
    const { to, subject, message, accessToken } = req.body;

    if (!to || !subject || !message || !accessToken) {
        return res.status(400).json({ error: 'Campi mancanti: to, subject, message o accessToken' });
    }

    try {
        const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
        oAuth2Client.setCredentials({ access_token: accessToken });

        const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

        // Crea un'email codificata in Base64 (Standard RFC 2822 Web Safe Base64)
        const emailLines = [
            `To: ${to}`,
            'Content-type: text/html;charset=iso-8859-1',
            'MIME-Version: 1.0',
            `Subject: ${subject}`,
            '',
            message
        ];

        const email = emailLines.join('\r\n');
        const base64EncodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        const response = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: base64EncodedEmail,
            },
        });

        res.json({ success: true, messageId: response.data.id });
    } catch (error) {
        console.error('Errore Gmail API:', error);
        res.status(500).json({ error: 'Errore durante l invio dell email' });
    }
});

// ==========================================
// 3. ENDPOINT GOOGLE SHEETS API (Sincronizzazione DB)
// ==========================================
apiRouter.post('/sync-sheet', async (req, res) => {
    try {
        const { appointments } = req.body;
        if (!appointments || !Array.isArray(appointments) || appointments.length === 0) {
            return res.status(400).json({ error: 'Nessun appuntamento da sincronizzare fornito' });
        }

        const sheetId = process.env.GOOGLE_SHEETS_ID;
        if (!sheetId) {
            return res.status(500).json({ error: 'GOOGLE_SHEETS_ID non configurato nel file .env' });
        }

        // 1. Autenticazione con il Service Account (supporta sia file locale che JSON in variabile d'ambiente)
        const authOptions = {
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        };
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
            authOptions.credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        } else {
            authOptions.keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        }

        const auth = new google.auth.GoogleAuth(authOptions);
        const sheets = google.sheets({ version: 'v4', auth });

        // Nome del foglio di default (normalmente "Foglio1" o "Sheet1")
        // Leggiamo la meta informazione del file per prendere il nome corretto
        const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
        const sheetName = spreadsheetMeta.data.sheets[0].properties.title;

        // 2. Lettura dei dati attuali per controllare i duplicati 
        // (Assumiamo che le colonne siano: Farmacia, Data, Ora, Paziente, Telefono, Note)
        const readResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!A:Z`,
        });
        const currentRows = readResponse.data.values || [];

        // Se il foglio è completamente vuoto, potremmo voler inserire un'intestazione
        let hasHeaders = currentRows.length > 0;
        const newRowsToInsert = [];

        if (!hasHeaders) {
            newRowsToInsert.push(['Farmacia', 'Data Appuntamento', 'Orario', 'Paziente', 'Telefono', 'Note', 'Data Sincronizzazione', 'Stato Chiamata']);
        }

        // Memorizza i dati in un formato comodo per il controllo duplicati (Farmacia + Data + Ora + Paziente)
        const existingSignatures = new Set(
            currentRows.map(row => `${row[0]}_${row[1]}_${row[2]}_${row[3]}`.toLowerCase())
        );

        let insertedCount = 0;
        let duplicateCount = 0;

        for (const apt of appointments) {
            // apt = { pharmacyId, pharmacyName, dateStr, timeSlot, firstName, lastName, phone, notes }
            // Nota: pharmacyName potrebbe non essere dentro l'oggetto state "appointments" che fa riferimento all'ID. Dobbiamo farlo preparare dal Frontend.

            const pName = apt.pharmacyName || apt.pharmacyId || 'Sconosciuta';
            const sig = `${pName}_${apt.dateStr}_${apt.timeSlot}_${apt.firstName} ${apt.lastName}`.toLowerCase().trim();

            if (existingSignatures.has(sig)) {
                duplicateCount++;
                continue; // Salta se esiste già
            }

            // Nuova riga
            existingSignatures.add(sig); // Evita duplicati nella stessa passata
            newRowsToInsert.push([
                pName,
                apt.dateStr,
                apt.timeSlot,
                `${apt.firstName} ${apt.lastName}`.trim(),
                apt.phone || '',
                apt.notes || '',
                new Date().toISOString(),
                '', // H: Stato Chiamata (vuoto all'inizio)
                '', // I: Esito Visita
                '', // J: Venduto
                '', // K: Follow Up
                ''  // L: Data Rivisita
            ]);
            insertedCount++;
        }

        // 3. Append su Google Sheets se ci sono nuove righe
        if (newRowsToInsert.length > 0) {
            await sheets.spreadsheets.values.append({
                spreadsheetId: sheetId,
                range: `${sheetName}!A:H`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: newRowsToInsert,
                },
            });
        }

        res.json({ success: true, inserted: insertedCount, duplicated: duplicateCount });

    } catch (error) {
        console.error('Errore Sincronizzazione Sheets:', error);
        res.status(500).json({ error: 'Errore durante la comunicazione con Google Sheets' });
    }
});

// ==========================================
// 4. CRON JOB E INVIO EMAIL A MARISA
// ==========================================
async function generateAndSendCallList() {
    try {
        console.log(" Avvio job schedulato per la Lista Chiamate di Marisa...");

        const sheetId = process.env.GOOGLE_SHEETS_ID;
        const marisaEmail = process.env.MARISA_EMAIL;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;

        if (!sheetId || !marisaEmail || !smtpUser || !smtpPass) {
            console.error("ERRORE CRON: Dati ambientali mancanti (Sheets ID o Credenziali SMTP).");
            return { success: false, error: 'Variabili d ambiente mancanti.' };
        }

        // 1. Calcolo Data Target (Oggi + 2 giorni)
        const target = new Date();
        target.setDate(target.getDate() + 2);
        const yyyy = target.getFullYear();
        const mm = String(target.getMonth() + 1).padStart(2, '0');
        const dd = String(target.getDate()).padStart(2, '0');
        const targetDateStr = `${yyyy}-${mm}-${dd}`;
        const targetDateDisplay = target.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

        // 2. Lettura da Google Sheets
        const authOptions = {
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        };
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
            authOptions.credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        } else {
            authOptions.keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        }

        const auth = new google.auth.GoogleAuth(authOptions);
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
        const sheetName = spreadsheetMeta.data.sheets[0].properties.title;

        const readResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!A:G`, // Assumendo le colonne usate in precedenza
        });
        const rows = readResponse.data.values || [];

        // 3. Filtro per data target e raggruppamento per Farmacia
        const targetAppointments = rows.filter(row => row[1] === targetDateStr);
        if (targetAppointments.length === 0) {
            console.log(` Nessun appuntamento trovato per il ${targetDateStr}. Email annullata.`);
            return { success: true, message: 'Nessun appuntamento, email saltata.', skipped: true };
        }

        const grouped = {};
        for (const row of targetAppointments) {
            const farmacia = row[0] || 'Sconosciuta';
            if (!grouped[farmacia]) grouped[farmacia] = [];
            grouped[farmacia].push({
                orario: row[2] || '--:--',
                paziente: row[3] || 'N/A',
                telefono: row[4] || '-',
                note: row[5] || ''
            });
        }

        // Ordina orari
        Object.keys(grouped).forEach(k => {
            grouped[k].sort((a, b) => a.orario.localeCompare(b.orario));
        });

        // 4. Costruzione HTML Email
        let htmlBody = `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #4F46E5; margin: 0;">Lista Promemoria Chiamate</h2>
                    <h3 style="margin-top: 5px; color: #555;">Da effettuare per gli appuntamenti del: <strong>${targetDateDisplay.toUpperCase()}</strong></h3>
                </div>
                <p>Ciao Marisa,<br>ecco la lista degli appuntamenti previsti tra due giorni da confermare telefonicamente:</p>
                <hr style="border: none; border-top: 1px solid #ddd;" />
        `;

        for (const [farmacia, apps] of Object.entries(grouped)) {
            htmlBody += `
                <div style="margin-bottom: 25px;">
                    <h4 style="background: #e2e8f0; padding: 10px; border-left: 4px solid #4F46E5; margin-bottom: 0;">📍 Farmacia: ${farmacia.toUpperCase()}</h4>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr style="background: #f8fafc; text-align: left;">
                                <th style="padding: 8px; border: 1px solid #ccd;">Orario</th>
                                <th style="padding: 8px; border: 1px solid #ccd;">Paziente</th>
                                <th style="padding: 8px; border: 1px solid #ccd;">Telefono</th>
                                <th style="padding: 8px; border: 1px solid #ccd;">Note</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            for (const a of apps) {
                htmlBody += `
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ccd; font-weight: bold;">${a.orario}</td>
                                <td style="padding: 8px; border: 1px solid #ccd;">${a.paziente}</td>
                                <td style="padding: 8px; border: 1px solid #ccd;">${a.telefono}</td>
                                <td style="padding: 8px; border: 1px solid #ccd; font-style: italic; color: #666;">${a.note}</td>
                            </tr>
                `;
            }
            htmlBody += `
                        </tbody>
                    </table>
                </div>
            `;
        }

        htmlBody += `
                <div style="text-align: center; margin-top: 30px;">
                    <p style="font-size: 16px; color: #555; margin-bottom: 10px;">Clicca sul pulsante qui sotto per aprire il cruscotto e spuntare le chiamate effettuate:</p>
                    <a href="${process.env.APP_URL || 'http://localhost:5173'}/conferma-chiamate?date=${targetDateStr}" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                        APRI PORTALE CONFERME
                    </a>
                </div>
                <br><br>
                <p style="font-size: 12px; color: #999; text-align: center;">Questa email è generata automaticamente dal sistema gestionale appuntamenti.</p>
            </div>
        `;

        // 5. Invio Email con Nodemailer
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: smtpUser,
                pass: smtpPass
            }
        });

        const mailOptions = {
            from: `"Gestionale Appuntamenti" <${smtpUser}>`,
            to: marisaEmail,
            subject: `📞 Promemoria Chiamate: Appuntamenti del ${targetDateStr}`,
            html: htmlBody
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(` Email inviata a ${marisaEmail} con successo! ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId, html: htmlBody };

    } catch (error) {
        console.error("ERRORE durante la generazione o invio dell'email:", error);
        return { success: false, error: error.message };
    }
}

// Schedulazione: Ogni mattina alle 08:00 (Fuso Orario del server locale)
// Attivata solo fuori da Netlify/Produzione perché in Serverless non persistono i timers
if (!process.env.NETLIFY && process.env.NODE_ENV !== 'production') {
    cron.schedule('0 8 * * *', () => {
        generateAndSendCallList();
    });
}

// Endpoint Manuale per testare l'invio immediatamente dal browser o dal frontend
apiRouter.get('/test-cron-email', async (req, res) => {
    const result = await generateAndSendCallList();
    if (result.success) {
        res.json({ message: "Job eseguito con successo", detail: result });
    } else {
        res.status(500).json({ error: "Errore durante l'esecuzione del job", detail: result.error });
    }
});

// ==========================================
// 5. ENDPOINT PORTALE CONFERMA CHIAMATE
// ==========================================

// GET: Recupera gli appuntamenti di una data specifica (con ID Riga per poterli aggiornare)
apiRouter.get('/calls-for-date', async (req, res) => {
    try {
        const dateStr = req.query.date; // es. 2026-03-05
        if (!dateStr) return res.status(400).json({ error: 'Manca il parametro date' });

        const sheetId = process.env.GOOGLE_SHEETS_ID;
        const authOptions = {
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        };
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
            authOptions.credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        } else {
            authOptions.keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        }
        const auth = new google.auth.GoogleAuth(authOptions);
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
        const sheetName = spreadsheetMeta.data.sheets[0].properties.title;

        // Recuperiamo i dati e ci portiamo dietro anche l'indice di riga originario
        const readResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!A:L`,
        });
        const rows = readResponse.data.values || [];

        const appointmentsForDate = [];

        // rows[0] è solitamente l'header, quindi partiamo da i=1 se ha senso, o mappiamo tutto e filtriamo.
        // L'indice in Google Sheets è 1-based. Quindi row 0 su array JS = riga 1 su Sheet.
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (row[1] === dateStr) {
                const statusValue = row[7] || ''; // Colonna H è all'indice 7
                appointmentsForDate.push({
                    rowIndex: i + 1, // +1 per le API e l'UI Sheets
                    farmacia: row[0] || '',
                    data: row[1] || '',
                    orario: row[2] || '',
                    paziente: row[3] || '',
                    telefono: row[4] || '',
                    note: row[5] || '',
                    status: statusValue.includes('Confermato') ? 'confermato' : statusValue.includes('Annullato') ? 'annullato' : 'attesa',
                    esitoVisita: row[8] || '', // Colonna I
                    venduto: row[9] || '',     // Colonna J
                    followUp: row[10] || '',   // Colonna K
                    dataRivisita: row[11] || ''// Colonna L
                });
            }
        }

        res.json({ success: true, count: appointmentsForDate.length, data: appointmentsForDate });

    } catch (err) {
        console.error("Errore fetch date:", err);
        res.status(500).json({ error: "Errore lettura Sheets" });
    }
});

// POST: Aggiorna in blocco le Note su Google Sheets prendendo le spunte (Confermato/Annullato)
apiRouter.post('/update-call-status', async (req, res) => {
    try {
        const { updates } = req.body;
        // updates = array di oggetti: { rowIndex: 2, newStatus: 'confermato', originalNotes: 'chiamare casa' }

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.json({ success: true, message: 'Nessun aggiornamento richiesto' });
        }

        const sheetId = process.env.GOOGLE_SHEETS_ID;
        const authOptions = {
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        };
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
            authOptions.credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        } else {
            authOptions.keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        }
        const auth = new google.auth.GoogleAuth(authOptions);
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
        const sheetName = spreadsheetMeta.data.sheets[0].properties.title;

        // Prepariamo l'array batch per l'aggiornamento
        const dataForBatch = updates.map(u => {
            let finalStatus = '';

            if (u.newStatus === 'confermato') finalStatus = 'Confermato';
            if (u.newStatus === 'annullato') finalStatus = 'Annullato';

            return {
                range: `${sheetName}!H${u.rowIndex}`, // Colonna H per lo 'Stato Chiamata'
                values: [[finalStatus]]
            };
        });

        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: sheetId,
            requestBody: {
                valueInputOption: "USER_ENTERED",
                data: dataForBatch
            }
        });

        res.json({ success: true, updatedRows: updates.length });

    } catch (err) {
        console.error("Errore update note sheets:", err);
        res.status(500).json({ error: "Errore scrittura su Sheets" });
    }
});

// POST: Aggiorna l'esito della visita (Colonne I:L)
apiRouter.post('/update-visit-outcome', async (req, res) => {
    try {
        const { rowIndex, esitoVisita, venduto, followUp, dataRivisita } = req.body;

        if (!rowIndex) return res.status(400).json({ error: 'Manca rowIndex' });

        const sheetId = process.env.GOOGLE_SHEETS_ID;
        const authOptions = {
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        };
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
            authOptions.credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        } else {
            authOptions.keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        }
        const auth = new google.auth.GoogleAuth(authOptions);
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
        const sheetName = spreadsheetMeta.data.sheets[0].properties.title;

        // Scriviamo nel range I{rowIndex}:L{rowIndex}
        const range = `${sheetName}!I${rowIndex}:L${rowIndex}`;
        // Follow up viene salvato come 'Sì' o 'No' per rendere leggibile il foglio
        const followUpText = followUp ? 'Sì' : 'No';
        const values = [[esitoVisita || '', venduto || '', followUpText, dataRivisita || '']];

        await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: range,
            valueInputOption: "USER_ENTERED",
            requestBody: { values }
        });

        res.json({ success: true, message: 'Esito visita salvato' });

    } catch (err) {
        console.error("Errore salvataggio esito visita:", err);
        res.status(500).json({ error: "Errore scrittura su Sheets" });
    }
});

// GET: Recupera Pazienti Follow-Up / Anticipo Visita (Filtro per Farmacia)
apiRouter.get('/follow-ups', async (req, res) => {
    try {
        const farmaciaTarget = req.query.farmacia; // es. SOPRAPONTE
        if (!farmaciaTarget) return res.status(400).json({ error: 'Manca il parametro farmacia' });

        const sheetId = process.env.GOOGLE_SHEETS_ID;
        const authOptions = {
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        };
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
            authOptions.credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        } else {
            authOptions.keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        }
        const auth = new google.auth.GoogleAuth(authOptions);
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
        const sheetName = spreadsheetMeta.data.sheets[0].properties.title;

        const readResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!A:L`,
        });
        const rows = readResponse.data.values || [];

        const followUps = [];

        // Ignoriamo riga 0 (header)
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const farmaciaCorrente = row[0] || '';
            const statusChiamata = row[7] || '';

            // Verifichiamo che sia della stessa farmacia
            if (farmaciaCorrente.toLowerCase() === farmaciaTarget.toLowerCase()) {
                const followUp = row[10] || '';   // Colonna K
                const dataRivisita = row[11] || '';// Colonna L

                // Se richiede Follow-up (Sì) o ha una Data Rivisita e non è palesemente Annullato
                if ((followUp === 'Sì' || dataRivisita !== '') && !statusChiamata.includes('Annullato')) {
                    followUps.push({
                        rowIndex: i + 1,
                        farmacia: farmaciaCorrente,
                        data: row[1] || '',
                        orario: row[2] || '',
                        paziente: row[3] || '',
                        telefono: row[4] || '',
                        note: row[5] || '',
                        esitoVisita: row[8] || '', // Esito Precedente
                        dataRivisita: dataRivisita
                    });
                }
            }
        }

        res.json({ success: true, count: followUps.length, data: followUps });

    } catch (err) {
        console.error("Errore fetch follow-ups:", err);
        res.status(500).json({ error: "Errore lettura Sheets per Follow-ups" });
    }
});

// GET: Statistiche Dashboard (KPIs & Grafici)
apiRouter.get('/stats', async (req, res) => {
    try {
        const sheetId = process.env.GOOGLE_SHEETS_ID;
        const authOptions = {
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        };
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
            authOptions.credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        } else {
            authOptions.keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        }
        const auth = new google.auth.GoogleAuth(authOptions);
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
        const sheetName = spreadsheetMeta.data.sheets[0].properties.title;

        // Estrae tutto il tabellone A:L
        const readResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!A:L`,
        });
        const rows = readResponse.data.values || [];

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        let appuntamentiMeseCorrente = 0;
        let appuntamentiAttesa = 0; // Liberi / In Attesa
        let daRicontattare = 0; // Follow up = 'Sì'

        // Per Tasso di Conversione
        let totaleEsitati = 0;
        let totaleVenduti = 0;

        // Dati Grafico Torta Esiti
        const esitiDistribuzione = {
            venduti: 0,
            nonVenduti: 0,
            inValutazione: 0
        };

        // Dati Grafico Trend Mese su Mese
        const trendMensileMap = {};
        const monthNames = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const dateStr = row[1]; // Colonna B Data (YYYY-MM-DD)
            const statusValue = row[7] || ''; // Colonna H Status
            const venduto = row[9] || ''; // Colonna J Venduto
            const followUp = row[10] || ''; // Colonna K Follow Up
            const dataRivisita = row[11] || ''; // Colonna L

            // 1. Pazienti da ricontattare (Globale, non solo del mese)
            if (followUp.toLowerCase() === 'sì' || dataRivisita !== '') {
                daRicontattare++;
            }

            if (!dateStr) continue;

            // Fix per date nel formato foglio (se diverso da YYYY-MM-DD)
            let rowDate = new Date(dateStr);
            if (isNaN(rowDate.getTime())) {
                // Riprova parse se formato DD/MM/YYYY
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    rowDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                }
            }
            if (isNaN(rowDate.getTime())) continue;

            const rowMonth = rowDate.getMonth();
            const rowYear = rowDate.getFullYear();

            // 2. Popola dati storici Trend Mensile (solo anno corrente)
            if (rowYear === currentYear) {
                const mName = monthNames[rowMonth];
                if (!trendMensileMap[mName]) trendMensileMap[mName] = 0;
                trendMensileMap[mName]++;
            }

            // Statistiche solo per MESE CORRENTE
            if (rowMonth === currentMonth && rowYear === currentYear) {
                appuntamentiMeseCorrente++;

                if (statusValue.toLowerCase().includes('attesa')) {
                    appuntamentiAttesa++;
                }

                if (venduto) {
                    totaleEsitati++;
                    if (venduto === 'Sì') {
                        totaleVenduti++;
                        esitiDistribuzione.venduti++;
                    } else if (venduto === 'No') {
                        esitiDistribuzione.nonVenduti++;
                    } else if (venduto === 'In Valutazione') {
                        esitiDistribuzione.inValutazione++;
                    }
                }
            }
        }

        const conversionRate = totaleEsitati > 0 ? Math.round((totaleVenduti / totaleEsitati) * 100) : 0;

        // Formato array per recharts {name, value}
        const chartEsiti = [
            { name: 'Venduti', value: esitiDistribuzione.venduti, fill: '#10b981' },
            { name: 'In Valutazione', value: esitiDistribuzione.inValutazione, fill: '#f59e0b' },
            { name: 'Non Venduti', value: esitiDistribuzione.nonVenduti, fill: '#ef4444' }
        ].filter(item => item.value > 0); // Nascondi le fette a zero

        const chartTrend = Object.keys(trendMensileMap).map(m => ({
            mese: m,
            appuntamenti: trendMensileMap[m]
        }));

        res.json({
            success: true,
            data: {
                kpi: {
                    appuntamentiMese: appuntamentiMeseCorrente,
                    appuntamentiAttesa: appuntamentiAttesa,
                    tassoConversione: conversionRate,
                    daRicontattare: daRicontattare
                },
                charts: {
                    esiti: chartEsiti,
                    trend: chartTrend
                }
            }
        });

    } catch (err) {
        console.error("Errore fetch stats dashboard:", err);
        res.status(500).json({ error: "Errore lettura Sheets per statistiche" });
    }
});

// Montiamo il router sia su / che su /api per massima compatibilità con Netlify e locale
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Esporta l'handler per Netlify Functions
export const handler = serverless(app);

// Avvia il server solo se non siamo in ambiente serverless (Netlify)
if (process.env.NODE_ENV !== 'production' || !process.env.NETLIFY) {
    app.listen(port, () => {
        console.log(`Server Backend in esecuzione su http://localhost:${port}`);
    });
}

