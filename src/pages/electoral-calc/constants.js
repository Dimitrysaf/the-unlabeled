// src/pages/electoral-calc/constants.js

export const partyColors = {
    'ND': '#1d4e89',
    'SYRIZA': '#ff4b4b',
    'PASOK': '#00a14b',
    'KKE': '#ed1c24',
    'SP': '#c1a01b',
    'EL': '#0d3b66',
    'NIKI': '#5e4b3c',
    'PE': '#8a2be2',
    'M25': '#e20074',
    'FL': '#0097a7',
    'NA': '#ff1744',
    'DPK': '#424242',
};

// Baseline: Hellenic Parliament composition (Wikipedia, accessed 2026-04-28).
export const currentParliamentSeats = {
    ND: 156,
    SYRIZA: 25,
    PASOK: 32,
    KKE: 21,
    SP: 2,
    EL: 11,
    NIKI: 8,
    PE: 5,
    M25: 0,
    FL: 0,
    NA: 0,
    DPK: 0,
};

export const forecastDefaults = {
    dropoutPct: 5,
    pollBase: '180d',
    electionDate: '2027-05-05',
    useSampleWeight: true,
    useNDCorrection: true,
    useHouseEffects: true,
    useLeadCompression: true,
    useThresholdRisk: true,
    momentumPct: 50,
    reversionPct: 20,
};