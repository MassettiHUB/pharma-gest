import { createContext, useContext, useState, useEffect } from 'react';
import type { Pharmacy, PharmacyContextType, PlanWeek, CalendarOverrides, Appointment } from '../types/pharmacy';

const PharmacyContext = createContext<PharmacyContextType | undefined>(undefined);

const DEFAULT_PHARMACIES: Pharmacy[] = [
    { id: '1', name: 'SOPRAPONTE', address: 'GAVARDO', notes: 'Informatore: MAURO', workingDays: 1 },
    { id: '2', name: 'SAN G. BATTISTA', address: 'LONATO', notes: 'Informatore: MAURO', workingDays: 1 },
    { id: '3', name: 'SAN ANTONIO', address: 'LONATO', notes: 'Informatore: MAURO', workingDays: 1 },
    { id: '4', name: 'PORTESI', address: 'REZZATO', notes: 'Informatore: TEAM', workingDays: 1 },
    { id: '5', name: 'DR.MAX montichiari', address: 'MONTICHIARI', notes: 'Informatore: MAURO', workingDays: 1 },
    { id: '6', name: 'DR. MAX PIAZZA MORO', address: 'OSPITALETTO', notes: 'Informatore: TEAM', workingDays: 1 },
    { id: '7', name: 'DR.MAX calvisano', address: 'CALVISANO', notes: 'Informatore: MAURO', workingDays: 1 },
    { id: '8', name: 'COMUNALE', address: 'COCCAGLIO', notes: 'Informatore: TEAM', workingDays: 1 },
    { id: '9', name: 'CAPOLAPERRA', address: 'DESENZANO', notes: 'Informatore: MAURO', workingDays: 1 },
    { id: '10', name: 'PHARMAPIA', address: 'PREVALLE', notes: 'Informatore: MAURO', workingDays: 1 },
    { id: '11', name: 'MAZZUCCHELLI', address: 'CASTENEDOLO', notes: 'Informatore: MAURO', workingDays: 1 },
    { id: '12', name: 'LA FARMACIA DEI SANTI', address: 'BRESCIA', notes: 'Informatore: TEAM', workingDays: 1 },
    { id: '13', name: 'comunale castenedollo', address: 'CASTENEDOLO', notes: 'Informatore: MAURO', workingDays: 1 },
    { id: '14', name: 'DR.MAX PADANA', address: 'OSPITALETTO', notes: 'Informatore: TEAM', workingDays: 1 },
    { id: '15', name: 'FARM. PELLACANI', address: 'AGNOSINE', notes: 'Informatore: TEAM', workingDays: 1 },
    { id: '16', name: 'LAFARMACIA. ACUTO', address: 'BRESCIA', notes: 'Informatore: TEAM', workingDays: 1 },
    { id: '17', name: 'DR.MAX GHIDONI', address: 'OSPITALETTO', notes: 'Informatore: TEAM', workingDays: 1 },
    { id: '18', name: 'farmacia OSPEDALE', address: 'BRESCIA', notes: 'Informatore: TEAM', workingDays: 1 },
    { id: '19', name: 'FARMACIA LA MADDALENA', address: 'BOTTICINO', notes: 'Informatore: MARISA', workingDays: 1 },
    { id: '20', name: 'FARMACIA FOSSATI', address: 'LUMEZZANE', notes: 'Informatore: MAURO', workingDays: 1 },
    { id: '21', name: 'FARMACIA S. APPOLLONIO', address: 'LUMEZZANE', notes: 'Informatore: TEAM', workingDays: 1 },
    { id: '22', name: 'san gottardo', address: 'trenzano', notes: 'Informatore: TEAM', workingDays: 1 },
    { id: '23', name: 'ipocrates zanardelli', address: 'ospitaletto', notes: 'Informatore: TEAM', workingDays: 1 },
    { id: '24', name: 'REZZATO GIOVANNI 23', address: 'REZZATO', notes: 'Informatore: TEAM', workingDays: 1 },
    { id: '25', name: 'VALLIO', address: 'VALLIO', notes: 'Informatore: MARISA', workingDays: 1 },
    { id: '26', name: 'ZADEI', address: 'BRESCIA', notes: 'Informatore: MARISA', workingDays: 1 },
    { id: '27', name: 'SANT ANTONIO', address: 'BRESCIA', notes: 'Informatore: MARISA', workingDays: 1 },
    { id: '28', name: 'GHEDI UNO', address: 'GHEDI', notes: 'Informatore: MARISA', workingDays: 1 },
    { id: '29', name: 'GHEDI DUE', address: 'GHEDI', notes: 'Informatore: MARISA', workingDays: 1 },
    { id: '30', name: 'GHEDI TRE', address: 'GHEDI', notes: 'Informatore: MARISA', workingDays: 1 },
    { id: '31', name: 'SIMONI', address: 'FORNACI', notes: 'Informatore: MARISA', workingDays: 1 }
];

