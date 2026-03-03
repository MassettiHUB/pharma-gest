import { NavLink } from 'react-router-dom';
import { Home, Store, Calendar, CalendarCheck2, ListTodo, Camera, User, Cloud, LayoutDashboard } from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';

export function Navigation() {
    const { currentUser, setCurrentUser } = usePharmacy();
    return (
        <nav className="navbar">
            <div className="nav-container">
                <h1 className="nav-logo">FarmaGest</h1>
                <ul className="nav-links">
                    <li>
                        <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')}>
                            <Home size={18} /> Home
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
                            <LayoutDashboard size={18} /> Prestazioni
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/farmacie" className={({ isActive }) => (isActive ? 'active' : '')}>
                            <Store size={18} /> Farmacie
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/planning" className={({ isActive }) => (isActive ? 'active' : '')}>
                            <Calendar size={18} /> Planning Mensile
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/giornate" className={({ isActive }) => (isActive ? 'active' : '')}>
                            <CalendarCheck2 size={18} /> Giornate (Riepilogo)
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/calendar" className={({ isActive }) => (isActive ? 'active' : '')}>
                            <Cloud size={18} /> Sync Google
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/appointments" className={({ isActive }) => (isActive ? 'active' : '')}>
                            <ListTodo size={18} /> Appuntamenti
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/ocr" className={({ isActive }) => (isActive ? 'active' : '')}>
                            <Camera size={18} /> OCR
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/google" className={({ isActive }) => (isActive ? 'active' : '')}>
                            <Cloud size={18} /> Google API
                        </NavLink>
                    </li>
                </ul>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '2rem' }}>
                    <User size={18} />
                    <select
                        value={currentUser}
                        onChange={(e) => setCurrentUser(e.target.value as 'Mauro' | 'Marisa')}
                        style={{ background: 'transparent', color: 'inherit', border: 'none', outline: 'none', fontWeight: 600, cursor: 'pointer', appearance: 'none' }}
                    >
                        <option value="Mauro" style={{ color: '#000' }}>Mauro</option>
                        <option value="Marisa" style={{ color: '#000' }}>Marisa</option>
                    </select>
                </div>
            </div>
        </nav>
    );
}
