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
let _houseEffects = {}, _longRunAvg = {};


// ─────────────────────────────────────────────
// TEMPLATE
// ─────────────────────────────────────────────

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

            <div class="govuk-grid-row">
                <div class="govuk-grid-column-full">
                    <h2 class="govuk-heading-m">Polling trends</h2>
                    <div class="chart-wrapper" id="pollsChart"></div>
                </div>
            </div>

            <div id="polls-loading" class="ec-loader">
                <div class="ec-spinner"></div>
                Loading polling data…
            </div>

            <div id="polls-table-section" style="display:none;">
                <div class="polls-table-header">
                    <h2 class="govuk-heading-m govuk-!-margin-bottom-0">Raw polling data</h2>
                    <button class="polls-table-toggle" id="polls-table-toggle"
                        aria-expanded="false" aria-controls="polls-table-body" type="button">
                        <svg class="polls-toggle-chevron" aria-hidden="true" focusable="false"
                             width="20" height="20" viewBox="0 0 20 20">
                            <path d="M5 7l5 5 5-5" stroke="currentColor" stroke-width="2"
                                  fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span class="govuk-visually-hidden">Toggle raw polling data</span>
                    </button>
                </div>
                <div id="polls-table-body" hidden>
                    <div class="table-scroll">
                        <table class="govuk-table govuk-table--small-text-until-tablet">
                            <thead class="govuk-table__head" id="polls-thead"></thead>
                            <tbody class="govuk-table__body" id="polls-tbody"></tbody>
                        </table>
                    </div>
                    <div class="table-footer">
                        <p class="govuk-body-s govuk-!-colour-secondary">
                            Source: <a class="govuk-link"
                                href="https://en.wikipedia.org/wiki/Opinion_polling_for_the_next_Greek_parliamentary_election"
                                target="_blank" rel="noopener">Wikipedia</a>
                        </p>
                        <button class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0" id="download-btn">
                            <i class="fa-solid fa-download" aria-hidden="true"></i> Download CSV
                        </button>
                    </div>
                </div>
            </div>

            <div id="prediction-section" style="display:none;">
                <hr class="section-rule">
                <h2 class="govuk-heading-l">2027 election forecast</h2>
                <p class="govuk-body govuk-!-colour-secondary">
                    Multi-variable model: weighted polling average, abstention, house effects,
                    momentum, mean reversion, threshold risk and historical bias correction.
                </p>

                <div class="ec-controls-grid">

                    <div class="ec-control-group">
                        <h3 class="govuk-heading-s ec-control-group__title">Turnout &amp; base</h3>

                        <div class="govuk-form-group">
                            <label class="govuk-label govuk-label--s" for="abstention-slider">
                                Abstention rate: <strong id="abstention-value">35</strong>%
                            </label>
                            <input class="govuk-range" type="range" id="abstention-slider"
                                min="20" max="65" value="35" step="1">
                            <div class="govuk-hint">Expected non-voters on election day.</div>
                        </div>

                        <div class="govuk-form-group">
                            <label class="govuk-label govuk-label--s" for="polls-count-select">Poll base</label>
                            <select class="govuk-select" id="polls-count-select">
                                <option value="5">Last 5 polls</option>
                                <option value="10" selected>Last 10 polls</option>
                                <option value="20">Last 20 polls</option>
                                <option value="all">All polls</option>
                            </select>
                        </div>

                        <div class="govuk-form-group govuk-checkboxes govuk-checkboxes--small">
                            <div class="govuk-checkboxes__item">
                                <input class="govuk-checkboxes__input" id="sample-weight-checkbox" type="checkbox" checked>
                                <label class="govuk-label govuk-checkboxes__label" for="sample-weight-checkbox">
                                    Sample size weighting
                                </label>
                                <div class="govuk-hint govuk-checkboxes__hint">
                                    Weight polls by √n — larger samples count more.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="ec-control-group">
                        <h3 class="govuk-heading-s ec-control-group__title">Bias corrections</h3>

                        <div class="govuk-form-group govuk-checkboxes govuk-checkboxes--small">
                            <div class="govuk-checkboxes__item">
                                <input class="govuk-checkboxes__input" id="nd-correction-checkbox" type="checkbox" checked>
                                <label class="govuk-label govuk-checkboxes__label" for="nd-correction-checkbox">
                                    ND historical bias
                                    <strong id="nd-bias-label" style="color:#1d4e89;margin-left:4px;"></strong>
                                </label>
                                <div class="govuk-hint govuk-checkboxes__hint">
                                    Corrects ND's systematic gap between polls and election results.
                                </div>
                            </div>
                        </div>

                        <div class="govuk-form-group govuk-checkboxes govuk-checkboxes--small">
                            <div class="govuk-checkboxes__item">
                                <input class="govuk-checkboxes__input" id="house-effects-checkbox" type="checkbox" checked>
                                <label class="govuk-label govuk-checkboxes__label" for="house-effects-checkbox">
                                    House effects correction
                                </label>
                                <div class="govuk-hint govuk-checkboxes__hint">
                                    Adjusts for each firm's systematic over/underestimation per party.
                                </div>
                            </div>
                        </div>

                        <div class="govuk-form-group govuk-checkboxes govuk-checkboxes--small">
                            <div class="govuk-checkboxes__item">
                                <input class="govuk-checkboxes__input" id="lead-compression-checkbox" type="checkbox" checked>
                                <label class="govuk-label govuk-checkboxes__label" for="lead-compression-checkbox">
                                    Lead compression
                                </label>
                                <div class="govuk-hint govuk-checkboxes__hint">
                                    Large leads shrink on election day due to tactical voting.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="ec-control-group">
                        <h3 class="govuk-heading-s ec-control-group__title">Trend modelling</h3>

                        <div class="govuk-form-group">
                            <label class="govuk-label govuk-label--s" for="momentum-slider">
                                Momentum factor: <strong id="momentum-value">50</strong>%
                            </label>
                            <input class="govuk-range" type="range" id="momentum-slider"
                                min="0" max="100" value="50" step="5">
                            <div class="govuk-hint">Weight given to each party's current polling trend.</div>
                        </div>

                        <div class="govuk-form-group">
                            <label class="govuk-label govuk-label--s" for="reversion-slider">
                                Mean reversion: <strong id="reversion-value">20</strong>%
                            </label>
                            <input class="govuk-range" type="range" id="reversion-slider"
                                min="0" max="60" value="20" step="5">
                            <div class="govuk-hint">Pull toward each party's long-run polling average.</div>
                        </div>

                        <div class="govuk-form-group govuk-checkboxes govuk-checkboxes--small">
                            <div class="govuk-checkboxes__item">
                                <input class="govuk-checkboxes__input" id="threshold-risk-checkbox" type="checkbox" checked>
                                <label class="govuk-label govuk-checkboxes__label" for="threshold-risk-checkbox">
                                    Threshold risk redistribution
                                </label>
                                <div class="govuk-hint govuk-checkboxes__hint">
                                    Parties near 3% may fail; redistribute their expected lost votes.
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <details class="govuk-details">
                    <summary class="govuk-details__summary">
                        <span class="govuk-details__summary-text">House effects by polling firm</span>
                    </summary>
                    <div class="govuk-details__text" id="house-effects-table"></div>
                </details>

                <h3 class="govuk-heading-m govuk-!-margin-bottom-2">Forecast by party</h3>
                <div class="prediction-cards" id="prediction-cards"></div>

                <div id="parliament-container" style="display:none;"></div>
                <div id="coalition-container" style="display:none;"></div>
                <div id="prediction-stats"></div>

                <details class="govuk-details govuk-!-margin-top-6">
                    <summary class="govuk-details__summary">
                        <span class="govuk-details__summary-text">Methodology &amp; electoral law</span>
                    </summary>
                    <div class="govuk-details__text">
                        <h3 class="govuk-heading-s">Model variables</h3>
                        <ul class="govuk-list govuk-list--bullet govuk-body-s">
                            <li><strong>Recency weighting:</strong> More recent polls receive up to 2× weight.</li>
                            <li><strong>Sample size weighting:</strong> Each poll weighted by √n of its sample size.</li>
                            <li><strong>House effects:</strong> Per-firm systematic deviation from the cross-firm mean, subtracted at poll level. Requires ≥3 polls per firm.</li>
                            <li><strong>ND historical bias:</strong> ND's average underestimation in polls vs. actual election results across past elections.</li>
                            <li><strong>Abstention penalty:</strong> abstention × (0.5 + 0.5 × volatility) applied per party.</li>
                            <li><strong>Momentum:</strong> Linear regression slope over the selected poll window, scaled by the momentum factor.</li>
                            <li><strong>Trend acceleration:</strong> Comparison of recent vs. earlier momentum, shown as an indicator on each forecast card.</li>
                            <li><strong>Mean reversion:</strong> Partial pull toward each party's long-run polling average.</li>
                            <li><strong>Lead compression:</strong> Leads above 10pp are partially compressed — 15% of the excess is redistributed to 2nd and 3rd place.</li>
                            <li><strong>Threshold risk redistribution:</strong> Parties polling 3–7% face a failure probability based on volatility and distance from the threshold. Expected lost votes redistribute to parties safely above it.</li>
                        </ul>
                        <h3 class="govuk-heading-s">Seat allocation (Law 4654/2020)</h3>
                        <p class="govuk-body-s govuk-!-margin-bottom-0">
                            3% threshold. Tiered first-place bonus: 20 seats at 25%, +1 per 0.5pp, capped at 50.
                            Remainder by Largest Remainder method.
                        </p>
                    </div>
                </details>

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

            document.getElementById('polls-thead').innerHTML =
                `<tr class="govuk-table__row">${headers.map(h => {
                    const color = partyColors[h];
                    const style = color ? `border-bottom:4px solid ${color};color:${color};` : '';
                    return `<th scope="col" class="govuk-table__header" style="${style}">${h}</th>`;
                }).join('')}</tr>`;

            document.getElementById('polls-tbody').innerHTML =
                rows.map(row => {
                    const isElection = row[0].toLowerCase().includes('election');
                    const rowStyle = isElection ? 'background:#fff3cd;font-weight:700;' : '';
                    return `<tr class="govuk-table__row" style="${rowStyle}">${row.map((cell, i) => {
                        const align = partyColors[headers[i]] ? 'center' : 'left';
                        return `<td class="govuk-table__cell" style="text-align:${align};">${cell}</td>`;
                    }).join('')}</tr>`;
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
                `<div class="govuk-error-summary"><div role="alert">
                    <h2 class="govuk-error-summary__title">There is a problem</h2>
                    <div class="govuk-error-summary__body">
                        <p class="govuk-body">Could not load polling data. Please try again later.</p>
                    </div>
                </div></div>`;
        });
}


