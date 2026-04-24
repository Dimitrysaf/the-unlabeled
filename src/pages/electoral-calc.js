import { updateContent } from '../components/Layout.js';

const partyColors = {
    'ND':    '#1d4e89',
    'SYRIZA':'#ff4b4b',
    'PASOK': '#00a14b',
    'KKE':   '#ed1c24',
    'SP':    '#c1a01b',
    'EL':    '#0d3b66',
    'NIKI':  '#5e4b3c',
    'PE':    '#8a2be2',
    'M25':   '#e20074',
    'FL':    '#0097a7',
    'NA':    '#ff1744',
    'DPK':   '#424242',
};

let predictionChartInstance = null;
let _pollRows = [], _partyIndices = {}, _volatility = {}, _ndBias = 0;

export function renderElectoralCalc() {
    updateContent(`
        <div style="margin-top: 1.5rem; margin-bottom: 5rem;">

            <h2 class="ec-title">Εκλογικό Μοντέλο 2027</h2>
            <p class="ec-subtitle">Βάσει δεδομένων από το polls.csv</p>

            <div class="chart-wrapper">
                <canvas id="pollsChart"></canvas>
            </div>

            <div id="polls-loading" class="ec-loader">
                <div class="ec-spinner"></div>
                Επεξεργασία…
            </div>

            <div id="polls-table-wrapper" class="table-scroll" style="display:none;">
                <table class="polls-table" id="polls-table">
                    <thead id="polls-thead"></thead>
                    <tbody id="polls-tbody"></tbody>
                </table>
            </div>

            <div class="table-footer">
                <span>Πηγή: <a href="https://en.wikipedia.org/wiki/Opinion_polling_for_the_next_Greek_parliamentary_election" target="_blank">Wikipedia</a></span>
                <button class="btn btn--sm" id="download-btn">
                    <i class="fa-solid fa-download"></i> Λήψη CSV
                </button>
            </div>

            <div id="prediction-section" style="display:none;">

                <div class="section-head">
                    <div class="section-head-line"></div>
                    <span class="section-head-text">Πρόβλεψη Εκλογών 2027</span>
                    <div class="section-head-line section-head-line--r"></div>
                </div>
                <p class="section-sub">Σταθμισμένος μέσος + μοντέλο αποχής + ND bias correction</p>

                <div class="ec-form">
                    <div class="ec-fields">

                        <div class="ec-field">
                            <label class="ec-label" for="abstention-slider">
                                Αποχή: <strong id="abstention-value">35</strong>%
                            </label>
                            <input
                                class="custom-range"
                                type="range"
                                id="abstention-slider"
                                min="20" max="65" value="35" step="1"
                            >
                        </div>

                        <div class="ec-field">
                            <label class="ec-label" for="polls-count-select">Βάση δημοσκοπήσεων</label>
                            <select class="custom-select" id="polls-count-select">
                                <option value="5">Τελευταίες 5</option>
                                <option value="10" selected>Τελευταίες 10</option>
                                <option value="20">Τελευταίες 20</option>
                                <option value="all">Όλες</option>
                            </select>
                        </div>

                        <div class="ec-field">
                            <label class="custom-checkbox">
                                <input type="checkbox" id="nd-correction-checkbox" checked>
                                <span class="custom-checkbox-label">
                                    ND Bias Correction
                                    <strong id="nd-bias-label" style="color:#1d4e89; margin-left:4px;"></strong>
                                </span>
                            </label>
                        </div>

                    </div>
                </div>

                <div class="prediction-cards" id="prediction-cards"></div>

                <div id="parliament-container" class="parliament-panel" style="display:none;"></div>

                <div class="chart-wrapper chart-wrapper--sm">
                    <canvas id="predictionChart"></canvas>
                </div>

                <div class="info-box">
                    <div class="info-box-title">Μεθοδολογία &amp; Εκλογικός Νόμος</div>
                    <p>
                        <strong>Μοντέλο:</strong> Σταθμισμένος μέσος (2x βάρος στις πιο πρόσφατες).
                        Ποινή αποχής: <em>abstention × (0.5 + 0.5 × volatility_index)</em>. Η ND Bias Correction υπολογίζεται ιστορικά.
                    </p>
                    <p style="margin-top:0.6em;">
                        <strong>Κατανομή Εδρών (Ν. 4654/2020):</strong> Κατώφλι 3%. Κλιμακωτό μπόνους πρώτου κόμματος
                        (20 έδρες με 25%, +1 ανά 0.5%, έως 50). Υπόλοιπες με Largest Remainder.
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

            document.getElementById('polls-thead').innerHTML =
                `<tr>${headers.map(h => {
                    const color = partyColors[h];
                    const style = color ? `border-bottom: 4px solid ${color};` : '';
                    return `<th style="${style}">${h}</th>`;
                }).join('')}</tr>`;

            document.getElementById('polls-tbody').innerHTML =
                rows.map(row => {
                    const isElection = row[0].toLowerCase().includes('election');
                    return `<tr class="${isElection ? 'is-election' : ''}">${
                        row.map((cell, i) => {
                            const isParty = !!partyColors[headers[i]];
                            const style = isParty ? 'text-align:center; font-weight:500;' : 'text-align:left;';
                            return `<td style="${style}">${cell}</td>`;
                        }).join('')
                    }</tr>`;
                }).join('');

            createPollsChart(headers, rows);
            initPredictions(headers, rows);

            document.getElementById('polls-loading').style.display        = 'none';
            document.getElementById('polls-table-wrapper').style.display  = 'block';
            document.getElementById('prediction-section').style.display   = 'block';
        })
        .catch(err => {
            console.error(err);
            document.getElementById('polls-loading').innerHTML =
                '<div class="info-box info-box--error">Σφάλμα φόρτωσης αρχείου.</div>';
        });
}


// ─────────────────────────────────────────────
// CHARTS
// ─────────────────────────────────────────────

function createPollsChart(headers, rows) {
    const ctx = document.getElementById('pollsChart').getContext('2d');
    const zoomPlugin = window['chartjs-plugin-zoom'];
    if (zoomPlugin) Chart.register(zoomPlugin);

    const partyIdx = headers.reduce((acc, h, i) => {
        if (partyColors[h]) acc.push({ name: h, index: i });
        return acc;
    }, []);

    const reversed = [...rows].reverse();
    const dates    = reversed.map(r => r[3]);

    const datasets = partyIdx.map(p => ({
        label: p.name,
        data: reversed.map(r => parseFloat(r[p.index]) || null),
        borderColor: partyColors[p.name],
        backgroundColor: partyColors[p.name],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4,
        spanGaps: true,
    }));

    new Chart(ctx, {
        type: 'line',
        data: { labels: dates, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                zoom: {
                    pan:  { enabled: true, mode: 'x' },
                    zoom: { wheel: { enabled: true, modifierKey: 'shift' }, pinch: { enabled: true }, mode: 'x' },
                },
            },
            scales: {
                x: { ticks: { autoSkip: true, maxTicksLimit: 10 } },
                y: { beginAtZero: false },
            },
        },
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
    _pollRows   = rows.filter(r => !r[0].toLowerCase().includes('election'));
    _volatility = computeVolatility(_pollRows, _partyIndices);
    _ndBias     = computeNDBias(electionRows, _pollRows, _partyIndices, 'ND');

    const sign = _ndBias >= 0 ? '+' : '';
    document.getElementById('nd-bias-label').textContent = `(${sign}${_ndBias.toFixed(2)}%)`;

    const slider       = document.getElementById('abstention-slider');
    const sliderValue  = document.getElementById('abstention-value');
    const select       = document.getElementById('polls-count-select');
    const checkbox     = document.getElementById('nd-correction-checkbox');

    slider.addEventListener('input', () => {
        sliderValue.textContent = slider.value;
        renderPrediction();
    });

    select.addEventListener('change', renderPrediction);
    checkbox.addEventListener('change', renderPrediction);

    renderPrediction();
}

function renderPrediction() {
    const abstentionRate  = parseInt(document.getElementById('abstention-slider').value || '35') / 100;
    const pollsCountVal   = document.getElementById('polls-count-select').value || '10';
    const useNDCorrection = document.getElementById('nd-correction-checkbox').checked;

    const N           = pollsCountVal === 'all' ? _pollRows.length : parseInt(pollsCountVal);
    const recentPolls = _pollRows.slice(-N);
    const total       = recentPolls.length;

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
        const vol     = _volatility[party] || 0;
        const penalty = abstentionRate * (0.5 + 0.5 * vol) * b;
        afterAbstention[party] = Math.max(0, b - penalty);
    }

    if (useNDCorrection && afterAbstention['ND'] !== undefined) {
        afterAbstention['ND'] = Math.max(0, afterAbstention['ND'] + _ndBias);
    }

    const sumAfter  = Object.values(afterAbstention).reduce((a, b) => a + b, 0);
    const predicted = {};
    for (const p of Object.keys(afterAbstention)) {
        predicted[p] = sumAfter > 0 ? (afterAbstention[p] / sumAfter) * 100 : 0;
    }

    const seats = allocateGreekSeats(predicted);
    renderPredictionCards(predicted, base, seats);
    renderPredictionChart(predicted, base);
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
    const winnerPct   = eligible[0][1];

    let bonus = 0;
    if (winnerPct >= 25.0) {
        bonus = Math.min(20 + Math.floor((winnerPct - 25.0) / 0.5), 50);
    }

    const remaining  = TOTAL - bonus;
    const totalPct   = eligible.reduce((s, [, v]) => s + v, 0);
    const quotas     = {};
    const seats      = {};

    eligible.forEach(([party, pct]) => {
        const exact = (pct / totalPct) * remaining;
        quotas[party] = exact;
        seats[party]  = Math.floor(exact);
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

    const sorted     = Object.entries(seats).sort((a, b) => b[1] - a[1]);
    const hasMajority = sorted.some(([, c]) => c >= 151);
    const glowClass  = hasMajority ? 'majority-glow' : '';

    const seatList = [];
    sorted.forEach(([party, count]) => {
        for (let i = 0; i < count; i++) seatList.push(party);
    });

    const arcs = [
        { r: 130, count: 34 }, { r: 155, count: 40 },
        { r: 180, count: 47 }, { r: 205, count: 53 },
        { r: 230, count: 60 }, { r: 255, count: 66 },
    ];

    const cx = 270, cy = 265;
    let svg = `<svg viewBox="0 0 540 280" class="parliament-svg" style="width:100%; max-width:600px; height:auto; overflow:visible;">`;
    let idx = 0;

    for (const arc of arcs) {
        for (let i = 0; i < arc.count; i++) {
            if (idx >= 300) break;
            const angle = Math.PI - (i * (Math.PI / (arc.count - 1)));
            const x = cx + arc.r * Math.cos(angle);
            const y = cy - arc.r * Math.sin(angle);
            const color = partyColors[seatList[idx]] || '#ccc';
            svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="${color}" title="${seatList[idx]}: Seat ${idx + 1}"/>`;
            idx++;
        }
    }
    svg += `</svg>`;

    const legend = sorted.map(([p, s]) => `
        <span class="parliament-legend-item">
            <span class="parliament-dot" style="background:${partyColors[p] || '#ccc'};"></span>
            <strong style="color:${partyColors[p] || '#333'}">${p}:</strong> ${s}
        </span>`).join('');

    container.innerHTML = `
        <div class="parliament-title">Σύνθεση Βουλής</div>
        ${hasMajority ? '<div class="parliament-majority"><i class="fa-solid fa-star"></i> Αυτοδυναμία</div>' : ''}
        <div class="parliament-wrapper ${glowClass}">${svg}</div>
        <div class="parliament-legend">${legend}</div>
    `;
}

