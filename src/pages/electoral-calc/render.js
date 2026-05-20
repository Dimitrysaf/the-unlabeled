// src/pages/electoral-calc/render.js
import { partyColors, currentParliamentSeats } from './constants.js';

const IDEOLOGICAL_ORDER = {
    KKE: 0,
    M25: 1,
    NA: 2,
    SYRIZA: 3,
    PE: 4,
    PASOK: 5,
    FL: 6,
    ND: 7,
    DPK: 8,
    EL: 9,
    NIKI: 10,
    SP: 11,
};

const ARCS = [
    { r: 80, count: 21 },
    { r: 100, count: 24 },
    { r: 120, count: 27 },
    { r: 140, count: 30 },
    { r: 160, count: 33 },
    { r: 180, count: 36 },
    { r: 200, count: 39 },
    { r: 220, count: 42 },
    { r: 240, count: 48 },
];
const CX = 240, CY = 240;

const SEAT_POSITIONS = (() => {
    const posByArc = ARCS.map(arc => {
        const pts = [];
        for (let i = 0; i < arc.count; i++) {
            const angle = Math.PI - (i * (Math.PI / (arc.count - 1)));
            pts.push({ x: CX + arc.r * Math.cos(angle), y: CY - arc.r * Math.sin(angle) });
        }
        return pts;
    });
    const maxCols = Math.max(...ARCS.map(a => a.count));
    const order = [];
    for (let col = 0; col < maxCols; col++) {
        for (let ai = 0; ai < ARCS.length; ai++) {
            if (col < posByArc[ai].length) order.push(posByArc[ai][col]);
        }
    }
    return order;
})();

let _lastSeats = {};
const _hidden = new Set();

function _buildSeatList(seatsObj) {
    const sorted = Object.entries(seatsObj)
        .filter(([, c]) => c > 0)
        .sort(([a], [b]) => (IDEOLOGICAL_ORDER[a] ?? 50) - (IDEOLOGICAL_ORDER[b] ?? 50));
    const list = [];
    sorted.forEach(([party, count]) => {
        for (let i = 0; i < count; i++) list.push(party);
    });
    while (list.length < 300) list.push('__other__');
    return list;
}

function _renderCircles(seatsObj, dotRadius) {
    const list = _buildSeatList(seatsObj);
    return SEAT_POSITIONS.slice(0, 300).map((pos, idx) => {
        const party = list[idx];
        let fill;
        if (party === '__other__') fill = '#e2e2e2';
        else if (_hidden.has(party)) fill = '#d4d2cf';
        else fill = partyColors[party] || '#b1b4b6';
        const label = party === '__other__' ? 'Independent / Other' : party;
        return `<circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="${dotRadius}" fill="${fill}">
                    <title>${label}</title>
                </circle>`;
    }).join('');
}

function getCombinations(arr, k) {
    if (k === 1) return arr.map(x => [x]);
    const result = [];
    for (let i = 0; i <= arr.length - k; i++) {
        getCombinations(arr.slice(i + 1), k - 1).forEach(combo => result.push([arr[i], ...combo]));
    }
    return result;
}

export function renderParliament(seats) {
    _lastSeats = seats;
    _drawParliament();
}

