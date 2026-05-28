import { updateContent } from '../components/Layout.js';
import { logger } from '../lib/logger.js';
import './electoral-calc.css';
import './electoral-calc.mobile.css';
import './electoral-calc.print.css';

import { partyColors, forecastDefaults } from './electoral-calc/constants.js';
import {
    allocateGreekSeats, applyThresholdRisk,
    computeHouseEffects, computeMomentum, computeTrendAcceleration,
    computeLongRunAverage, computeNDBias, computeVolatility, computeConfidenceScores,
    parseSampleSize, parseInputDate, parsePollDate,
    getHorizonDaysFromRows, getMomentumHorizonScale, getReversionHorizonScale,
    getAutoMomentumPercent, getAutoReversionPercent,
    filterPollsByDateWindow, parseCSV,
    randomNormal, getLargestParty, summariseSimulation, getCombinations,
} from './electoral-calc/model.js';
import { createPollsChart, createLoessTrendChart } from './electoral-calc/chart.js';
import {
    renderParliament, renderCoalitions, renderPredictionCards,
    renderPredictionStats, renderUncertaintySummary, renderHouseEffectsTable,
    renderSeatRangeChart, renderWinProbabilityChart, renderCoalitionProbabilityChart,
} from './electoral-calc/render.js';

let _pollRows = [], _partyIndices = {}, _volatility = {}, _ndBias = 0;
let _houseEffects = {}, _longRunAvg = {};

