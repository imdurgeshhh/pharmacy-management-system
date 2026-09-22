export const SCHEDULE_CONFIG = {
    NONE: {
        label: 'None / OTC',
        shortLabel: 'OTC / None',
        badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border-slate-300/80 dark:border-slate-700',
        dotClass: 'bg-slate-400',
        description: 'Freely sold over the counter'
    },
    G: {
        label: 'Schedule G',
        shortLabel: 'Schedule G',
        badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        dotClass: 'bg-blue-500',
        description: 'Requires caution & medical guidance'
    },
    H: {
        label: 'Schedule H',
        shortLabel: 'Schedule H',
        badgeClass: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        dotClass: 'bg-amber-500',
        description: 'Prescription required to purchase'
    },
    H1: {
        label: 'Schedule H1',
        shortLabel: 'Schedule H1',
        badgeClass: 'bg-orange-50 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border-orange-300 dark:border-orange-800 font-semibold',
        dotClass: 'bg-orange-500',
        description: 'Prescription + Register tracking required'
    },
    X: {
        label: 'Schedule X',
        shortLabel: 'Schedule X',
        badgeClass: 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300 border-red-300 dark:border-red-800 font-bold tracking-wide',
        dotClass: 'bg-red-600 animate-pulse',
        description: 'Strict Narcotic / Psychotropic control (duplicate Rx)'
    }
};

export const SCHEDULE_OPTIONS = [
    { value: 'NONE', label: 'None / OTC (Over the Counter)' },
    { value: 'G', label: 'Schedule G (Medical Caution)' },
    { value: 'H', label: "Schedule H (Doctor's Rx Required)" },
    { value: 'H1', label: 'Schedule H1 (Controlled Antibiotic / Sedative)' },
    { value: 'X', label: 'Schedule X (Narcotics / Psychotropics)' }
];