// ─────────────────────────────────────────────
// CHART
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
        xLabelHtml += `<text transform="translate(${xOf(idx).toFixed(1)},${(ph + 8).toFixed(1)}) rotate(-90)"
            text-anchor="end" dominant-baseline="middle"
            font-size="11" fill="#505a5f" font-family="arial,sans-serif">${pts[idx][3] || ''}</text>`;
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
                ${gridHtml}${linesHtml}
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
    hit.addEventListener('mouseleave', () => { xhair.setAttribute('opacity', '0'); tip.style.display = 'none'; });
}


// ─────────────────────────────────────────────
// PREDICTIONS INIT
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
    _houseEffects = computeHouseEffects(_pollRows, _partyIndices);
    _longRunAvg = computeLongRunAverage(_pollRows, _partyIndices);

    const sign = _ndBias >= 0 ? '+' : '';
    document.getElementById('nd-bias-label').textContent = `(${sign}${_ndBias.toFixed(2)}%)`;

    renderHouseEffectsTable(_houseEffects, _partyIndices);

    const controls = [
        'abstention-slider', 'polls-count-select', 'nd-correction-checkbox',
        'sample-weight-checkbox', 'house-effects-checkbox', 'lead-compression-checkbox',
        'threshold-risk-checkbox', 'momentum-slider', 'reversion-slider',
    ];
    controls.forEach(id => {
        const el = document.getElementById(id);
        const evt = el.type === 'range' ? 'input' : 'change';
        el.addEventListener(evt, () => {
            if (id === 'abstention-slider') document.getElementById('abstention-value').textContent = el.value;
            if (id === 'momentum-slider') document.getElementById('momentum-value').textContent = el.value;
            if (id === 'reversion-slider') document.getElementById('reversion-value').textContent = el.value;
            renderPrediction();
        });
    });

    renderPrediction();
}