export function getCalcHTML() {
    const skeletonLegend = [
        { c: '#1b5cc7' }, // ND
        { c: '#ee808f' }, // SYRIZA
        { c: '#007934' }, // PASOK
        { c: '#e30301' }, // KKE
        { c: '#E9B460' }, // SP
        { c: '#6BB6E6' }, // EL
        { c: '#910048' }, // NIKI
        { c: '#9F1897' }, // PE
    ].map(p => `<span class="ec-skeleton__legend-item" style="--c:${p.c}"></span>`).join('');

    const fakeLines = [
        { pts: '0,215 60,190 130,170 200,182 280,145 360,130 440,138 520,115 620,105 720,98 824,88', c: '#1b5cc7', o: 0.22 },
        { pts: '0,148 60,155 130,140 200,152 280,158 360,145 440,150 520,143 620,148 720,140 824,145', c: '#007934', o: 0.18 },
        { pts: '0,185 60,175 130,190 200,178 280,188 360,175 440,180 520,172 620,177 720,168 824,174', c: '#ee808f', o: 0.18 },
        { pts: '0,228 60,222 130,230 200,220 280,226 360,218 440,224 520,215 620,222 720,214 824,220', c: '#e30301', o: 0.14 },
        { pts: '0,240 60,235 130,242 200,234 280,238 360,230 440,236 520,228 620,234 720,226 824,232', c: '#6BB6E6', o: 0.12 },
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
                    <div id="loessChart"></div>
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
                <div class="chart-wrapper govuk-!-margin-bottom-4" id="pollsChart"></div>
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
                Multi-variable model: weighted polling average, house effects,
                momentum, mean reversion, threshold risk and historical bias correction.
                Polls are <strong>Εκτίμηση Ψήφου</strong> — abstention is already removed
                by pollsters. Only residual election-day dropout is applied here.
            </p>

            <div class="ec-controls-grid">

                <div class="ec-control-group">
                    <h3 class="govuk-heading-s ec-control-group__title">Poll base &amp; horizon</h3>

                    <div class="govuk-form-group">
                        <label class="govuk-label govuk-label--s" for="dropout-slider">
                            Election-day dropout: <strong id="dropout-value">5</strong>%
                        </label>
                        <input class="govuk-range" type="range" id="dropout-slider"
                            min="0" max="15" value="5" step="1">
                        <div class="govuk-hint">
                            Voters who say they will vote but do not show up on election day.
                            Polls are already Εκτίμηση Ψήφου — abstention is baked in.
                            Typical range: 2–8%.
                        </div>
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
                                <strong id="nd-bias-label" style="color:#1b5cc7;margin-left:4px;"></strong>
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

            <div id="seat-range-chart"></div>
            <div id="win-probability-chart"></div>
            <div id="parliament-container" style="display:none;"></div>
            <div id="coalition-container" style="display:none;"></div>
            <div id="coalition-probability-chart"></div>
            <div id="prediction-stats"></div>

            <details class="govuk-details govuk-!-margin-top-6">
                <summary class="govuk-details__summary">
                    <span class="govuk-details__summary-text">Methodology &amp; electoral law</span>
                </summary>
                <div class="govuk-details__text">
                    <h3 class="govuk-heading-s">Poll data</h3>
                    <p class="govuk-body-s">
                        The CSV uses <strong>Εκτίμηση Ψήφου</strong> figures — pollsters have already
                        excluded undecided and absent respondents. Party shares sum to approximately
                        100% among decided, likely voters. Applying a standard abstention rate on top
                        of these figures would double-count abstention. Only a small residual
                        <em>election-day dropout</em> adjustment (0–15%) is applied here.
                    </p>
                    <h3 class="govuk-heading-s">Model variables</h3>
                    <ul class="govuk-list govuk-list--bullet govuk-body-s">
                        <li><strong>Recency weighting:</strong> More recent polls receive up to 2× weight.</li>
                        <li><strong>Sample size weighting:</strong> Each poll weighted by √n of its sample size.</li>
                        <li><strong>House effects:</strong> Per-firm systematic deviation from the cross-firm mean, subtracted at poll level. Requires ≥3 polls per firm.</li>
                        <li><strong>ND historical bias:</strong> ND's average underestimation in the 10 most recent polls before each past election vs. the actual result.</li>
                        <li><strong>Election-day dropout:</strong> A small penalty (default 5%) for voters who indicate they will vote but ultimately do not show up. Applied as: dropout × (0.5 + 0.5 × volatility) per party.</li>
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

export function initCalc() {
    loadPolls();
    document.getElementById('download-btn').addEventListener('click', () => {
        window.location.href = '/polls.csv';
    });
}

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

function loadPolls() {
    fetch('/polls.csv')
        .then(r => r.text())
        .then(text => {
            const { headers, rows } = parseCSV(text);

            document.getElementById('polls-thead').innerHTML =
                `<tr class="govuk-table__row">${headers.map((h, i) => {
                    const color = partyColors[h];
                    const isParty = i >= 5 && i < headers.length - 1;
                    const style = isParty ? `border-bottom:4px solid ${color || '#b1b4b6'};color:${color || '#b1b4b6'};text-align:center;` : '';
                    return `<th scope="col" class="govuk-table__header col-important" style="${style}">${h}</th>`;
                }).join('')}</tr>`;

            document.getElementById('polls-tbody').innerHTML =
                rows.map(row => {
                    const isElection = row[0].toLowerCase().includes('election');
                    const rowStyle = isElection ? 'background:#fff3cd;font-weight:700;' : '';
                    return `<tr class="govuk-table__row" style="${rowStyle}">${row.map((cell, i) => {
                        const isParty = i >= 5 && i < headers.length - 1;
                        const align = isParty ? 'center' : 'left';
                        return `<td class="govuk-table__cell col-important" style="text-align:${align};">${cell}</td>`;
                    }).join('')}</tr>`;
                }).join('');

            createLoessTrendChart(headers, rows);
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
            logger.error('[electoral-calc] polling data load failed', err);
            document.getElementById('polls-loading').innerHTML =
                `<div class="govuk-error-summary"><div role="alert">
                    <h2 class="govuk-error-summary__title">There is a problem</h2>
                    <div class="govuk-error-summary__body">
                        <p class="govuk-body">Could not load polling data. Please try again later.</p>
                    </div>
                </div></div>`;
        });
}

function initPredictions(headers, rows) {
    // Dynamic party column detection: index 5 to length-2 (Lead is usually last)
    _partyIndices = headers.reduce((acc, h, i) => {
        if (i >= 5 && i < headers.length - 1) {
            acc[h] = i;
        }
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
        'dropout-slider', 'polls-count-select', 'nd-correction-checkbox',
        'sample-weight-checkbox', 'house-effects-checkbox', 'lead-compression-checkbox',
        'threshold-risk-checkbox', 'momentum-slider', 'reversion-slider', 'election-date-picker',
    ];
    controls.forEach(id => {
        const el = document.getElementById(id);
        const evt = el.type === 'range' ? 'input' : 'change';
        el.addEventListener(evt, () => {
            if (id === 'dropout-slider') document.getElementById('dropout-value').textContent = el.value;
            if (id === 'momentum-slider') document.getElementById('momentum-value').textContent = el.value;
            if (id === 'reversion-slider') document.getElementById('reversion-value').textContent = el.value;
            renderPrediction();
        });
    });

    document.getElementById('reset-defaults-btn')?.addEventListener('click', () => {
        applyForecastDefaults();
        renderPrediction();
    });

    renderPrediction();
}

function applyForecastDefaults() {
    const dropout = document.getElementById('dropout-slider');
    const pollBase = document.getElementById('polls-count-select');
    const electionDate = document.getElementById('election-date-picker');
    const sampleWeight = document.getElementById('sample-weight-checkbox');
    const ndCorrection = document.getElementById('nd-correction-checkbox');
    const houseEffects = document.getElementById('house-effects-checkbox');
    const leadCompress = document.getElementById('lead-compression-checkbox');
    const threshRisk = document.getElementById('threshold-risk-checkbox');
    const momentum = document.getElementById('momentum-slider');
    const reversion = document.getElementById('reversion-slider');

    if (!dropout || !pollBase || !electionDate || !sampleWeight || !ndCorrection ||
        !houseEffects || !leadCompress || !threshRisk || !momentum || !reversion) return;

    dropout.value = String(forecastDefaults.dropoutPct);
    pollBase.value = forecastDefaults.pollBase;
    electionDate.value = forecastDefaults.electionDate;
    sampleWeight.checked = forecastDefaults.useSampleWeight;
    ndCorrection.checked = forecastDefaults.useNDCorrection;
    houseEffects.checked = forecastDefaults.useHouseEffects;
    leadCompress.checked = forecastDefaults.useLeadCompression;
    threshRisk.checked = forecastDefaults.useThresholdRisk;
    momentum.value = String(forecastDefaults.momentumPct);
    reversion.value = String(forecastDefaults.reversionPct);

    document.getElementById('dropout-value').textContent = String(forecastDefaults.dropoutPct);
    document.getElementById('momentum-value').textContent = String(forecastDefaults.momentumPct);
    document.getElementById('reversion-value').textContent = String(forecastDefaults.reversionPct);
}

// Controls managed by renderPrediction internally (momentum/reversion) are excluded
// so setControlsDisabled(false) doesn't override their state after calculation.
const CALC_CONTROL_IDS = [
    'dropout-slider', 'polls-count-select', 'nd-correction-checkbox',
    'sample-weight-checkbox', 'house-effects-checkbox', 'lead-compression-checkbox',
    'threshold-risk-checkbox', 'election-date-picker', 'reset-defaults-btn',
];

function setControlsDisabled(disabled) {
    CALC_CONTROL_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = disabled;
    });
}

function renderPrediction() {
    setControlsDisabled(true);
    // Yield to the browser so it can paint the disabled state before the
    // synchronous 1000-iteration simulation blocks the main thread.
    setTimeout(() => {
        try {
            _doRenderPrediction();
        } finally {
            setControlsDisabled(false);
        }
    }, 0);
}

function _doRenderPrediction() {
    const dropoutRate = parseInt(document.getElementById('dropout-slider').value) / 100;
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
        horizonHint.textContent = hasElectionDate
            ? `Projection horizon: ${Math.max(0, horizonDays)} day${Math.abs(horizonDays) === 1 ? '' : 's'} from latest poll midpoint. Momentum ${autoMomentumPct}% and mean reversion ${autoReversionPct}% are auto-set.`
            : 'Projection horizon is measured from the latest poll midpoint date.';
    }

    const momentum = computeMomentum(recentPolls, _partyIndices, total);
    const acceleration = computeTrendAcceleration(recentPolls, _partyIndices, total);

    const options = {
        dropoutRate, useNDCorrection, useSampleWeight, useHouseEffects,
        useLeadCompress, useThresholdRisk,
        momentumFactor, reversionFactor,
        momentumHorizonScale, reversionHorizonScale, horizonDays,
    };

    const forecast = getForecastOutcome(recentPolls, options);
    const seats = forecast.seats;
    const predicted = forecast.predicted;
    const rawBase = forecast.rawBase;

    const simulation = runSimulation(recentPolls, options);
    const summary = summariseSimulation(simulation);

    const confidenceScores = computeConfidenceScores(predicted, _volatility, total, Math.max(0, horizonDays));

    renderPredictionCards(predicted, rawBase, seats, momentum, acceleration, confidenceScores, total, summary, _volatility);
    renderUncertaintySummary(summary);
    renderSeatRangeChart(summary);
    renderWinProbabilityChart(summary);
    renderParliament(seats);
    renderCoalitions(seats);
    // renderCoalitionProbabilityChart(summary);
    renderPredictionStats(predicted, rawBase);
} // end _doRenderPrediction

