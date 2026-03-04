export interface Pharmacy {
    id: string;
    name: string;
    address: string;
    phone?: string;
    workingDays: number; // Giorni di presenza attesi al mese
    notes?: string;
}

export interface PlanDay {
    M: string;
    P: string;
}

export interface PlanWeek {
    week: number;
    days: Record<string, PlanDay>;
}

export interface Appointment {
    id: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    phone: string;
    pharmacyId: string;
    notes: string;
    status: 'Confermato' | 'In attesa' | 'Annullato';
    isDuplicate: boolean;
    firstAppointmentDate?: string;
    dateStr: string;
    timeSlot: string;
}

export type DailyOverride = {
    M?: string | null; // ID to override, null to clear fallback
    P?: string | null;
};

export type CalendarOverrides = Record<string, DailyOverride>; // key: YYYY-MM-DD

export type PharmacyContextType = {
    pharmacies: Pharmacy[];
    addPharmacy: (p: Omit<Pharmacy, 'id'>) => void;
    updatePharmacy: (id: string, p: Partial<Pharmacy>) => void;
    removePharmacy: (id: string) => void;
    currentUser: 'Mauro' | 'Marisa';
    setCurrentUser: (u: 'Mauro' | 'Marisa') => void;
    genericPlan: PlanWeek[];
    setGenericPlan: (plan: PlanWeek[]) => void;
    calendarOverrides: CalendarOverrides;
    setCalendarOverrides: (overrides: CalendarOverrides) => void;
    appointments: Appointment[];
    setAppointments: (a: Appointment[]) => void;
    googleUser: any;
    googleToken: string | null;
    selectedCalendarId: string | null;
    setSelectedCalendarId: (id: string | null) => void;
    loginWithGoogle: () => void;
    logoutGoogle: () => void;
};
