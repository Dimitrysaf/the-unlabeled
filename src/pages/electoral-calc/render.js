// src/pages/electoral-calc/render.js
import { partyColors, currentParliamentSeats } from './constants.js';

// ── Parliament diagram ────────────────────────────────────────────────────

/** Renders the hemicycle SVG seat diagram and legend into #parliament-container. */
export function renderParliament(seats) {
    const container = document.getElementById('parliament-container');
    if (!container) return;
    container.style.display = 'block';

    const sorted = Object.entries(seats).sort((a, b) => b[1] - a[1]);
    const hasMajority = sorted.some(([, c]) => c >= 151);

    const seatList = [];
    sorted.forEach(([party, count]) => { for (let i = 0; i < count; i++) seatList.push(party); });

    const arcs = [
        { r: 80, count: 20 },
        { r: 100, count: 25 },
        { r: 120, count: 30 },
        { r: 140, count: 33 },
        { r: 160, count: 35 },
        { r: 180, count: 37 },
        { r: 200, count: 38 },
        { r: 220, count: 40 },
        { r: 240, count: 42 },
    ];

    const cx = 240, cy = 240;
    let svg = `<svg viewBox="0 0 480 240" class="parliament-svg" aria-label="Parliament seat diagram">`;

    // Assign seats column-by-column (vertical), not arc-by-arc (horizontal),
    // so each party appears as a contiguous vertical block in the hemicycle.
    const posByArc = arcs.map(() => []);
    arcs.forEach((arc, arcIdx) => {
        for (let i = 0; i < arc.count; i++) {
            const angle = Math.PI - (i * (Math.PI / (arc.count - 1)));
            posByArc[arcIdx].push({
                x: cx + arc.r * Math.cos(angle),
                y: cy - arc.r * Math.sin(angle),
            });
        }
    });

    const maxCols = Math.max(...arcs.map(a => a.count));
    const verticalOrder = [];
    for (let col = 0; col < maxCols; col++) {
        for (let arcIdx = 0; arcIdx < arcs.length; arcIdx++) {
            if (col < posByArc[arcIdx].length) verticalOrder.push(posByArc[arcIdx][col]);
        }
    }

    for (let idx = 0; idx < Math.min(300, verticalOrder.length); idx++) {
        const pos = verticalOrder[idx];
        const party = seatList[idx];
        const color = partyColors[party] || '#b1b4b6';
        svg += `<circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="5.5" fill="${color}"><title>${party}</title></circle>`;
    }
    svg += `</svg>`;

    const legend = sorted.map(([p, s]) => `
        <span class="parliament-legend-item">
            <span class="parliament-dot" style="background:${partyColors[p] || '#b1b4b6'};"></span>
            <strong style="color:${partyColors[p] || '#0b0c0c'}">${p}</strong>: ${s}
        </span>`).join('');

    container.innerHTML = `
        <div class="parliament-panel ${hasMajority ? 'majority-glow' : ''}">
            <h3 class="govuk-heading-m govuk-!-text-align-centre govuk-!-margin-bottom-1">Parliament composition</h3>
            <p class="govuk-body-s govuk-!-text-align-centre govuk-!-colour-secondary govuk-!-margin-top-0 govuk-!-margin-bottom-3">(300 seats)</p>
            <div class="parliament-wrapper">${svg}</div>
            <div class="parliament-legend">${legend}</div>
            <p class="govuk-body-s govuk-!-text-align-centre govuk-!-colour-secondary govuk-!-margin-top-3 govuk-!-margin-bottom-0">
                Seat projection only - not final election results.
            </p>
        </div>`;
}

// ── Coalition analysis ────────────────────────────────────────────────────