function getForecastOutcome(recentPolls, options) {
    const {
        dropoutRate, useNDCorrection, useSampleWeight, useHouseEffects,
        useLeadCompress, useThresholdRisk,
        momentumFactor, reversionFactor,
        momentumHorizonScale, reversionHorizonScale,
    } = options;

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

    const afterDropout = {};
    for (const [party, b] of Object.entries(base)) {
        const vol = _volatility[party] || 0;
        const penalty = dropoutRate * (0.5 + 0.5 * vol) * b;
        afterDropout[party] = Math.max(0, b - penalty);
    }

    const sumAfter = Object.values(afterDropout).reduce((a, b) => a + b, 0);
    let predicted = {};
    for (const p of Object.keys(afterDropout)) {
        predicted[p] = sumAfter > 0 ? (afterDropout[p] / sumAfter) * 100 : 0;
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
    const coalitionCounts = {};
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
        if (hasMajority) majorityCount++;

        parties.forEach(party => {
            partySeatResults[party].push(forecast.seats[party] || 0);
            partyVoteResults[party].push(forecast.predicted[party] || 0);
        });

        const seatedParties = Object.entries(forecast.seats).filter(([, s]) => s > 0);
        const minimalFound = [];
        for (let size = 2; size <= 3; size++) {
            for (const combo of getCombinations(seatedParties, size)) {
                const total = combo.reduce((s, [, c]) => s + c, 0);
                if (total >= 151) {
                    // Minimality: don't count A+B+C if A+B already has a majority
                    const isMinimal = !minimalFound.some(m =>
                        m.length < combo.length && m.every(mp => combo.some(cp => cp[0] === mp[0]))
                    );
                    if (isMinimal) {
                        const key = combo.map(([p]) => p).sort().join('+');
                        coalitionCounts[key] = (coalitionCounts[key] || 0) + 1;
                        minimalFound.push(combo);
                    }
                }
            }
        }
    }

    return { iterations, winnerCounts, majorityCount, partySeatResults, partyVoteResults, coalitionCounts };
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