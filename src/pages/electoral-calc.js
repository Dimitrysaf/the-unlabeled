import { updateContent } from '../components/Layout.js';
import './electoral-calc.css';

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

// Current parliamentary seats by party abbreviation (for seat gain/loss deltas).
// Source baseline: Hellenic Parliament composition (as reflected on Wikipedia, accessed 2026-04-28).
const currentParliamentSeats = {
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

let _pollRows = [], _partyIndices = {}, _volatility = {}, _ndBias = 0;
let _houseEffects = {}, _longRunAvg = {};

const forecastDefaults = {
    abstentionPct: 35,
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


// ─────────────────────────────────────────────
// TEMPLATE  (pure HTML — no updateContent call)
// ─────────────────────────────────────────────

export function getCalcHTML() {
    const skeletonLegend = [
        { c: '#1d4e89' }, 
        { c: '#00a14b' },
        { c: '#ff4b4b' },
        { c: '#ed1c24' }, 
        { c: '#0d3b66' }, 
        { c: '#8a2be2' }, 
        { c: '#e20074' }, 
        { c: '#0097a7' },
    ].map(p => `<span class="ec-skeleton__legend-item" style="--c:${p.c}"></span>`).join('');

    // Fake chart polylines — static ghost of what the real chart will look like.
    const fakeLines = [
        { pts: '0,215 60,190 130,170 200,182 280,145 360,130 440,138 520,115 620,105 720,98 824,88', c: '#1d4e89', o: 0.22 },
        { pts: '0,148 60,155 130,140 200,152 280,158 360,145 440,150 520,143 620,148 720,140 824,145', c: '#00a14b', o: 0.18 },
        { pts: '0,185 60,175 130,190 200,178 280,188 360,175 440,180 520,172 620,177 720,168 824,174', c: '#ff4b4b', o: 0.18 },
        { pts: '0,228 60,222 130,230 200,220 280,226 360,218 440,224 520,215 620,222 720,214 824,220', c: '#ed1c24', o: 0.14 },
        { pts: '0,240 60,235 130,242 200,234 280,238 360,230 440,236 520,228 620,234 720,226 824,232', c: '#0d3b66', o: 0.12 },
    ].map(l =>
        `<polyline points="${l.pts}" fill="none" stroke="${l.c}" stroke-width="2.5" opacity="${l.o}" stroke-linejoin="round" stroke-linecap="round"/>`
    ).join('');

    const gridLines = [60, 120, 180, 240].map(y =>
        `<line x1="44" y1="${y}" x2="836" y2="${y}" stroke="#f0f0f0" stroke-width="1"/>`
    ).join('');

    const yLabels = ['40%', '30%', '20%', '10%'].map((lbl, i) =>
        `<text x="38" y="${60 + i * 60 + 4}" text-anchor="end" font-size="11" fill="#d4d4d4" font-family="arial,sans-serif">${lbl}</text>`
    ).join('');

    return `
        <div class="govuk-grid-row govuk-!-margin-top-4">
            <div class="govuk-grid-column-full">
                <h2 class="govuk-heading-m">Polling trends</h2>
                <div class="chart-wrapper" id="pollsChart"></div>
            </div>
        </div>

        <div id="polls-loading" class="ec-skeleton" role="status" aria-label="Loading polling data">

            <div class="ec-skeleton__chart">
                <div class="ec-skeleton__chart-yaxis">
                    <span></span><span></span><span></span><span></span><span></span>
                </div>
                <div class="ec-skeleton__chart-body">
                    <svg class="ec-skeleton__chart-svg" viewBox="0 0 880 300"
                         preserveAspectRatio="none" aria-hidden="true">
                        ${gridLines}
                        ${yLabels}
                        ${fakeLines}
                    </svg>
                </div>
            </div>

            <div class="ec-skeleton__legend" aria-hidden="true">
                ${skeletonLegend}
            </div>

            <div class="ec-skeleton__cards" aria-hidden="true">
                <div class="ec-skeleton__card"></div>
                <div class="ec-skeleton__card"></div>
                <div class="ec-skeleton__card"></div>
                <div class="ec-skeleton__card"></div>
                <div class="ec-skeleton__card"></div>
                <div class="ec-skeleton__card"></div>
                <div class="ec-skeleton__card"></div>
                <div class="ec-skeleton__card"></div>
            </div>

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
                    <table class="govuk-table govuk-table--small-text-until-tablet table-auto-layout">
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
                            min="0" max="100" value="35" step="1">
                        <div class="govuk-hint">Expected non-voters on election day.</div>
                    </div>

                    <div class="govuk-form-group">
                        <label class="govuk-label govuk-label--s" for="polls-count-select">Poll base</label>
                        <select class="govuk-select" id="polls-count-select">
                            <option value="1d">Last 1 day</option>
                            <option value="3d">Last 3 days</option>
                            <option value="7d">Last 1 week</option>
                            <option value="10d">Last 10 days</option>
                            <option value="14d">Last 2 weeks</option>
                            <option value="21d">Last 3 weeks</option>
                            <option value="28d">Last 4 weeks</option>
                            <option value="35d">Last 5 weeks</option>
                            <option value="42d">Last 6 weeks</option>
                            <option value="49d">Last 7 weeks</option>
                            <option value="56d">Last 8 weeks</option>
                            <option value="30d" selected>Last 1 month</option>
                            <option value="45d">Last 1.5 months</option>
                            <option value="60d">Last 2 months</option>
                            <option value="75d">Last 2.5 months</option>
                            <option value="90d">Last 3 months</option>
                            <option value="105d">Last 3.5 months</option>
                            <option value="120d">Last 4 months</option>
                            <option value="135d">Last 4.5 months</option>
                            <option value="150d">Last 5 months</option>
                            <option value="165d">Last 5.5 months</option>
                            <option value="180d">Last 6 months</option>
                            <option value="210d">Last 7 months</option>
                            <option value="240d">Last 8 months</option>
                            <option value="270d">Last 9 months</option>
                            <option value="300d">Last 10 months</option>
                            <option value="330d">Last 11 months</option>
                            <option value="365d">Last 1 year</option>
                            <option value="395d">Last 13 months</option>
                            <option value="425d">Last 14 months</option>
                            <option value="455d">Last 15 months</option>
                            <option value="485d">Last 16 months</option>
                            <option value="515d">Last 17 months</option>
                            <option value="545d">Last 18 months</option>
                            <option value="575d">Last 19 months</option>
                            <option value="605d">Last 20 months</option>
                            <option value="635d">Last 21 months</option>
                            <option value="665d">Last 22 months</option>
                            <option value="695d">Last 23 months</option>
                            <option value="730d">Last 2 years</option>
                            <option value="820d">Last 27 months</option>
                            <option value="910d">Last 30 months</option>
                            <option value="1000d">Last 33 months</option>
                            <option value="1095d">Last 3 years</option>
                            <option value="all">All polls</option>
                        </select>
                    </div>

                    <div class="govuk-form-group">
                        <label class="govuk-label govuk-label--s" for="election-date-picker">
                            Election date
                        </label>
                        <input class="govuk-input" id="election-date-picker" type="date">
                        <div class="govuk-hint" id="election-horizon-hint">
                            Projection horizon is measured from the latest poll midpoint date.
                        </div>
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
                            min="0" max="100" value="20" step="5">
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
            <div class="govuk-button-group govuk-!-margin-bottom-4">
                <button class="govuk-button govuk-button--secondary" id="reset-defaults-btn" type="button">
                    Reset to defaults
                </button>
            </div>

            <details class="govuk-details">
                <summary class="govuk-details__summary">
                    <span class="govuk-details__summary-text">House effects by polling firm</span>
                </summary>
                <div class="govuk-details__text" id="house-effects-table"></div>
            </details>

            <h3 class="govuk-heading-m govuk-!-margin-bottom-2">Forecast by party</h3>
            <div class="prediction-cards" id="prediction-cards"></div>
            <div id="prediction-uncertainty"></div>

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
    `;
}


// ─────────────────────────────────────────────
// INIT  (attaches events and kicks off data load — call after HTML is in DOM)
// ─────────────────────────────────────────────

export function initCalc() {
    loadPolls();
    document.getElementById('download-btn').addEventListener('click', () => {
        window.location.href = '/polls.csv';
    });
}


// ─────────────────────────────────────────────
// STANDALONE PAGE RENDER  (for the /electoral-calc direct route)
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
            ${getCalcHTML()}
        </div>
    `);
    initCalc();
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
    const ml = 44, mr = 12, mt = 12, mb = 58;
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
        xLabelHtml += `<text transform="translate(${xOf(idx).toFixed(1)},${(ph + 12).toFixed(1)}) rotate(-35)"
            text-anchor="end" dominant-baseline="hanging"
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

    applyForecastDefaults();

    const sign = _ndBias >= 0 ? '+' : '';
    document.getElementById('nd-bias-label').textContent = `(${sign}${_ndBias.toFixed(2)}%)`;

    renderHouseEffectsTable(_houseEffects, _partyIndices);

    const controls = [
        'abstention-slider', 'polls-count-select', 'nd-correction-checkbox',
        'sample-weight-checkbox', 'house-effects-checkbox', 'lead-compression-checkbox',
        'threshold-risk-checkbox', 'momentum-slider', 'reversion-slider', 'election-date-picker',
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

    const resetBtn = document.getElementById('reset-defaults-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            applyForecastDefaults();
            renderPrediction();
        });
    }

    renderPrediction();
}

