// src/pages/electoral-calc/constants.js

export const partyColors = {
    'ND': '#1b5cc7',
    'SYRIZA': '#ee808f',
    'PASOK': '#007934',
    'KKE': '#e30301',
    'SP': '#E9B460',
    'EL': '#6BB6E6',
    'NIKI': '#910048',
    'PE': '#9F1897',
    'M25': '#EF3F24',
    'FL': '#020C6A',
    'NA': '#E11B22',
    'DPK': '#FF6600',
    'ELPIDA': '#E0B959',
    'ELAS': '#a40044',
    'INDEPENDENTS': '#6c757d',
    'VACANT': '#d1d5db',
};

// Baseline: Hellenic Parliament composition.
export const currentParliamentSeats = {
    ND: 156,
    SYRIZA: 24,
    PASOK: 32,
    KKE: 21,
    SP: 0,
    EL: 11,
    NIKI: 8,
    PE: 5,
    M25: 0,
    FL: 0,
    NA: 0,
    DPK: 0,
    ELPIDA: 0,
    ELAS: 0,
    INDEPENDENTS: 40,
    VACANT: 3,
};

export const forecastDefaults = {
    dropoutPct: 5,
    pollBase: '180d',
    electionDate: '2026-09-27',
    useSampleWeight: true,
    useNDCorrection: true,
    useHouseEffects: true,
    useLeadCompression: true,
    useThresholdRisk: true,
    momentumPct: 50,
    reversionPct: 20,
};