const createEmptyPlan = (): PlanWeek[] => [1, 2, 3, 4].map(w => ({
    week: w,
    days: {
        LUN: { M: '', P: '' }, MAR: { M: '', P: '' }, MER: { M: '', P: '' },
        GIO: { M: '', P: '' }, VEN: { M: '', P: '' }, SAB: { M: '', P: '' }
    }
}));

export function PharmacyProvider({ children }: { children: React.ReactNode }) {
    const [currentUser, setCurrentUser] = useState<'Mauro' | 'Marisa'>(() => {
        const saved = localStorage.getItem('currentUser');
        return (saved === 'Marisa' || saved === 'Mauro') ? saved : 'Mauro';
    });

    useEffect(() => {
        localStorage.setItem('currentUser', currentUser);
    }, [currentUser]);

    const [genericPlan, setGenericPlan] = useState<PlanWeek[]>(() => {
        try {
            const saved = localStorage.getItem('genericPlan');
            if (!saved) return createEmptyPlan();
            return JSON.parse(saved);
        } catch {
            return createEmptyPlan();
        }
    });

    useEffect(() => {
        localStorage.setItem('genericPlan', JSON.stringify(genericPlan));
    }, [genericPlan]);

    const [calendarOverrides, setCalendarOverrides] = useState<CalendarOverrides>(() => {
        try {
            const saved = localStorage.getItem('calendarOverrides');
            if (!saved) return {};
            return JSON.parse(saved);
        } catch {
            return {};
        }
    });

    useEffect(() => {
        localStorage.setItem('calendarOverrides', JSON.stringify(calendarOverrides));
    }, [calendarOverrides]);

    const [pharmacies, setPharmacies] = useState<Pharmacy[]>(() => {
        try {
            const saved = localStorage.getItem('pharmacies');
            if (!saved || saved === 'undefined' || saved === 'null' || saved === '[]') return DEFAULT_PHARMACIES;
            return JSON.parse(saved);
        } catch (e) {
            console.error('Error parsing localStorage', e);
            localStorage.removeItem('pharmacies');
            return DEFAULT_PHARMACIES;
        }
    });

    useEffect(() => {
        localStorage.setItem('pharmacies', JSON.stringify(pharmacies));
    }, [pharmacies]);

    const addPharmacy = (p: Omit<Pharmacy, 'id'>) => {
        const newPharmacy: Pharmacy = { ...p, id: crypto.randomUUID() };
        setPharmacies((prev) => [...prev, newPharmacy]);
    };

    const updatePharmacy = (id: string, updates: Partial<Pharmacy>) => {
        setPharmacies((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    };

    const removePharmacy = (id: string) => {
        setPharmacies((prev) => prev.filter((p) => p.id !== id));
    };

    const [appointments, setAppointments] = useState<Appointment[]>(() => {
        try {
            const saved = localStorage.getItem('appointments');
            if (!saved) return [];
            return JSON.parse(saved);
        } catch {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('appointments', JSON.stringify(appointments));
    }, [appointments]);

    return (
        <PharmacyContext.Provider value={{ pharmacies, addPharmacy, updatePharmacy, removePharmacy, currentUser, setCurrentUser, genericPlan, setGenericPlan, calendarOverrides, setCalendarOverrides, appointments, setAppointments }}>
            {children}
        </PharmacyContext.Provider>
    );
}

export function usePharmacy() {
    const context = useContext(PharmacyContext);
    if (context === undefined) {
        throw new Error('usePharmacy must be used within a PharmacyProvider');
    }
    return context;
}