function _drawParliament() {
    const container = document.getElementById('parliament-container');
    if (!container) return;
    container.style.display = 'block';

    const seats = _lastSeats;
    const hasMajority = Object.values(seats).some(s => s >= 151);

    const refTotal = Object.values(currentParliamentSeats).reduce((a, b) => a + b, 0);
    const independents = 300 - refTotal;

    const allParties = new Map();
    [...Object.entries(seats), ...Object.entries(currentParliamentSeats)].forEach(([p, s]) => {
        if (s > 0 && !allParties.has(p)) allParties.set(p, true);
    });
    const sortedParties = [...allParties.keys()]
        .sort((a, b) => (IDEOLOGICAL_ORDER[a] ?? 50) - (IDEOLOGICAL_ORDER[b] ?? 50));

    const legendHtml = sortedParties.map(p => {
        const hidden = _hidden.has(p);
        const color = partyColors[p] || '#b1b4b6';
        const proj = seats[p] || 0;
        const curr = currentParliamentSeats[p] || 0;
        return `<button type="button"
                    class="polls-legend-btn${hidden ? ' polls-legend-btn--off' : ''}"
                    data-party="${p}"
                    style="--c:${color}"
                    aria-pressed="${String(!hidden)}"
                    title="${hidden ? 'Show' : 'Hide'} ${p}">
                    <span class="polls-legend-pip" aria-hidden="true"></span>
                    <strong style="color:inherit">${p}</strong>
                    <span class="parl-seat-count">${proj}
                        <span class="parl-seat-ref">(${curr})</span>
                    </span>
                </button>`;
    }).join('');

    container.innerHTML = `
        <div class="parliament-panel ${hasMajority ? 'majority-glow' : ''}">

            <div class="parliament-dual">
                <div class="parliament-half">
                    <p class="parliament-half-label">2027 Projection</p>
                    <div class="parliament-wrapper">
                        <svg viewBox="0 0 480 240" class="parliament-svg"
                             aria-label="2027 projected parliament">
                            ${_renderCircles(seats, 5.5)}
                        </svg>
                    </div>
                </div>
                <div class="parliament-half">
                    <p class="parliament-half-label">Current Parliament</p>
                    <div class="parliament-wrapper">
                        <svg viewBox="0 0 480 240" class="parliament-svg"
                             aria-label="Current parliament (2023 elections)">
                            ${_renderCircles(currentParliamentSeats, 5.5)}
                        </svg>
                    </div>
                </div>
            </div>

            <div class="polls-chart-legend" id="parliament-legend"
                 role="group" aria-label="Toggle party seats in both diagrams">
                ${legendHtml}
            </div>

            <p class="govuk-body-s govuk-!-colour-secondary govuk-!-margin-top-2 govuk-!-margin-bottom-0">
                Seat projection only — not final election results.
            </p>
            <p class="govuk-body-s govuk-!-colour-secondary govuk-!-margin-top-1 govuk-!-margin-bottom-2">
                Seats arranged left→right by political ideology.
                Legend shows projected seats with current seats in brackets.
                ${independents > 0 ? `Light grey = ${independents} independent / untracked MPs in current parliament.` : ''}
            </p>
        </div>`;

    container.querySelectorAll('.polls-legend-btn[data-party]').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = btn.dataset.party;
            if (_hidden.has(p)) _hidden.delete(p); else _hidden.add(p);
            _drawParliament();
        });
    });
}

