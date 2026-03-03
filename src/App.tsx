import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Home } from './pages/Home';
import { Farmacie } from './pages/Farmacie';
import { Planning } from './pages/Planning';
import { CalendarSync } from './pages/CalendarSync';
import { Appointments } from './pages/Appointments';
import { OCR } from './pages/OCR';
import { GoogleServices } from './pages/GoogleServices';
import { CallConfirmations } from './pages/CallConfirmations';
import { Giornate } from './pages/Giornate';
import { Dashboard } from './pages/Dashboard';
import { PharmacyProvider } from './context/PharmacyContext';

function App() {
    return (
        <PharmacyProvider>
            <BrowserRouter>
                <div className="app-layout">
                    <Navigation />
                    <main className="main-content">
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/farmacie" element={<Farmacie />} />
                            <Route path="/planning" element={<Planning />} />
                            <Route path="/giornate" element={<Giornate />} />
                            <Route path="/calendar" element={<CalendarSync />} />
                            <Route path="/appointments" element={<Appointments />} />
                            <Route path="/conferma-chiamate" element={<CallConfirmations />} />
                            <Route path="/ocr" element={<OCR />} />
                            <Route path="/google" element={<GoogleServices />} />
                        </Routes>
                    </main>
                </div>
            </BrowserRouter>
        </PharmacyProvider>
    );
}

export default App;