// ─────────────────────────────────────────────
// RENDER PREDICTION
// ─────────────────────────────────────────────

function renderPrediction() {
    const abstentionRate = parseInt(document.getElementById('abstention-slider').value) / 100;
    const pollsCountVal = document.getElementById('polls-count-select').value;
    const useNDCorrection = document.getElementById('nd-correction-checkbox').checked;
    const useSampleWeight = document.getElementById('sample-weight-checkbox').checked;
    const useHouseEffects = document.getElementById('house-effects-checkbox').checked;
    const useLeadCompress = document.getElementById('lead-compression-checkbox').checked;
    const momentumFactor = parseInt(document.getElementById('momentum-slider').value) / 100;
    const reversionFactor = parseInt(document.getElementById('reversion-slider').value) / 100;
    const useThresholdRisk = document.getElementById('threshold-risk-checkbox').checked;

    const N = pollsCountVal === 'all' ? _pollRows.length : parseInt(pollsCountVal);
    const recentPolls = _pollRows.slice(-N);
    const total = recentPolls.length;

    const momentum = computeMomentum(_pollRows, _partyIndices, N);
    const acceleration = computeTrendAcceleration(_pollRows, _partyIndices, N);

    // ── Step 1: Weighted average with optional house-effect correction per poll ──
    const weightedSum = {};
    let totalWeight = 0;

    recentPolls.forEach((row, i) => {
        const recencyW = 1 + (i / Math.max(total - 1, 1));
        const sampleW = useSampleWeight ? Math.sqrt(parseSampleSize(row[4])) : 1;
        const w = recencyW * sampleW;
        totalWeight += w;
        const firm = row[0].split('/')[0].trim();

        for (const [party, idx] of Object.entries(_partyIndices)) {
            let v = parseFloat(row[idx]);
            if (isNaN(v) || v <= 0) continue;
            if (useHouseEffects && _houseEffects[firm]?.[party] !== undefined) {
                v = Math.max(0, v - _houseEffects[firm][party]);
            }
            weightedSum[party] = (weightedSum[party] || 0) + v * w;
        }
    });

    // Uncorrected poll average for display in cards / stats
    const rawBase = {};
    for (const p of Object.keys(weightedSum)) rawBase[p] = weightedSum[p] / totalWeight;

    let base = { ...rawBase };

    // ── Step 2: Momentum ──
    if (momentumFactor > 0) {
        for (const [party, slope] of Object.entries(momentum)) {
            if (base[party] !== undefined) {
                base[party] = Math.max(0, base[party] + slope * momentumFactor * 2);
            }
        }
    }

    // ── Step 3: Mean reversion ──
    if (reversionFactor > 0) {
        for (const [party, longAvg] of Object.entries(_longRunAvg)) {
            if (base[party] !== undefined && longAvg > 0) {
                base[party] += (longAvg - base[party]) * reversionFactor;
            }
        }
    }

    // ── Step 4: ND historical bias ──
    if (useNDCorrection && base['ND'] !== undefined) {
        base['ND'] = Math.max(0, base['ND'] + _ndBias);
    }

    // ── Step 5: Lead compression ──
    if (useLeadCompress) {
        const sorted = Object.entries(base).sort(([, a], [, b]) => b - a);
        if (sorted.length >= 2) {
            const lead = sorted[0][1] - sorted[1][1];
            if (lead > 10) {
                const compression = (lead - 10) * 0.15;
                base[sorted[0][0]] = Math.max(0, base[sorted[0][0]] - compression);
                if (sorted[1]) base[sorted[1][0]] = (base[sorted[1][0]] || 0) + compression * 0.6;
                if (sorted[2]) base[sorted[2][0]] = (base[sorted[2][0]] || 0) + compression * 0.4;
            }
        }
    }

    // ── Step 6: Abstention penalty ──
    const afterAbstention = {};
    for (const [party, b] of Object.entries(base)) {
        const vol = _volatility[party] || 0;
        const penalty = abstentionRate * (0.5 + 0.5 * vol) * b;
        afterAbstention[party] = Math.max(0, b - penalty);
    }

    // ── Step 7: Normalise ──
    const sumAfter = Object.values(afterAbstention).reduce((a, b) => a + b, 0);
    let predicted = {};
    for (const p of Object.keys(afterAbstention)) {
        predicted[p] = sumAfter > 0 ? (afterAbstention[p] / sumAfter) * 100 : 0;
    }

    // ── Step 8: Threshold risk redistribution ──
    if (useThresholdRisk) predicted = applyThresholdRisk(predicted, _volatility);

    const seats = allocateGreekSeats(predicted);
    renderPredictionCards(predicted, rawBase, seats, momentum, acceleration);
    renderPredictionStats(predicted, rawBase);
    renderParliament(seats);
    renderCoalitions(seats);
}