function renderPredictionCards(predicted, base, seats) {
    const sorted = Object.entries(predicted)
        .sort(([, a], [, b]) => b - a)
        .filter(([, v]) => v >= 1.0);

    document.getElementById('prediction-cards').innerHTML = sorted.map(([party, pct]) => {
        const basePct  = base[party] || 0;
        const diff     = pct - basePct;
        const vol      = ((_volatility[party] || 0) * 100).toFixed(0);
        const seat     = seats[party] || 0;
        const color    = partyColors[party] || '#888';
        const diffSign = diff >= 0 ? '+' : '−';
        const diffIcon = diff >= 0 ? '▲' : '▼';
        const diffClass = diff >= 0 ? 'text-up' : 'text-down';

        return `
        <div class="prediction-card">
            <div class="prediction-card__bar" style="background:${color};"></div>
            <div class="prediction-card__body">
                <div class="prediction-card__pct" style="color:${color};">${pct.toFixed(1)}%</div>
                <div class="prediction-card__party">${party}</div>
                <div class="prediction-card__divider"></div>
                <div class="prediction-card__details">
                    <div>Polls: <strong>${basePct.toFixed(1)}%</strong>
                        <span class="${diffClass}">${diffIcon} ${diffSign}${Math.abs(diff).toFixed(1)}%</span>
                    </div>
                    <div>Αστάθεια: <strong>${vol}%</strong></div>
                    ${seat > 0 ? `<div>Έδρες: <strong style="color:${color}">${seat}</strong></div>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
}

function renderPredictionChart(predicted, base) {
    const sorted   = Object.entries(predicted).sort(([, a], [, b]) => b - a).filter(([, v]) => v >= 1.0);
    const labels   = sorted.map(([p]) => p);
    const predData = sorted.map(([, v]) => parseFloat(v.toFixed(2)));
    const baseData = sorted.map(([p]) => parseFloat((base[p] || 0).toFixed(2)));
    const colors   = labels.map(p => partyColors[p] || '#888');

    const ctx = document.getElementById('predictionChart').getContext('2d');
    if (predictionChartInstance) predictionChartInstance.destroy();

    predictionChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Πρόβλεψη 2027',        data: predData, backgroundColor: colors, borderColor: colors, borderWidth: 2, borderRadius: 3 },
                { label: 'Μέσος δημοσκοπήσεων',   data: baseData, backgroundColor: colors.map(c => c + '33'), borderColor: colors, borderWidth: 2, borderRadius: 3 },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%` } },
            },
            scales: {
                y: { beginAtZero: true, ticks: { callback: v => v + '%' } },
            },
        },
    });
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
        const min  = Math.min(...vals), max = Math.max(...vals);
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        raw[party] = mean > 0 ? (max - min) / mean : 0;
    }
    const maxVol = Math.max(...Object.values(raw));
    const result = {};
    for (const p of Object.keys(raw)) result[p] = maxVol > 0 ? raw[p] / maxVol : 0;
    return result;
}

function parseCSV(text) {
    const lines   = text.trim().split('\n').map(l => l.replace(/\r$/, ''));
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows    = lines.slice(1).map(line => {
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