function applyForecastDefaults() {
    const abstention = document.getElementById('abstention-slider');
    const pollBase = document.getElementById('polls-count-select');
    const electionDate = document.getElementById('election-date-picker');
    const sampleWeight = document.getElementById('sample-weight-checkbox');
    const ndCorrection = document.getElementById('nd-correction-checkbox');
    const houseEffects = document.getElementById('house-effects-checkbox');
    const leadCompression = document.getElementById('lead-compression-checkbox');
    const thresholdRisk = document.getElementById('threshold-risk-checkbox');
    const momentum = document.getElementById('momentum-slider');
    const reversion = document.getElementById('reversion-slider');

    if (!abstention || !pollBase || !electionDate || !sampleWeight || !ndCorrection || !houseEffects ||
        !leadCompression || !thresholdRisk || !momentum || !reversion) return;

    abstention.value = String(forecastDefaults.abstentionPct);
    pollBase.value = forecastDefaults.pollBase;
    electionDate.value = forecastDefaults.electionDate;
    sampleWeight.checked = forecastDefaults.useSampleWeight;
    ndCorrection.checked = forecastDefaults.useNDCorrection;
    houseEffects.checked = forecastDefaults.useHouseEffects;
    leadCompression.checked = forecastDefaults.useLeadCompression;
    thresholdRisk.checked = forecastDefaults.useThresholdRisk;
    momentum.value = String(forecastDefaults.momentumPct);
    reversion.value = String(forecastDefaults.reversionPct);

    document.getElementById('abstention-value').textContent = String(forecastDefaults.abstentionPct);
    document.getElementById('momentum-value').textContent = String(forecastDefaults.momentumPct);
    document.getElementById('reversion-value').textContent = String(forecastDefaults.reversionPct);
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
    const useThresholdRisk = document.getElementById('threshold-risk-checkbox').checked;
    const electionDateRaw = document.getElementById('election-date-picker').value;
    const momentumSliderEl = document.getElementById('momentum-slider');
    const reversionSliderEl = document.getElementById('reversion-slider');

    const recentPolls = filterPollsByDateWindow(_pollRows, pollsCountVal);
    const total = recentPolls.length;
    if (!total) return;

    const horizonDays = getHorizonDaysFromRows(recentPolls, electionDateRaw);
    const hasElectionDate = !!parseInputDate(electionDateRaw);
    const autoMomentumPct = getAutoMomentumPercent(horizonDays);
    const autoReversionPct = getAutoReversionPercent(horizonDays);

    if (hasElectionDate) {
        momentumSliderEl.value = String(autoMomentumPct);
        reversionSliderEl.value = String(autoReversionPct);
        momentumSliderEl.disabled = true;
        reversionSliderEl.disabled = true;
    } else {
        momentumSliderEl.disabled = false;
        reversionSliderEl.disabled = false;
    }

    document.getElementById('momentum-value').textContent = momentumSliderEl.value;
    document.getElementById('reversion-value').textContent = reversionSliderEl.value;

    const momentumFactor = parseInt(momentumSliderEl.value, 10) / 100;
    const reversionFactor = parseInt(reversionSliderEl.value, 10) / 100;
    const momentumHorizonScale = hasElectionDate ? 1 : getMomentumHorizonScale(horizonDays);
    const reversionHorizonScale = hasElectionDate ? 1 : getReversionHorizonScale(horizonDays);

    const horizonHint = document.getElementById('election-horizon-hint');
    if (horizonHint) {
        if (hasElectionDate) {
            horizonHint.textContent = `Projection horizon: ${Math.max(0, horizonDays)} day${Math.abs(horizonDays) === 1 ? '' : 's'} from latest poll midpoint. Momentum ${autoMomentumPct}% and mean reversion ${autoReversionPct}% are auto-set.`;
        } else {
            horizonHint.textContent = 'Projection horizon is measured from the latest poll midpoint date.';
        }
    }

    const momentum = computeMomentum(recentPolls, _partyIndices, total);
    const acceleration = computeTrendAcceleration(recentPolls, _partyIndices, total);

    const options = {
        abstentionRate,
        useNDCorrection,
        useSampleWeight,
        useHouseEffects,
        useLeadCompress,
        useThresholdRisk,
        momentumFactor,
        reversionFactor,
        momentumHorizonScale,
        reversionHorizonScale,
        horizonDays,
    };

    const forecast = getForecastOutcome(recentPolls, options);
    const seats = forecast.seats;
    const predicted = forecast.predicted;
    const rawBase = forecast.rawBase;

    const simulation = runSimulation(recentPolls, options);
    const summary = summariseSimulation(simulation);

    const confidenceScores = computeConfidenceScores(predicted, _volatility, total, Math.max(0, horizonDays));
    renderPredictionCards(predicted, rawBase, seats, momentum, acceleration, confidenceScores, total, summary);
    renderPredictionStats(predicted, rawBase);
    renderParliament(seats);
    renderCoalitions(seats);
    renderUncertaintySummary(summary);
}

