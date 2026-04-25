import { updateContent } from '../components/Layout.js';

const partyColors = {
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

let _pollRows = [], _partyIndices = {}, _volatility = {}, _ndBias = 0;

export function renderElectoralCalc() {
    updateContent(`
        <div class="govuk-!-padding-top-2 govuk-!-padding-bottom-9">

            <div class="govuk-grid-row">
                <div class="govuk-grid-column-full">
                    <h1 class="govuk-heading-xl govuk-!-margin-bottom-1">Electoral Model 2027</h1>
                    <p class="govuk-body-l govuk-!-colour-secondary govuk-!-margin-bottom-6">
                        Greek opinion poll tracker and seat allocation model, sourced from Wikipedia.
                    </p>
                </div>
            </div>

            <!-- Poll trend chart -->
            <div class="govuk-grid-row">
                <div class="govuk-grid-column-full">
                    <h2 class="govuk-heading-m">Polling trends</h2>
                    <div class="chart-wrapper" id="pollsChart"></div>
                    </div>
                </div>
            </div>

            <!-- Loading / table -->
            <div id="polls-loading" class="ec-loader">
                <div class="ec-spinner"></div>
                Loading polling data…
            </div>

            <div id="polls-table-section" style="display:none;">
                <div class="polls-table-header">
                    <h2 class="govuk-heading-m govuk-!-margin-bottom-0">Raw polling data</h2>
                    <button
                        class="polls-table-toggle"
                        id="polls-table-toggle"
                        aria-expanded="true"
                        aria-controls="polls-table-body"
                        type="button"
                    >
                        <svg class="polls-toggle-chevron" aria-hidden="true" focusable="false"
                             width="20" height="20" viewBox="0 0 20 20">
                            <path d="M5 7l5 5 5-5" stroke="currentColor" stroke-width="2"
                                  fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span class="govuk-visually-hidden">Toggle raw polling data</span>
                    </button>
                </div>
                <div id="polls-table-body">
                    <div class="table-scroll">
                        <table class="govuk-table govuk-table--small-text-until-tablet" id="polls-table">
                            <thead class="govuk-table__head" id="polls-thead"></thead>
                            <tbody class="govuk-table__body" id="polls-tbody"></tbody>
                        </table>
                    </div>
                    <div class="table-footer">
                        <p class="govuk-body-s govuk-!-colour-secondary">
                            Source:
                            <a class="govuk-link" href="https://en.wikipedia.org/wiki/Opinion_polling_for_the_next_Greek_parliamentary_election" target="_blank" rel="noopener">Wikipedia</a>
                        </p>
                        <button class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0" id="download-btn">
                            <i class="fa-solid fa-download" aria-hidden="true"></i> Download CSV
                        </button>
                    </div>
                </div>
            </div>

            <!-- Prediction section -->
            <div id="prediction-section" style="display:none;">
                <hr class="section-rule">
                <h2 class="govuk-heading-l">2027 election forecast</h2>
                <p class="govuk-body govuk-!-colour-secondary">
                    Weighted polling average + abstention model + historical ND bias correction.
                </p>

                <!-- Controls -->
                <div class="govuk-grid-row govuk-!-margin-bottom-4">
                    <div class="govuk-grid-column-full">
                        <div class="ec-fields">

                            <div class="govuk-form-group" style="min-width:220px; flex:1;">
                                <label class="govuk-label govuk-label--s" for="abstention-slider">
                                    Abstention rate: <strong id="abstention-value">35</strong>%
                                </label>
                                <input
                                    class="govuk-range"
                                    type="range"
                                    id="abstention-slider"
                                    name="abstention"
                                    min="20" max="65" value="35" step="1"
                                    aria-describedby="abstention-hint"
                                >
                                <div id="abstention-hint" class="govuk-hint">
                                    Adjust expected abstention at election day.
                                </div>
                            </div>

                            <div class="govuk-form-group" style="min-width:200px; flex:1;">
                                <label class="govuk-label govuk-label--s" for="polls-count-select">Poll base</label>
                                <select class="govuk-select" id="polls-count-select" name="polls-count">
                                    <option value="5">Last 5 polls</option>
                                    <option value="10" selected>Last 10 polls</option>
                                    <option value="20">Last 20 polls</option>
                                    <option value="all">All polls</option>
                                </select>
                            </div>

                            <div class="govuk-form-group govuk-checkboxes" style="flex:1; min-width:200px;">
                                <div class="govuk-checkboxes__item">
                                    <input class="govuk-checkboxes__input" id="nd-correction-checkbox"
                                        name="nd-correction" type="checkbox" value="yes" checked>
                                    <label class="govuk-label govuk-checkboxes__label" for="nd-correction-checkbox">
                                        ND bias correction
                                        <strong id="nd-bias-label" style="color:#1d4e89; margin-left:4px;"></strong>
                                    </label>
                                    <div id="nd-correction-hint" class="govuk-hint govuk-checkboxes__hint">
                                        Apply historical polling bias adjustment for ND.
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                <!-- Prediction cards -->
                <div class="prediction-cards" id="prediction-cards"></div>

                <!-- Parliament -->
                <div id="parliament-container" style="display:none;"></div>

                <!-- Forecast vs poll comparison -->
                <div id="prediction-stats"></div>

                <!-- Methodology -->
                <div class="govuk-inset-text govuk-!-margin-top-6">
                    <h3 class="govuk-heading-s">Methodology &amp; Electoral law</h3>
                    <p class="govuk-body">
                        <strong>Model:</strong> Weighted average (2× weight for most recent).
                        Abstention penalty: <em>abstention × (0.5 + 0.5 × volatility_index)</em>.
                        ND bias correction is computed from historical election vs. poll differences.
                    </p>
                    <p class="govuk-body govuk-!-margin-bottom-0">
                        <strong>Seat allocation (Law 4654/2020):</strong> 3% threshold.
                        Tiered first-place bonus (20 seats at 25%, +1 per 0.5%, up to 50 seats).
                        Remainder distributed by Largest Remainder method.
                    </p>
                </div>

            </div>

        </div>
    `);

    loadPolls();

    document.getElementById('download-btn').addEventListener('click', () => {
        window.location.href = '/polls.csv';
    });
}


// ─────────────────────────────────────────────
// DATA LOADING
// ─────────────────────────────────────────────

function loadPolls() {
    fetch('/polls.csv')
        .then(r => r.text())
        .then(text => {
            const { headers, rows } = parseCSV(text);

            // Build table head
            document.getElementById('polls-thead').innerHTML =
                `<tr class="govuk-table__row">${headers.map(h => {
                    const color = partyColors[h];
                    const style = color
                        ? `border-bottom: 4px solid ${color}; color: ${color};`
                        : '';
                    return `<th scope="col" class="govuk-table__header" style="${style}">${h}</th>`;
                }).join('')}</tr>`;

            // Build table body
            document.getElementById('polls-tbody').innerHTML =
                rows.map(row => {
                    const isElection = row[0].toLowerCase().includes('election');
                    const rowStyle = isElection
                        ? 'background:#fff3cd; font-weight:700;'
                        : '';
                    return `<tr class="govuk-table__row" style="${rowStyle}">${row.map((cell, i) => {
                        const isParty = !!partyColors[headers[i]];
                        const align = isParty ? 'center' : 'left';
                        return `<td class="govuk-table__cell" style="text-align:${align};">${cell}</td>`;
                    }).join('')
                        }</tr>`;
                }).join('');

            createPollsChart(headers, rows);
            initPredictions(headers, rows);

            document.getElementById('polls-loading').style.display = 'none';
            document.getElementById('polls-table-section').style.display = 'block';
            document.getElementById('prediction-section').style.display = 'block';

            const toggleBtn = document.getElementById('polls-table-toggle');
            const tableBody = document.getElementById('polls-table-body');
            toggleBtn.addEventListener('click', () => {
                const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
                toggleBtn.setAttribute('aria-expanded', String(!isExpanded));
                tableBody.hidden = isExpanded;
            });
        })
        .catch(err => {
            console.error(err);
            document.getElementById('polls-loading').innerHTML =
                `<div class="govuk-error-summary" data-module="govuk-error-summary">
                    <div role="alert">
                        <h2 class="govuk-error-summary__title">There is a problem</h2>
                        <div class="govuk-error-summary__body">
                            <p class="govuk-body">Could not load polling data. Please try again later.</p>
                        </div>
                    </div>
                </div>`;
        });
}


// ─────────────────────────────────────────────
// CHARTS
// ─────────────────────────────────────────────

function createPollsChart(headers, rows) {
    const pollRows = rows.filter(r => !r[0].toLowerCase().includes('election'));
    const pts = [...pollRows].reverse();
    const n = pts.length;
    if (!n) return;

    const partyDefs = headers.reduce((acc, h, i) => {
        if (partyColors[h]) acc.push({ name: h, idx: i });
        return acc;
    }, []);

    const series = partyDefs.map(p => {
        const values = pts.map(r => { const v = parseFloat(r[p.idx]); return isNaN(v) || v === 0 ? null : v; });
        const recent = values.slice(-20).filter(v => v !== null);
        const avg = recent.length ? recent.reduce((s, v) => s + v, 0) / recent.length : 0;
        return { name: p.name, color: partyColors[p.name], values, avg };
    }).filter(s => s.avg >= 2.5).sort((a, b) => b.avg - a.avg);

    const W = 880, H = 320;
    const ml = 44, mr = 12, mt = 12, mb = 68;
    const pw = W - ml - mr, ph = H - mt - mb;

    const maxY = Math.ceil(Math.max(...series.flatMap(s => s.values.map(v => v || 0))) / 5) * 5;
    const xOf = i => n > 1 ? (i / (n - 1)) * pw : pw / 2;
    const yOf = v => ph - (v / maxY) * ph;

    let gridHtml = '';
    for (let v = 0; v <= maxY; v += 5) {
        const y = yOf(v).toFixed(1);
        gridHtml += `<line x1="0" y1="${y}" x2="${pw}" y2="${y}" stroke="${v === 0 ? '#b1b4b6' : '#f3f2f1'}" stroke-width="1"/>`;
        gridHtml += `<text x="-6" y="${(+y + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#505a5f" font-family="arial,sans-serif">${v}%</text>`;
    }

    let xLabelHtml = '';
    const xCount = Math.min(8, n);
    for (let i = 0; i < xCount; i++) {
        const idx = xCount > 1 ? Math.round(i * (n - 1) / (xCount - 1)) : 0;
        xLabelHtml += `<text
        transform="translate(${xOf(idx).toFixed(1)}, ${(ph + 8).toFixed(1)}) rotate(-90)"
        text-anchor="end"
        dominant-baseline="middle"
        font-size="11" fill="#505a5f" font-family="arial,sans-serif"
    >${pts[idx][3] || ''}</text>`;
    }
    let linesHtml = '';
    series.forEach(s => {
        let d = '';
        s.values.forEach((v, i) => {
            if (v === null) return;
            const x = xOf(i).toFixed(1), y = yOf(v).toFixed(1);
            d += (i === 0 || s.values[i - 1] === null) ? `M ${x} ${y}` : ` L ${x} ${y}`;
        });
        if (d) linesHtml += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    });

    const container = document.getElementById('pollsChart');
    container.style.position = 'relative';
    container.innerHTML = `
        <svg id="polls-svg" width="100%" height="100%" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible;" aria-label="Polling trends">
            <g transform="translate(${ml},${mt})">
                ${gridHtml}
                ${linesHtml}
                <line id="polls-crosshair" x1="0" y1="0" x2="0" y2="${ph}" stroke="#0b0c0c" stroke-width="1" stroke-dasharray="4,3" opacity="0" pointer-events="none"/>
                <rect id="polls-hit" x="0" y="0" width="${pw}" height="${ph}" fill="transparent" style="cursor:crosshair;"/>
                ${xLabelHtml}
            </g>
        </svg>
        <div id="polls-tooltip" style="display:none;position:absolute;background:#fff;border:1px solid #0b0c0c;padding:8px 12px;font-size:12px;font-family:arial,sans-serif;pointer-events:none;z-index:10;min-width:130px;box-shadow:2px 2px 0 #0b0c0c;"></div>`;

    container.insertAdjacentHTML('afterend', `
        <div class="parliament-legend" style="margin-bottom:1.5rem;">
            ${series.map(s => `
            <span class="parliament-legend-item">
                <span style="display:inline-block;width:18px;height:2px;background:${s.color};vertical-align:middle;margin-right:2px;"></span>
                <strong style="color:${s.color}">${s.name}</strong>
            </span>`).join('')}
        </div>`);

    const svg = document.getElementById('polls-svg');
    const xhair = document.getElementById('polls-crosshair');
    const tip = document.getElementById('polls-tooltip');
    const hit = document.getElementById('polls-hit');

    hit.addEventListener('mousemove', e => {
        const rect = svg.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (W / rect.width) - ml;
        const idx = Math.max(0, Math.min(n - 1, Math.round((mouseX / pw) * (n - 1))));
        const cx = xOf(idx).toFixed(1);
        xhair.setAttribute('x1', cx); xhair.setAttribute('x2', cx); xhair.setAttribute('opacity', '0.5');

        tip.innerHTML = `<div style="font-weight:700;margin-bottom:6px;color:#0b0c0c;">${pts[idx][3] || ''}</div>` +
            series.map(s => {
                const v = s.values[idx];
                return `<div style="display:flex;justify-content:space-between;gap:12px;">
                    <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${s.color};margin-right:4px;vertical-align:middle;"></span>${s.name}</span>
                    <strong style="color:${s.color}">${v != null ? v.toFixed(1) + '%' : '—'}</strong>
                </div>`;
            }).join('');
        tip.style.display = 'block';

        const cRect = container.getBoundingClientRect();
        let tx = e.clientX - cRect.left + 14, ty = e.clientY - cRect.top - 16;
        if (tx + 160 > cRect.width) tx -= 172;
        tip.style.left = tx + 'px'; tip.style.top = ty + 'px';
    });

    hit.addEventListener('mouseleave', () => {
        xhair.setAttribute('opacity', '0');
        tip.style.display = 'none';
    });
}


// ─────────────────────────────────────────────
// PREDICTIONS
// ─────────────────────────────────────────────

function initPredictions(headers, rows) {
    _partyIndices = headers.reduce((acc, h, i) => {
        if (partyColors[h]) acc[h] = i;
        return acc;
    }, {});

    const electionRows = rows.filter(r => r[0].toLowerCase().includes('election'));
    _pollRows = rows.filter(r => !r[0].toLowerCase().includes('election'));
    _volatility = computeVolatility(_pollRows, _partyIndices);
    _ndBias = computeNDBias(electionRows, _pollRows, _partyIndices, 'ND');

    const sign = _ndBias >= 0 ? '+' : '';
    document.getElementById('nd-bias-label').textContent = `(${sign}${_ndBias.toFixed(2)}%)`;

    const slider = document.getElementById('abstention-slider');
    const sliderValue = document.getElementById('abstention-value');
    const select = document.getElementById('polls-count-select');
    const checkbox = document.getElementById('nd-correction-checkbox');

    slider.addEventListener('input', () => { sliderValue.textContent = slider.value; renderPrediction(); });
    select.addEventListener('change', renderPrediction);
    checkbox.addEventListener('change', renderPrediction);

    renderPrediction();
}

function renderPrediction() {
    const abstentionRate = parseInt(document.getElementById('abstention-slider').value || '35') / 100;
    const pollsCountVal = document.getElementById('polls-count-select').value || '10';
    const useNDCorrection = document.getElementById('nd-correction-checkbox').checked;

    const N = pollsCountVal === 'all' ? _pollRows.length : parseInt(pollsCountVal);
    const recentPolls = _pollRows.slice(-N);
    const total = recentPolls.length;

    const weightedSum = {};
    let totalWeight = 0;

    recentPolls.forEach((row, i) => {
        const w = 1 + (i / Math.max(total - 1, 1));
        totalWeight += w;
        for (const [party, idx] of Object.entries(_partyIndices)) {
            const v = parseFloat(row[idx]);
            if (!isNaN(v) && v > 0) weightedSum[party] = (weightedSum[party] || 0) + v * w;
        }
    });

    const base = {};
    for (const p of Object.keys(weightedSum)) base[p] = weightedSum[p] / totalWeight;

    const afterAbstention = {};
    for (const [party, b] of Object.entries(base)) {
        const vol = _volatility[party] || 0;
        const penalty = abstentionRate * (0.5 + 0.5 * vol) * b;
        afterAbstention[party] = Math.max(0, b - penalty);
    }

    if (useNDCorrection && afterAbstention['ND'] !== undefined) {
        afterAbstention['ND'] = Math.max(0, afterAbstention['ND'] + _ndBias);
    }

    const sumAfter = Object.values(afterAbstention).reduce((a, b) => a + b, 0);
    const predicted = {};
    for (const p of Object.keys(afterAbstention)) {
        predicted[p] = sumAfter > 0 ? (afterAbstention[p] / sumAfter) * 100 : 0;
    }

    const seats = allocateGreekSeats(predicted);
    renderPredictionCards(predicted, base, seats);
    renderPredictionStats(predicted, base);
    renderParliament(seats);
}


// ─────────────────────────────────────────────
// ELECTORAL LAW & PARLIAMENT
// ─────────────────────────────────────────────

function allocateGreekSeats(predicted) {
    const TOTAL = 300, THRESHOLD = 3.0;
    const eligible = Object.entries(predicted)
        .filter(([, v]) => v >= THRESHOLD)
        .sort((a, b) => b[1] - a[1]);

    if (!eligible.length) return {};

    const winnerParty = eligible[0][0];
    const winnerPct = eligible[0][1];

    let bonus = 0;
    if (winnerPct >= 25.0) {
        bonus = Math.min(20 + Math.floor((winnerPct - 25.0) / 0.5), 50);
    }

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

function renderParliament(seats) {
    const container = document.getElementById('parliament-container');
    if (!container) return;
    container.style.display = 'block';

    const sorted = Object.entries(seats).sort((a, b) => b[1] - a[1]);
    const hasMajority = sorted.some(([, c]) => c >= 151);

    const seatList = [];
    sorted.forEach(([party, count]) => { for (let i = 0; i < count; i++) seatList.push(party); });

    const arcs = [
        { r: 120, count: 34 },
        { r: 143, count: 40 },
        { r: 166, count: 47 },
        { r: 189, count: 53 },
        { r: 213, count: 60 },
        { r: 236, count: 66 },
    ];

    const cx = 240, cy = 240;
    let svg = `<svg viewBox="0 0 480 240" class="parliament-svg" aria-label="Parliament seat diagram">`;
    let idx = 0;

    for (const arc of arcs) {
        for (let i = 0; i < arc.count; i++) {
            if (idx >= 300) break;
            const angle = Math.PI - (i * (Math.PI / (arc.count - 1)));
            const x = cx + arc.r * Math.cos(angle);
            const y = cy - arc.r * Math.sin(angle);
            const color = partyColors[seatList[idx]] || '#b1b4b6';
            svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.77" fill="${color}">
                <title>${seatList[idx]}</title>
            </circle>`;
            idx++;
        }
    }
    svg += `</svg>`;

    const legend = sorted.map(([p, s]) => `
        <span class="parliament-legend-item">
            <span class="parliament-dot" style="background:${partyColors[p] || '#b1b4b6'};"></span>
            <strong style="color:${partyColors[p] || '#0b0c0c'}">${p}</strong>: ${s}
        </span>`).join('');

    container.innerHTML = `
        <div class="parliament-panel">
            <h3 class="govuk-heading-m govuk-!-text-align-centre">Parliament composition (300 seats)</h3>
            ${hasMajority
            ? `<p class="govuk-!-text-align-centre">
                    <strong class="parliament-majority-tag">
                        <i class="fa-solid fa-star" aria-hidden="true"></i> Absolute majority
                    </strong>
                  </p>`
            : ''}
            <div class="parliament-wrapper ${hasMajority ? 'majority-glow' : ''}">${svg}</div>
            <div class="parliament-legend">${legend}</div>
        </div>
    `;
}

function renderPredictionCards(predicted, base, seats) {
    const sorted = Object.entries(predicted)
        .sort(([, a], [, b]) => b - a)
        .filter(([, v]) => v >= 1.0);

    document.getElementById('prediction-cards').innerHTML = sorted.map(([party, pct]) => {
        const basePct = base[party] || 0;
        const diff = pct - basePct;
        const vol = ((_volatility[party] || 0) * 100).toFixed(0);
        const seat = seats[party] || 0;
        const color = partyColors[party] || '#0b0c0c';
        const diffSign = diff >= 0 ? '+' : '−';
        const diffClass = diff >= 0 ? 'text-up' : 'text-down';

        return `
        <div class="prediction-card" style="border-top-color:${color};">
            <div class="prediction-card__pct" style="color:${color};">${pct.toFixed(1)}%</div>
            <div class="prediction-card__party">${party}</div>
            <hr class="prediction-card__divider">
            <div class="prediction-card__details">
                <div>Polls: <strong>${basePct.toFixed(1)}%</strong>
                    <span class="${diffClass}">${diffSign}${Math.abs(diff).toFixed(1)}%</span>
                </div>
                <div>Volatility: <strong>${vol}%</strong></div>
                ${seat > 0 ? `<div>Seats: <strong style="color:${color};">${seat}</strong></div>` : ''}
            </div>
        </div>`;
    }).join('');
}

function renderPredictionStats(predicted, base) {
    const sorted = Object.entries(predicted)
        .sort(([, a], [, b]) => b - a)
        .filter(([, v]) => v >= 1.0);

    const maxVal = Math.max(
        ...sorted.map(([p, v]) => Math.max(v, base[p] || 0))
    );

    const rows = sorted.map(([party, forecast]) => {
        const poll = base[party] || 0;
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
                     style="width:${forecastW.toFixed(1)}%; background:${color};"
                     title="2027 Forecast: ${forecast.toFixed(1)}%"></div>
                <div class="pred-stat-bar pred-stat-bar--poll"
                     style="width:${pollW.toFixed(1)}%; background:${color}33;"
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


// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function computeNDBias(electionRows, pollRows, partyIndices, party) {
    const idx = partyIndices[party];
    if (idx === undefined || !electionRows.length) return 0;
    const biases = [];
    for (const elRow of electionRows) {
        const result = parseFloat(elRow[idx]);
        if (isNaN(result)) continue;
        const priorPolls = pollRows.filter(r => r[3] <= elRow[3]).slice(-10);
        if (!priorPolls.length) continue;
        const avg = priorPolls.reduce((sum, r) => sum + (parseFloat(r[idx]) || 0), 0) / priorPolls.length;
        biases.push(result - avg);
    }
    return biases.length ? biases.reduce((a, b) => a + b, 0) / biases.length : 0;
}

function computeVolatility(pollRows, partyIndices) {
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

function parseCSV(text) {
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