// ─────────────────────────────────────────────
// THRESHOLD RISK
// ─────────────────────────────────────────────

function applyThresholdRisk(predicted, volatility) {
    const THRESHOLD = 3.0;
    const result = { ...predicted };
    let redistributed = 0;

    for (const [party, pct] of Object.entries(predicted)) {
        if (pct >= THRESHOLD && pct < 7.0) {
            const vol = volatility[party] || 0;
            const dist = pct - THRESHOLD;
            // Higher volatility + closer to threshold = higher fail probability
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


// ─────────────────────────────────────────────
// ELECTORAL LAW
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


// ─────────────────────────────────────────────
// PARLIAMENT
// ─────────────────────────────────────────────

function renderParliament(seats) {
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
    let idx = 0;

    for (const arc of arcs) {
        for (let i = 0; i < arc.count; i++) {
            if (idx >= 300) break;
            const angle = Math.PI - (i * (Math.PI / (arc.count - 1)));
            const x = cx + arc.r * Math.cos(angle);
            const y = cy - arc.r * Math.sin(angle);
            const color = partyColors[seatList[idx]] || '#b1b4b6';
            svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" fill="${color}"><title>${seatList[idx]}</title></circle>`;
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
        <div class="parliament-panel ${hasMajority ? 'majority-glow' : ''}">
            <h3 class="govuk-heading-m govuk-!-text-align-centre">Parliament composition (300 seats)</h3>
            ${hasMajority ? `<p class="govuk-!-text-align-centre">
                <strong class="parliament-majority-tag">
                    <i class="fa-solid fa-star" aria-hidden="true"></i> Absolute majority
                </strong></p>` : ''}
            <div class="parliament-wrapper">${svg}</div>
            <div class="parliament-legend">${legend}</div>
        </div>`;
}


// ─────────────────────────────────────────────
// COALITION ANALYSIS
// ─────────────────────────────────────────────

function renderCoalitions(seats) {
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

            // Ensure no strict subset of this coalition already forms a majority
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


// ─────────────────────────────────────────────
// PREDICTION CARDS
// ─────────────────────────────────────────────

function renderPredictionCards(predicted, rawBase, seats, momentum, acceleration) {
    const sorted = Object.entries(predicted)
        .sort(([, a], [, b]) => b - a)
        .filter(([, v]) => v >= 1.0);

    document.getElementById('prediction-cards').innerHTML = sorted.map(([party, pct]) => {
        const basePct = rawBase[party] || 0;
        const diff = pct - basePct;
        const vol = ((_volatility[party] || 0) * 100).toFixed(0);
        const seat = seats[party] || 0;
        const color = partyColors[party] || '#0b0c0c';
        const diffSign = diff >= 0 ? '+' : '−';
        const diffClass = diff >= 0 ? 'text-up' : 'text-down';

        const slope = momentum[party] || 0;
        const accel = acceleration[party] || 0;

        let momentumIcon, momentumLabel;
        if (Math.abs(slope) < 0.05) {
            momentumIcon = '→'; momentumLabel = 'Stable';
        } else if (slope > 0) {
            momentumIcon = accel > 0.02 ? '↑↑' : '↑';
            momentumLabel = accel > 0.02 ? 'Rising fast' : 'Rising';
        } else {
            momentumIcon = accel < -0.02 ? '↓↓' : '↓';
            momentumLabel = accel < -0.02 ? 'Falling fast' : 'Falling';
        }
        const momentumColor = slope > 0.05 ? '#00703c' : slope < -0.05 ? '#d4351c' : '#505a5f';

        return `
        <div class="prediction-card" style="border-top-color:${color};">
            <div class="prediction-card__pct" style="color:${color};">${pct.toFixed(1)}%</div>
            <div class="prediction-card__party">${party}</div>
            <div class="prediction-card__momentum" style="color:${momentumColor};">
                <span aria-hidden="true">${momentumIcon}</span>
                <span class="govuk-visually-hidden">${momentumLabel}</span>
                <span>${momentumLabel}</span>
            </div>
            <hr class="prediction-card__divider">
            <div class="prediction-card__details">
                <div>Poll avg: <strong>${basePct.toFixed(1)}%</strong>
                    <span class="${diffClass}">${diffSign}${Math.abs(diff).toFixed(1)}%</span>
                </div>
                <div>Volatility: <strong>${vol}%</strong></div>
                ${seat > 0 ? `<div>Seats: <strong style="color:${color};">${seat}</strong></div>` : ''}
            </div>
        </div>`;
    }).join('');
}


// ─────────────────────────────────────────────
// FORECAST VS POLL STATS
// ─────────────────────────────────────────────

function renderPredictionStats(predicted, rawBase) {
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


// ─────────────────────────────────────────────
// HOUSE EFFECTS TABLE
// ─────────────────────────────────────────────

function renderHouseEffectsTable(houseEffects, partyIndices) {
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


// ─────────────────────────────────────────────
// STATISTICAL HELPERS
// ─────────────────────────────────────────────

function computeHouseEffects(pollRows, partyIndices) {
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

function computeMomentum(pollRows, partyIndices, N) {
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

function computeTrendAcceleration(pollRows, partyIndices, N) {
    const half = Math.max(3, Math.floor(N / 2));
    const recent = computeMomentum(pollRows.slice(-half), partyIndices, half);
    const older = computeMomentum(pollRows.slice(-N, -half), partyIndices, N - half);
    const result = {};
    for (const party of Object.keys(recent)) {
        result[party] = (recent[party] || 0) - (older[party] || 0);
    }
    return result;
}

function computeLongRunAverage(pollRows, partyIndices) {
    const avg = {};
    for (const [party, idx] of Object.entries(partyIndices)) {
        const vals = pollRows.map(r => parseFloat(r[idx])).filter(v => !isNaN(v) && v > 0);
        avg[party] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }
    return avg;
}

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

function parseSampleSize(str) {
    if (!str) return 1000;
    const n = parseInt(str.replace(/[^0-9]/g, ''));
    return isNaN(n) || n === 0 ? 1000 : n;
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