function getForecastOutcome(recentPolls, options) {
    const { abstentionRate, useNDCorrection, useSampleWeight, useHouseEffects, useLeadCompress, useThresholdRisk, momentumFactor, reversionFactor, momentumHorizonScale, reversionHorizonScale } = options;
    const total = recentPolls.length;
    const momentum = computeMomentum(recentPolls, _partyIndices, total);

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

    const rawBase = {};
    for (const p of Object.keys(weightedSum)) rawBase[p] = weightedSum[p] / totalWeight;

    let base = { ...rawBase };

    if (momentumFactor > 0) {
        for (const [party, slope] of Object.entries(momentum)) {
            if (base[party] !== undefined) {
                base[party] = Math.max(0, base[party] + slope * momentumFactor * 2 * momentumHorizonScale);
            }
        }
    }

    if (reversionFactor > 0 && reversionHorizonScale > 0) {
        for (const [party, longAvg] of Object.entries(_longRunAvg)) {
            if (base[party] !== undefined && longAvg > 0) {
                base[party] += (longAvg - base[party]) * reversionFactor * reversionHorizonScale;
            }
        }
    }

    if (useNDCorrection && base['ND'] !== undefined) {
        base['ND'] = Math.max(0, base['ND'] + _ndBias);
    }

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

    const afterAbstention = {};
    for (const [party, b] of Object.entries(base)) {
        const vol = _volatility[party] || 0;
        const penalty = abstentionRate * (0.5 + 0.5 * vol) * b;
        afterAbstention[party] = Math.max(0, b - penalty);
    }

    const sumAfter = Object.values(afterAbstention).reduce((a, b) => a + b, 0);
    let predicted = {};
    for (const p of Object.keys(afterAbstention)) {
        predicted[p] = sumAfter > 0 ? (afterAbstention[p] / sumAfter) * 100 : 0;
    }

    if (useThresholdRisk) predicted = applyThresholdRisk(predicted, _volatility);

    const seats = allocateGreekSeats(predicted);
    return { predicted, rawBase, seats };
}