export function renderCoalitions(seats) {
    const container = document.getElementById('coalition-container');
    if (!container) return;
    container.style.display = 'block';

    const parties = Object.entries(seats).filter(([, s]) => s > 0);
    const MAJORITY = 151;

    const minimal = [], seen = new Set();
    for (let size = 2; size <= parties.length; size++) {
        for (const combo of getCombinations(parties, size)) {
            const total = combo.reduce((s, [, c]) => s + c, 0);
            if (total < MAJORITY) continue;
            const isMinimal = !minimal.some(m =>
                m.parties.length < combo.length &&
                m.parties.every(([p]) => combo.some(([p2]) => p2 === p))
            );
            if (!isMinimal) continue;
            const key = combo.map(([p]) => p).sort().join('+');
            if (!seen.has(key)) { seen.add(key); minimal.push({ parties: combo, seats: total }); }
        }
        if (minimal.length >= 10) break;
    }

    if (!minimal.length) {
        container.innerHTML = `
            <div class="coalition-panel">
                <h3 class="govuk-heading-m">Coalition analysis</h3>
                <p class="govuk-body govuk-!-colour-secondary">No majority coalition is possible with the current forecast.</p>
            </div>`;
        return;
    }

    minimal.sort((a, b) => a.parties.length - b.parties.length || b.seats - a.seats);

    const rows = minimal.slice(0, 8).map(c => {
        const over = c.seats - MAJORITY;
        const tags = c.parties.map(([p, s]) =>
            `<span class="coalition-party-tag" style="border-color:${partyColors[p] || '#0b0c0c'};color:${partyColors[p] || '#0b0c0c'};">${p}&nbsp;(${s})</span>`
        ).join('');
        return `
        <div class="coalition-row">
            <div class="coalition-parties">${tags}</div>
            <div class="coalition-meta">
                <span class="coalition-seats">${c.seats} seats</span>
                <strong class="govuk-tag govuk-tag--green coalition-surplus">+${over}</strong>
            </div>
        </div>`;
    }).join('');

    container.innerHTML = `
        <div class="coalition-panel">
            <h3 class="govuk-heading-m">Possible majority coalitions</h3>
            <p class="govuk-body-s govuk-!-colour-secondary govuk-!-margin-bottom-4">
                Minimum party combinations reaching ${MAJORITY} seats. Does not imply political feasibility.
            </p>
            ${rows}
        </div>`;
}

