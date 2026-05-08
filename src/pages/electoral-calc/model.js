// src/pages/electoral-calc/model.js
// Pure stateless computation functions — no DOM access, no module-level state.

// ── Seat allocation (Law 4654/2020) ──────────────────────────────────────

/** Allocates 300 Greek parliamentary seats using the D'Hondt bonus system. */
export function allocateGreekSeats(predicted) {
    const TOTAL = 300, THRESHOLD = 3.0;
    const eligible = Object.entries(predicted)
        .filter(([, v]) => v >= THRESHOLD)
        .sort((a, b) => b[1] - a[1]);

    if (!eligible.length) return {};

    const winnerParty = eligible[0][0];
    const winnerPct = eligible[0][1];

    let bonus = 0;
    if (winnerPct >= 25.0) bonus = Math.min(20 + Math.floor((winnerPct - 25.0) / 0.5), 50);

    const remaining = TOTAL - bonus;
    const totalPct = eligible.reduce((s, [, v]) => s + v, 0);
    const quotas = {};
    const seats = {};

    eligible.forEach(([party, pct]) => {
        const exact = (pct / totalPct) * remaining;
        quotas[party] = exact;
        seats[party] = Math.floor(exact);
    });

    let allocated = Object.values(seats).reduce((a, b) => a + b, 0);
    const remainders = Object.entries(quotas)
        .map(([p, q]) => [p, q - Math.floor(q)])
        .sort((a, b) => b[1] - a[1]);

    for (let i = 0; i < remaining - allocated; i++) seats[remainders[i][0]]++;
    seats[winnerParty] += bonus;
    return seats;
}

/** Adjusts predicted vote shares to account for threshold-failure risk. */
export function applyThresholdRisk(predicted, volatility) {
    const THRESHOLD = 3.0;
    const result = { ...predicted };
    let redistributed = 0;

    for (const [party, pct] of Object.entries(predicted)) {
        if (pct >= THRESHOLD && pct < 7.0) {
            const vol = volatility[party] || 0;
            const dist = pct - THRESHOLD;
            const failProb = Math.max(0, Math.min(0.75, vol * 0.5 * (1 - dist / 4)));
            const expectedLoss = pct * failProb;
            result[party] = pct - expectedLoss;
            redistributed += expectedLoss;
        }
    }

    if (redistributed > 0) {
        const safeParties = Object.entries(predicted).filter(([, v]) => v >= 7.0);
        const safeTotal = safeParties.reduce((s, [, v]) => s + v, 0);
        for (const [party, pct] of safeParties) {
            result[party] = (result[party] || pct) + redistributed * (pct / safeTotal);
        }
    }

    const total = Object.values(result).reduce((a, b) => a + b, 0);
    for (const p of Object.keys(result)) result[p] = total > 0 ? (result[p] / total) * 100 : 0;
    return result;
}

// ── Statistical helpers ───────────────────────────────────────────────────

/** Computes each firm's systematic polling bias vs. the cross-firm mean. */
export function computeHouseEffects(pollRows, partyIndices) {
    const firms = {};
    pollRows.forEach(row => {
        const firm = row[0].split('/')[0].trim();
        if (!firms[firm]) firms[firm] = [];
        firms[firm].push(row);
    });

    const overallAvg = {};
    for (const [party, idx] of Object.entries(partyIndices)) {
        const vals = pollRows.map(r => parseFloat(r[idx])).filter(v => !isNaN(v) && v > 0);
        overallAvg[party] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }

    const effects = {};
    for (const [firm, rows] of Object.entries(firms)) {
        if (rows.length < 3) continue;
        effects[firm] = {};
        for (const [party, idx] of Object.entries(partyIndices)) {
            const vals = rows.map(r => parseFloat(r[idx])).filter(v => !isNaN(v) && v > 0);
            if (!vals.length) continue;
            const firmAvg = vals.reduce((a, b) => a + b, 0) / vals.length;
            effects[firm][party] = firmAvg - overallAvg[party];
        }
    }
    return effects;
}

