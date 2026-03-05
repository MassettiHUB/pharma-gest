import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Store, Calendar, CalendarCheck2, ListTodo, Camera, User, Cloud, LayoutDashboard, Menu, X } from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';

export function Navigation() {
    const { currentUser, setCurrentUser, googleUser, loginWithGoogle, logoutGoogle } = usePharmacy();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const closeMenu = () => setIsMenuOpen(false);

    return (
        <nav className="navbar">
            <div className="nav-container">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }} className="nav-mobile-header">
                    <h1 className="nav-logo">PharmaMas</h1>
                    <button className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
                <ul className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
                    <li>
                        <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
                            <Home size={18} /> Home
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
                            <LayoutDashboard size={18} /> Prestazioni
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/farmacie" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
                            <Store size={18} /> Farmacie
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/planning" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
                            <Calendar size={18} /> Planning Mensile
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/giornate" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
                            <CalendarCheck2 size={18} /> Giornate (Riepilogo)
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/calendar" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
                            <Cloud size={18} /> Sync Google
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/appointments" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
                            <ListTodo size={18} /> Appuntamenti
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/ocr" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
                            <Camera size={18} /> OCR
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/google" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMenu}>
                            <Cloud size={18} /> Google API
                        </NavLink>
                    </li>
                </ul>
                <div className={`nav-user-actions ${isMenuOpen ? 'open' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', padding: '0.3rem 0.8rem', borderRadius: '2rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                        <User size={16} />
                        <select
                            value={currentUser}
                            onChange={(e) => setCurrentUser(e.target.value as 'Mauro' | 'Marisa')}
                            style={{ background: 'transparent', color: 'inherit', border: 'none', outline: 'none', fontWeight: 600, cursor: 'pointer', appearance: 'none', fontSize: '0.85rem' }}
                        >
                            <option value="Mauro" style={{ color: '#000' }}>Mauro</option>
                            <option value="Marisa" style={{ color: '#000' }}>Marisa</option>
                        </select>
                    </div>

                    {googleUser ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.25rem', borderRadius: '2rem', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
                            <img
                                src={googleUser.picture}
                                alt={googleUser.name}
                                style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid white' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '0.75rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, lineHeight: 1 }}>{googleUser.given_name}</span>
                                <button
                                    onClick={logoutGoogle}
                                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem', padding: 0, textAlign: 'left', cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                    Esci
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={loginWithGoogle}
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', color: '#000' }}
                        >
                            <Cloud size={16} /> Accedi con Google
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}