export function renderPredictionCards(predicted, rawBase, seats, momentum, acceleration, confidence, windowSize, summary, volatility) {
    const sorted = Object.entries(predicted).sort(([, a], [, b]) => b - a).filter(([, v]) => v >= 1.0);

    document.getElementById('prediction-cards').innerHTML = sorted.map(([party, pct]) => {
        const basePct = rawBase[party] || 0;
        const diff = pct - basePct;
        const vol = ((volatility[party] || 0) * 100).toFixed(0);
        const seatRange = summary?.partyStats?.[party];
        const seat = seats[party] || seatRange?.median || 0;
        const currSeats = currentParliamentSeats[party] ?? 0;
        const seatDelta = seat - currSeats;
        const color = partyColors[party] || '#0b0c0c';
        const slope = momentum[party] || 0;
        const accel = acceleration[party] || 0;
        const trendDelta = slope * Math.max((windowSize || 1) - 1, 1);
        const accelDelta = accel * Math.max((windowSize || 1) - 1, 1);

        let iconHtml, label;
        if (Math.abs(trendDelta) < 0.35) { iconHtml = _momentumSvg('stable'); label = 'Stable'; }
        else if (trendDelta > 0) { iconHtml = _momentumSvg(accelDelta > 0.2 ? 'up-fast' : 'up'); label = accelDelta > 0.2 ? 'Rising fast' : 'Rising'; }
        else { iconHtml = _momentumSvg(accelDelta < -0.2 ? 'down-fast' : 'down'); label = accelDelta < -0.2 ? 'Falling fast' : 'Falling'; }
        const mColor = trendDelta > 0.35 ? '#00703c' : trendDelta < -0.35 ? '#d4351c' : '#505a5f';

        return `
        <div class="prediction-card" style="border-top-color:${color};">
            <div class="prediction-card__pct" style="color:${color};">${pct.toFixed(1)}%</div>
            <div class="prediction-card__party">${party}</div>
            <div class="prediction-card__momentum" style="color:${mColor};">
                <span class="prediction-card__momentum-icon" aria-hidden="true">${iconHtml}</span>
                <span class="govuk-visually-hidden">${label}</span>
                <span>${label}</span>
            </div>
            <hr class="prediction-card__divider">
            <div class="prediction-card__details">
                <div>Poll avg: <strong>${basePct.toFixed(1)}%</strong>
                    <span class="${diff >= 0 ? 'text-up' : 'text-down'}">${diff >= 0 ? '+' : '−'}${Math.abs(diff).toFixed(1)}%</span>
                </div>
                <div>Volatility: <strong>${vol}%</strong></div>
                <div>Confidence: <strong>${confidence?.[party] ?? 50}%</strong></div>
                <div>Seats: <strong style="color:${color};">${seat > 0 ? seat : '—'}</strong>
                    ${seatRange ? ` <span class="seat-range">(${seatRange.low}–${seatRange.high})</span>` : ''}
                    <span class="${seatDelta > 0 ? 'text-up' : seatDelta < 0 ? 'text-down' : ''}">(${seatDelta > 0 ? '+' : ''}${seatDelta})</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

function _momentumSvg(state) {
    if (state === 'up-fast') return `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 2l4 4H9v8H7V6H4l4-4z"/><path d="M13 4l3 3h-2v6h-2V7h-2l3-3z"/></svg>`;
    if (state === 'up') return `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 2l4 4H9v8H7V6H4l4-4z"/></svg>`;
    if (state === 'down-fast') return `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 14l-4-4h3V2h2v8h3l-4 4z"/><path d="M13 12l-3-3h2V3h2v6h2l-3 3z"/></svg>`;
    if (state === 'down') return `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 14l-4-4h3V2h2v8h3l-4 4z"/></svg>`;
    return `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M2 9h12v-2H2v2z"/></svg>`;
}

export function renderPredictionStats(predicted, rawBase) {
    const sorted = Object.entries(predicted).sort(([, a], [, b]) => b - a).filter(([, v]) => v >= 1.0);
    const maxVal = Math.max(...sorted.map(([p, v]) => Math.max(v, rawBase[p] || 0)));

    const rows = sorted.map(([party, forecast]) => {
        const poll = rawBase[party] || 0;
        const delta = forecast - poll;
        const color = partyColors[party] || '#b1b4b6';
        return `
        <div class="pred-stat-row">
            <div class="pred-stat-label">${party}</div>
            <div class="pred-stat-bars">
                <div class="pred-stat-bar" style="width:${maxVal > 0 ? (forecast / maxVal * 100).toFixed(1) : 0}%;background:${color};" title="Forecast: ${forecast.toFixed(1)}%"></div>
                <div class="pred-stat-bar" style="width:${maxVal > 0 ? (poll / maxVal * 100).toFixed(1) : 0}%;background:${color}33;" title="Poll avg: ${poll.toFixed(1)}%"></div>
            </div>
            <div class="pred-stat-values">
                <span class="pred-stat-forecast" style="color:${color};">${forecast.toFixed(1)}%</span>
                <span class="pred-stat-sep">vs</span>
                <span class="pred-stat-poll">${poll.toFixed(1)}%</span>
                <span class="pred-stat-delta ${delta >= 0 ? 'text-up' : 'text-down'}">${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)}%</span>
            </div>
        </div>`;
    }).join('');

    const container = document.getElementById('prediction-stats');
    if (!container) return;
    container.innerHTML = `
        <div class="pred-stat-panel">
            <div class="pred-stat-legend">
                <span class="pred-stat-legend-swatch pred-stat-legend-swatch--solid"></span>2027 Forecast
                <span class="pred-stat-lWegend-swatch pred-stat-legend-swatch--faded"></span>Poll average
            </div>
            ${rows}
        </div>`;
}

export function renderUncertaintySummary(summary) {
    const container = document.getElementById('prediction-uncertainty');
    if (!container) return;
    if (!summary || !summary.iterations) { container.innerHTML = ''; return; }

    const winners = Object.entries(summary.winnerProbabilities)
        .sort(([, a], [, b]) => b - a).slice(0, 3)
        .map(([p, pct]) => `<strong style="color:${partyColors[p] || '#0b0c0c'};">${p}</strong> ${pct}%`)
        .join(' · ');

    container.innerHTML = `
        <details class="govuk-details govuk-!-margin-bottom-3">
            <summary class="govuk-details__summary">
                <span class="govuk-details__summary-text">Simulation uncertainty</span>
            </summary>
            <div class="govuk-details__text">
                <p class="govuk-body-s">Based on ${summary.iterations} poll-noise runs.</p>
                <p class="govuk-body-s">Largest party probabilities: ${winners}.</p>
                <p class="govuk-body-s"><strong>Majority probability:</strong> ${summary.majorityProbability}%</p>
            </div>
        </details>`;
}

export function renderHouseEffectsTable(houseEffects, partyIndices) {
    const container = document.getElementById('house-effects-table');
    if (!container) return;

    const parties = Object.keys(partyIndices);
    const firms = Object.keys(houseEffects);

    if (!firms.length) {
        container.innerHTML = '<p class="govuk-body-s">Not enough data to compute house effects (need ≥3 polls per firm).</p>';
        return;
    }

    const theadCells = ['Firm', ...parties].map(h => {
        const color = partyColors[h];
        const style = color ? `color:${color};border-bottom:3px solid ${color};` : '';
        return `<th scope="col" class="govuk-table__header" style="font-size:0.75rem;white-space:nowrap;${style}">${h}</th>`;
    }).join('');

    const tbody = firms.map(firm => {
        const cells = parties.map(party => {
            const e = houseEffects[firm]?.[party];
            if (e === undefined) return `<td class="govuk-table__cell house-effects-cell">—</td>`;
            const color = Math.abs(e) < 0.5 ? '#505a5f' : e > 0 ? '#00703c' : '#d4351c';
            const bold = Math.abs(e) > 0.5 ? 'font-weight:700;' : '';
            return `<td class="govuk-table__cell house-effects-cell" style="color:${color};${bold}">${e > 0 ? '+' : ''}${e.toFixed(1)}</td>`;
        }).join('');
        return `<tr class="govuk-table__row">
            <td class="govuk-table__cell" style="font-size:0.75rem;white-space:nowrap;">${firm}</td>
            ${cells}
        </tr>`;
    }).join('');

    container.innerHTML = `
        <p class="govuk-body-s govuk-!-colour-secondary">
            Positive = firm overestimates a party vs. the cross-firm mean. Values in percentage points.
            Only firms with ≥3 polls shown.
        </p>
        <div style="overflow-x:auto;">
            <table class="govuk-table" style="font-size:0.8125rem;">
                <thead class="govuk-table__head"><tr class="govuk-table__row">${theadCells}</tr></thead>
                <tbody class="govuk-table__body">${tbody}</tbody>
            </table>
        </div>`;
}

export function renderSeatRangeChart(summary) {
    const container = document.getElementById('seat-range-chart');
    if (!container || !summary?.partyStats) return;

    const parties = Object.entries(summary.partyStats)
        .filter(([, s]) => s.high > 0)
        .sort(([, a], [, b]) => b.median - a.median);

    if (!parties.length) { container.innerHTML = ''; return; }

    const MAX = 300;
    const pct = n => (n / MAX * 100).toFixed(2);
    const majorityPct = pct(151);

    const rows = parties.map(([party, stat]) => {
        const color = partyColors[party] || '#b1b4b6';
        const curr = currentParliamentSeats[party] || 0;
        const p10 = pct(stat.low);
        const p90 = pct(stat.high);
        const p50 = pct(stat.median);
        const range = (parseFloat(p90) - parseFloat(p10)).toFixed(2);
        return `
        <div class="pred-stat-row">
            <div class="pred-stat-label" style="color:${color};">${party}</div>
            <div class="seat-range-bar-wrap">
                <div class="seat-range-fill" style="left:${p10}%;width:${range}%;background:${color};"></div>
                <div class="seat-range-median" style="left:${p50}%;background:${color};"></div>
                ${curr > 0 ? `<div class="seat-range-current" style="left:${pct(curr)}%;color:${color};">◇</div>` : ''}
                <div class="seat-range-majority" style="left:${majorityPct}%;"></div>
            </div>
            <div class="pred-stat-values">
                <span class="pred-stat-forecast" style="color:${color};">${stat.median}</span>
                <span class="pred-stat-poll"> (${stat.low}–${stat.high})</span>
            </div>
        </div>`;
    }).join('');

    container.innerHTML = `
        <div class="pred-stat-panel">
            <h3 class="govuk-heading-s govuk-!-margin-bottom-1">Seat projection range</h3>
            <p class="govuk-body-s govuk-!-colour-secondary govuk-!-margin-bottom-3">
                Median seat count with p10–p90 simulation range.
                ◇ = current seats (2023). <span style="color:#d4351c;font-weight:700;">|</span> = majority (151 seats).
            </p>
            ${rows}
        </div>`;
}

export function renderWinProbabilityChart(summary) {
    const container = document.getElementById('win-probability-chart');
    if (!container || !summary?.winnerProbabilities) return;

    const entries = Object.entries(summary.winnerProbabilities)
        .filter(([, p]) => p >= 1)
        .sort(([, a], [, b]) => b - a);

    if (!entries.length) { container.innerHTML = ''; return; }

    const rows = entries.map(([party, prob]) => {
        const color = partyColors[party] || '#b1b4b6';
        return `
        <div class="pred-stat-row">
            <div class="pred-stat-label" style="color:${color};">${party}</div>
            <div class="pred-stat-bars">
                <div class="pred-stat-bar" style="width:${prob}%;background:${color};"></div>
            </div>
            <div class="pred-stat-values">
                <span class="pred-stat-forecast" style="color:${color};">${prob}%</span>
            </div>
        </div>`;
    }).join('');

    container.innerHTML = `
        <div class="pred-stat-panel">
            <h3 class="govuk-heading-s govuk-!-margin-bottom-1">Win probability</h3>
            <p class="govuk-body-s govuk-!-colour-secondary govuk-!-margin-bottom-3">
                % of ${summary.iterations.toLocaleString()} simulations in which each party holds the most seats.
            </p>
            ${rows}
        </div>`;
}

export function renderCoalitionProbabilityChart(summary) {
    const container = document.getElementById('coalition-probability-chart');
    if (!container || !summary?.coalitionProbabilities) return;

    const entries = Object.entries(summary.coalitionProbabilities)
        .filter(([, p]) => p >= 5)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

    if (!entries.length) { container.innerHTML = ''; return; }

    const rows = entries.map(([key, prob]) => {
        const parties = key.split('+');
        const primaryColor = partyColors[parties[0]] || '#0b0c0c';
        const labelHtml = parties.map((p, pi) => {
            const c = partyColors[p] || '#0b0c0c';
            return `<span style="color:${c};font-weight:700;">${p}</span>${pi < parties.length - 1 ? '<span style="color:#505a5f;"> + </span>' : ''}`;
        }).join('');
        return `
        <div class="pred-stat-row pred-stat-row--wide">
            <div class="pred-stat-label" style="white-space:normal;font-size:0.8125rem;">${labelHtml}</div>
            <div class="pred-stat-bars">
                <div class="pred-stat-bar" style="width:${prob}%;background:${primaryColor};"></div>
            </div>
            <div class="pred-stat-values">
                <span class="pred-stat-forecast" style="color:${primaryColor};">${prob}%</span>
            </div>
        </div>`;
    }).join('');

    container.innerHTML = `
        <div class="pred-stat-panel">
            <h3 class="govuk-heading-s govuk-!-margin-bottom-1">Coalition probability</h3>
            <p class="govuk-body-s govuk-!-colour-secondary govuk-!-margin-bottom-3">
                % of ${summary.iterations.toLocaleString()} simulations each 2- or 3-party combination
                reaches 151 seats. Combinations with &lt;5% omitted.
                Does not imply political feasibility.
            </p>
            ${rows}
        </div>`;
}