/** Linear-regression slope of recent poll values — positive = rising trend. */
export function computeMomentum(pollRows, partyIndices, N) {
    const recent = pollRows.slice(-Math.max(N, 3));
    const n = recent.length;
    if (n < 3) return {};

    const momentum = {};
    for (const [party, idx] of Object.entries(partyIndices)) {
        const pts = recent
            .map((r, i) => ({ x: i, y: parseFloat(r[idx]) }))
            .filter(p => !isNaN(p.y) && p.y > 0);

        if (pts.length < 3) { momentum[party] = 0; continue; }

        const xMean = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const yMean = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        const num = pts.reduce((s, p) => s + (p.x - xMean) * (p.y - yMean), 0);
        const den = pts.reduce((s, p) => s + (p.x - xMean) ** 2, 0);
        momentum[party] = den > 0 ? num / den : 0;
    }
    return momentum;
}

/** Change in slope (recent half vs. older half) — positive = accelerating upward. */
export function computeTrendAcceleration(pollRows, partyIndices, N) {
    const half = Math.max(3, Math.floor(N / 2));
    const recent = computeMomentum(pollRows.slice(-half), partyIndices, half);
    const older = computeMomentum(pollRows.slice(-N, -half), partyIndices, N - half);
    const result = {};
    for (const party of Object.keys(recent)) {
        result[party] = (recent[party] || 0) - (older[party] || 0);
    }
    return result;
}

/** Mean poll value over the full window — used as the mean-reversion target. */
export function computeLongRunAverage(pollRows, partyIndices) {
    const avg = {};
    for (const [party, idx] of Object.entries(partyIndices)) {
        const vals = pollRows.map(r => parseFloat(r[idx])).filter(v => !isNaN(v) && v > 0);
        avg[party] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }
    return avg;
}

/** Average difference between election result and pre-election polls for a party. */
export function computeNDBias(electionRows, pollRows, partyIndices, party) {
    const idx = partyIndices[party];
    if (idx === undefined || !electionRows.length) return 0;
    const biases = [];
    for (const elRow of electionRows) {
        const result = parseFloat(elRow[idx]);
        const electionDate = parsePollDate(elRow[3]);
        if (isNaN(result)) continue;
        if (!electionDate) continue;
        const priorPolls = pollRows
            .filter(r => {
                const pollDate = parsePollDate(r[3]);
                return pollDate && pollDate <= electionDate;
            })
            .slice(-10);
        if (!priorPolls.length) continue;
        const avg = priorPolls.reduce((sum, r) => sum + (parseFloat(r[idx]) || 0), 0) / priorPolls.length;
        biases.push(result - avg);
    }
    return biases.length ? biases.reduce((a, b) => a + b, 0) / biases.length : 0;
}

/** Normalized 0–1 poll range relative to mean — higher = more volatile. */
export function computeVolatility(pollRows, partyIndices) {
    const raw = {};
    for (const [party, idx] of Object.entries(partyIndices)) {
        const vals = pollRows.map(r => parseFloat(r[idx])).filter(v => !isNaN(v) && v > 0);
        if (vals.length < 2) { raw[party] = 0; continue; }
        const min = Math.min(...vals), max = Math.max(...vals);
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        raw[party] = mean > 0 ? (max - min) / mean : 0;
    }
    const maxVol = Math.max(...Object.values(raw));
    const result = {};
    for (const p of Object.keys(raw)) result[p] = maxVol > 0 ? raw[p] / maxVol : 0;
    return result;
}

/** 35–95 % confidence score per party, penalised by volatility and horizon. */
export function computeConfidenceScores(predicted, volatility, sampleCount, horizonDays) {
    const horizonPenalty = Math.min(20, horizonDays / 18);
    const sampleBonus = Math.min(12, Math.sqrt(Math.max(sampleCount, 1)) * 2.2);
    const result = {};

    for (const party of Object.keys(predicted)) {
        const volPenalty = (volatility[party] || 0) * 28;
        const base = 82 - volPenalty - horizonPenalty + sampleBonus;
        result[party] = Math.max(35, Math.min(95, Math.round(base)));
    }
    return result;
}

// ── Simulation utilities ─────────────────────────────────────────────────

/** Box-Muller transform for a normal random variate. */
export function randomNormal(mean = 0, std = 1) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Returns the value at percentile p (0–100) of a numeric array. */
export function percentile(arr, p) {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = (p / 100) * (sorted.length - 1);
    return sorted[Math.floor(idx)];
}

/** Returns the party with the most seats, or null. */
export function getLargestParty(seats) {
    const sorted = Object.entries(seats).sort(([, a], [, b]) => b - a);
    return sorted.length ? sorted[0][0] : null;
}