function runSimulation(recentPolls, options, iterations = 1000) {
    const parties = Object.keys(_partyIndices);
    const partySeatResults = {};
    const partyVoteResults = {};
    const winnerCounts = {};
    let majorityCount = 0;

    parties.forEach(party => {
        partySeatResults[party] = [];
        partyVoteResults[party] = [];
        winnerCounts[party] = 0;
    });

    for (let i = 0; i < iterations; i++) {
        const noisyPolls = addNoiseToPolls(recentPolls);
        const forecast = getForecastOutcome(noisyPolls, options);
        const winner = getLargestParty(forecast.seats);
        const hasMajority = Object.values(forecast.seats).some(s => s >= 151);

        if (winner) winnerCounts[winner] = (winnerCounts[winner] || 0) + 1;
        if (hasMajority) majorityCount += 1;

        parties.forEach(party => {
            partySeatResults[party].push(forecast.seats[party] || 0);
            partyVoteResults[party].push(forecast.predicted[party] || 0);
        });
    }

    return {
        iterations,
        winnerCounts,
        majorityCount,
        partySeatResults,
        partyVoteResults,
    };
}

function addNoiseToPolls(pollRows) {
    return pollRows.map(row => {
        const copy = [...row];
        for (const [party, idx] of Object.entries(_partyIndices)) {
            const value = parseFloat(row[idx]);
            if (isNaN(value) || value <= 0) continue;
            copy[idx] = (value + randomNormal(0, 2.5)).toFixed(2);
        }
        return copy;
    });
}