/** Renders minimal majority coalitions into #coalition-container. */
export function renderCoalitions(seats) {
    const container = document.getElementById('coalition-container');
    if (!container) return;
    container.style.display = 'block';

    const parties = Object.entries(seats).filter(([, s]) => s > 0);
    const MAJORITY = 151;

    function getCombinations(arr, k) {
        if (k === 1) return arr.map(x => [x]);
        const result = [];
        for (let i = 0; i <= arr.length - k; i++) {
            getCombinations(arr.slice(i + 1), k - 1).forEach(combo => result.push([arr[i], ...combo]));
        }
        return result;
    }

    const minimal = [];
    const seen = new Set();

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
            if (!seen.has(key)) {
                seen.add(key);
                minimal.push({ parties: combo, seats: total });
            }
        }
        if (minimal.length >= 10) break;
    }

    if (!minimal.length) {
        container.innerHTML = `
            <div class="coalition-panel">
                <h3 class="govuk-heading-m">Coalition analysis</h3>
                <p class="govuk-body govuk-!-colour-secondary">
                    No majority coalition is possible with the current forecast.
                </p>
            </div>`;
        return;
    }

    minimal.sort((a, b) => a.parties.length - b.parties.length || b.seats - a.seats);

    const rows = minimal.slice(0, 8).map(c => {
        const overMajority = c.seats - MAJORITY;
        const partyTags = c.parties
            .map(([p, s]) => `<span class="coalition-party-tag" style="border-color:${partyColors[p] || '#0b0c0c'};color:${partyColors[p] || '#0b0c0c'};">${p}&nbsp;(${s})</span>`)
            .join('');
        return `
        <div class="coalition-row">
            <div class="coalition-parties">${partyTags}</div>
            <div class="coalition-meta">
                <span class="coalition-seats">${c.seats} seats</span>
                <strong class="govuk-tag govuk-tag--green coalition-surplus">+${overMajority}</strong>
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

// ── Prediction cards ──────────────────────────────────────────────────────

/**
 * Renders per-party forecast cards into #prediction-cards.
 * volatility is passed explicitly (not read from module state).
 */
export function renderPredictionCards(predicted, rawBase, seats, momentum, acceleration, confidence, windowSize, summary, volatility) {
    const sorted = Object.entries(predicted)
        .sort(([, a], [, b]) => b - a)
        .filter(([, v]) => v >= 1.0);

    document.getElementById('prediction-cards').innerHTML = sorted.map(([party, pct]) => {
        const basePct = rawBase[party] || 0;
        const diff = pct - basePct;
        const vol = ((volatility[party] || 0) * 100).toFixed(0);
        const seatRange = summary?.partyStats?.[party];
        const seat = seats[party] || seatRange?.median || 0;
        const currentSeats = currentParliamentSeats[party] ?? 0;
        const seatDelta = seat - currentSeats;
        const seatDeltaSign = seatDelta > 0 ? '+' : '';
        const seatDeltaClass = seatDelta > 0 ? 'text-up' : seatDelta < 0 ? 'text-down' : '';
        const color = partyColors[party] || '#0b0c0c';
        const diffSign = diff >= 0 ? '+' : '−';
        const diffClass = diff >= 0 ? 'text-up' : 'text-down';

        const slope = momentum[party] || 0;
        const accel = acceleration[party] || 0;
        const confidencePct = confidence?.[party] ?? 50;
        const trendDelta = slope * Math.max((windowSize || 1) - 1, 1);
        const accelDelta = accel * Math.max((windowSize || 1) - 1, 1);

        let momentumIconHtml, momentumLabel;
        if (Math.abs(trendDelta) < 0.35) {
            momentumIconHtml = getMomentumIconSvg('stable');
            momentumLabel = 'Stable';
        } else if (trendDelta > 0) {
            momentumIconHtml = getMomentumIconSvg(accelDelta > 0.2 ? 'up-fast' : 'up');
            momentumLabel = accelDelta > 0.2 ? 'Rising fast' : 'Rising';
        } else {
            momentumIconHtml = getMomentumIconSvg(accelDelta < -0.2 ? 'down-fast' : 'down');
            momentumLabel = accelDelta < -0.2 ? 'Falling fast' : 'Falling';
        }
        const momentumColor = trendDelta > 0.35 ? '#00703c' : trendDelta < -0.35 ? '#d4351c' : '#505a5f';

        const seatHtml = seat > 0 ? `${seat}` : '—';
        const seatRangeHtml = seatRange ? ` <span class="seat-range">(${seatRange.low}–${seatRange.high})</span>` : '';

        return `
        <div class="prediction-card" style="border-top-color:${color};">
            <div class="prediction-card__pct" style="color:${color};">${pct.toFixed(1)}%</div>
            <div class="prediction-card__party">${party}</div>
            <div class="prediction-card__momentum" style="color:${momentumColor};">
                <span class="prediction-card__momentum-icon" aria-hidden="true">${momentumIconHtml}</span>
                <span class="govuk-visually-hidden">${momentumLabel}</span>
                <span>${momentumLabel}</span>
            </div>
            <hr class="prediction-card__divider">
            <div class="prediction-card__details">
                <div>Poll avg: <strong>${basePct.toFixed(1)}%</strong>
                    <span class="${diffClass}">${diffSign}${Math.abs(diff).toFixed(1)}%</span>
                </div>
                <div>Volatility: <strong>${vol}%</strong></div>
                <div>Confidence: <strong>${confidencePct}%</strong></div>
                <div>Seats: <strong style="color:${color};">${seatHtml}</strong>${seatRangeHtml}
                    <span class="${seatDeltaClass}">(${seatDeltaSign}${seatDelta})</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

function getMomentumIconSvg(state) {
    if (state === 'up-fast') {
        return `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 2l4 4H9v8H7V6H4l4-4z"/><path d="M13 4l3 3h-2v6h-2V7h-2l3-3z"/></svg>`;
    }
    if (state === 'up') {
        return `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 2l4 4H9v8H7V6H4l4-4z"/></svg>`;
    }
    if (state === 'down-fast') {
        return `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 14l-4-4h3V2h2v8h3l-4 4z"/><path d="M13 12l-3-3h2V3h2v6h2l-3 3z"/></svg>`;
    }
    if (state === 'down') {
        return `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 14l-4-4h3V2h2v8h3l-4 4z"/></svg>`;
    }
    return `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M2 9h12v-2H2v2z"/></svg>`;
}

// ── Forecast vs poll stat bars ────────────────────────────────────────────

/** Renders horizontal bar chart comparing forecast vs poll average per party. */
export function renderPredictionStats(predicted, rawBase) {
    const sorted = Object.entries(predicted)
        .sort(([, a], [, b]) => b - a)
        .filter(([, v]) => v >= 1.0);

    const maxVal = Math.max(...sorted.map(([p, v]) => Math.max(v, rawBase[p] || 0)));

    const rows = sorted.map(([party, forecast]) => {
        const poll = rawBase[party] || 0;
        const delta = forecast - poll;
        const deltaSign = delta >= 0 ? '+' : '−';
        const deltaClass = delta >= 0 ? 'text-up' : 'text-down';
        const color = partyColors[party] || '#0b0c0c';
        const forecastW = maxVal > 0 ? (forecast / maxVal) * 100 : 0;
        const pollW = maxVal > 0 ? (poll / maxVal) * 100 : 0;

        return `
        <div class="pred-stat-row">
            <div class="pred-stat-label">${party}</div>
            <div class="pred-stat-bars">
                <div class="pred-stat-bar pred-stat-bar--forecast"
                     style="width:${forecastW.toFixed(1)}%;background:${color};"
                     title="2027 Forecast: ${forecast.toFixed(1)}%"></div>
                <div class="pred-stat-bar pred-stat-bar--poll"
                     style="width:${pollW.toFixed(1)}%;background:${color}33;"
                     title="Poll average: ${poll.toFixed(1)}%"></div>
            </div>
            <div class="pred-stat-values">
                <span class="pred-stat-forecast" style="color:${color};">${forecast.toFixed(1)}%</span>
                <span class="pred-stat-sep">vs</span>
                <span class="pred-stat-poll">${poll.toFixed(1)}%</span>
                <span class="pred-stat-delta ${deltaClass}">${deltaSign}${Math.abs(delta).toFixed(1)}%</span>
            </div>
        </div>`;
    }).join('');

    const container = document.getElementById('prediction-stats');
    if (!container) return;
    container.innerHTML = `
        <div class="pred-stat-panel">
            <div class="pred-stat-legend">
                <span class="pred-stat-legend-swatch pred-stat-legend-swatch--solid"></span>2027 Forecast
                <span class="pred-stat-legend-swatch pred-stat-legend-swatch--faded"></span>Poll average
            </div>
            ${rows}
        </div>`;
}

// ── Uncertainty summary ───────────────────────────────────────────────────

/** Renders a collapsible simulation uncertainty block into #prediction-uncertainty. */
export function renderUncertaintySummary(summary) {
    const container = document.getElementById('prediction-uncertainty');
    if (!container) return;
    if (!summary || !summary.iterations) {
        container.innerHTML = '';
        return;
    }

    const winners = Object.entries(summary.winnerProbabilities)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([party, pct]) => `<strong style="color:${partyColors[party] || '#0b0c0c'};">${party}</strong> ${pct}%`)
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

// ── House effects table ───────────────────────────────────────────────────

/** Renders the polling-firm house-effects table into #house-effects-table. */
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
            const sign = e > 0 ? '+' : '';
            return `<td class="govuk-table__cell house-effects-cell" style="color:${color};${bold}">${sign}${e.toFixed(1)}</td>`;
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