/** Collapses raw simulation results into median/p10/p90 stats per party. */
export function summariseSimulation(simulation) {
    const partyStats = {};
    for (const [party, seatResults] of Object.entries(simulation.partySeatResults)) {
        partyStats[party] = {
            median: percentile(seatResults, 50),
            low: percentile(seatResults, 10),
            high: percentile(seatResults, 90),
        };
    }

    const winnerProbabilities = {};
    for (const [party, count] of Object.entries(simulation.winnerCounts)) {
        winnerProbabilities[party] = Math.round((count / simulation.iterations) * 100);
    }

    return {
        iterations: simulation.iterations,
        majorityProbability: Math.round((simulation.majorityCount / simulation.iterations) * 100),
        winnerProbabilities,
        partyStats,
    };
}

// ── Date / window helpers ─────────────────────────────────────────────────

/** Parses a sample-size string (e.g. "n=1,200") to a number. */
export function parseSampleSize(str) {
    if (!str) return 1000;
    const n = parseInt(str.replace(/[^0-9]/g, ''));
    return isNaN(n) || n === 0 ? 1000 : n;
}

/** Parses an ISO date string from a form input; returns null if invalid. */
export function parseInputDate(str) {
    if (!str) return null;
    const d = new Date(str);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** Parses a DD/MM/YYYY poll date string; returns null if invalid. */
export function parsePollDate(str) {
    if (!str) return null;
    const m = str.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const year = parseInt(m[3], 10);
    const d = new Date(year, month, day);
    if (Number.isNaN(d.getTime())) return null;
    return d;
}

/** Returns the most recent poll date found in the dataset. */
export function getLatestPollDate(pollRows) {
    const dates = pollRows.map(r => parsePollDate(r[3])).filter(Boolean);
    if (!dates.length) return null;
    return dates.reduce((max, d) => d > max ? d : max, dates[0]);
}

/** Days between the latest poll midpoint and the configured election date. */
export function getHorizonDaysFromRows(recentPolls, electionDateRaw) {
    const latestPollDate = getLatestPollDate(recentPolls);
    const electionDate = parseInputDate(electionDateRaw);
    if (!latestPollDate || !electionDate) return 0;
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((electionDate - latestPollDate) / msPerDay);
}

// Short horizons lean on trend; long horizons taper momentum and grow reversion.
export function getMomentumHorizonScale(days) {
    return Math.min(1.6, 0.6 + Math.max(0, days) / 365);
}

export function getReversionHorizonScale(days) {
    return Math.min(1, Math.max(0, days) / 365);
}

export function getAutoMomentumPercent(days) {
    const pct = 70 - Math.min(40, Math.round(Math.max(0, days) / 14));
    return Math.max(30, Math.min(70, pct));
}

export function getAutoReversionPercent(days) {
    const pct = 10 + Math.min(50, Math.round(Math.max(0, days) / 7));
    return Math.max(10, Math.min(60, pct));
}

/** Filters poll rows to the configured date window, falling back to all rows. */
export function filterPollsByDateWindow(pollRows, windowValue) {
    const allWithDates = pollRows
        .map(row => ({ row, date: parsePollDate(row[3]) }))
        .filter(item => item.date)
        .sort((a, b) => a.date - b.date);

    const allChronologicalRows = allWithDates.map(item => item.row);
    if (windowValue === 'all') return allChronologicalRows.length ? allChronologicalRows : pollRows;

    const days = parseInt(windowValue, 10);
    if (Number.isNaN(days) || days <= 0) return allChronologicalRows.length ? allChronologicalRows : pollRows;

    if (!allWithDates.length) return pollRows;

    const latestDate = allWithDates[allWithDates.length - 1].date;
    const cutoff = new Date(latestDate);
    cutoff.setDate(cutoff.getDate() - days);

    const filtered = allWithDates
        .filter(item => item.date >= cutoff)
        .map(item => item.row);

    // Fall back to the most recent poll if the window is too narrow.
    return filtered.length ? filtered : [allWithDates[allWithDates.length - 1].row];
}

/** Parses a CSV string, handling quoted fields with commas. */
export function parseCSV(text) {
    const lines = text.trim().split('\n').map(l => l.replace(/\r$/, ''));
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => {
        const cols = [];
        let current = '', inQuotes = false;
        for (const char of line) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { cols.push(current.trim().replace(/^"|"$/g, '')); current = ''; }
            else current += char;
        }
        cols.push(current.trim().replace(/^"|"$/g, ''));
        return cols;
    });
    return { headers, rows };
}