function randomNormal(mean = 0, std = 1) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function percentile(arr, p) {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = (p / 100) * (sorted.length - 1);
    return sorted[Math.floor(idx)];
}

function getLargestParty(seats) {
    const sorted = Object.entries(seats).sort(([, a], [, b]) => b - a);
    return sorted.length ? sorted[0][0] : null;
}

function summariseSimulation(simulation) {
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

    // Keep the same hemicycle positions, but assign party colors by columns (vertical),
    // not row-by-row arc scans (horizontal).
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

function renderPredictionCards(predicted, rawBase, seats, momentum, acceleration, confidence, windowSize, summary) {
    const sorted = Object.entries(predicted)
        .sort(([, a], [, b]) => b - a)
        .filter(([, v]) => v >= 1.0);

    document.getElementById('prediction-cards').innerHTML = sorted.map(([party, pct]) => {
        const basePct = rawBase[party] || 0;
        const diff = pct - basePct;
        const vol = ((_volatility[party] || 0) * 100).toFixed(0);
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

function renderUncertaintySummary(summary) {
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

function computeConfidenceScores(predicted, volatility, sampleCount, horizonDays) {
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

function parseSampleSize(str) {
    if (!str) return 1000;
    const n = parseInt(str.replace(/[^0-9]/g, ''));
    return isNaN(n) || n === 0 ? 1000 : n;
}

function parseInputDate(str) {
    if (!str) return null;
    const d = new Date(str);
    return Number.isNaN(d.getTime()) ? null : d;
}

function parsePollDate(str) {
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

function getLatestPollDate(pollRows) {
    const dates = pollRows.map(r => parsePollDate(r[3])).filter(Boolean);
    if (!dates.length) return null;
    return dates.reduce((max, d) => d > max ? d : max, dates[0]);
}

function getHorizonDaysFromRows(recentPolls, electionDateRaw) {
    const latestPollDate = getLatestPollDate(recentPolls);
    const electionDate = parseInputDate(electionDateRaw);
    if (!latestPollDate || !electionDate) return 0;
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((electionDate - latestPollDate) / msPerDay);
}

function getMomentumHorizonScale(days) {
    const d = Math.max(0, days);
    // Keep short horizons conservative while allowing moderate projection extension.
    return Math.min(1.6, 0.6 + d / 365);
}

function getReversionHorizonScale(days) {
    const d = Math.max(0, days);
    // Mean reversion grows with horizon and saturates around one year.
    return Math.min(1, d / 365);
}

function getAutoMomentumPercent(days) {
    const d = Math.max(0, days);
    // Short horizons lean on trend more; long horizons taper momentum.
    const pct = 70 - Math.min(40, Math.round(d / 14));
    return Math.max(30, Math.min(70, pct));
}

function getAutoReversionPercent(days) {
    const d = Math.max(0, days);
    // Longer horizons rely more on mean reversion.
    const pct = 10 + Math.min(50, Math.round(d / 7));
    return Math.max(10, Math.min(60, pct));
}

function filterPollsByDateWindow(pollRows, windowValue) {
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

    // Keep UX resilient: if no rows match a very narrow window, fall back to most recent poll.
    return filtered.length ? filtered : [allWithDates[allWithDates.length - 1].row];
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
