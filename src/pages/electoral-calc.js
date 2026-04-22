// src/pages/electoral-calc.js
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
    'DPK': '#424242'
};

let predictionChartInstance = null;

export function renderElectoralCalc() {
    const pageHtml = `
        <style>
            .scrollable-container {
                overflow-x: auto;
                margin-top: 1.5rem;
                border: 1px solid rgba(34, 36, 38, .15);
                border-radius: 0.28rem;
            }
            .ui.table.scrolling-table {
                width: 100%;
                white-space: nowrap;
                border: none;
            }
            .party-header {
                background: #f9fafb;
                font-weight: bold;
                padding: 12px 8px;
            }
            .left-aligned-header {
                text-align: left;
                margin-bottom: 1rem;
            }
            .chart-wrapper {
                position: relative;
                height: 400px;
                width: 100%;
                margin-bottom: 2rem;
                border: 1px solid rgba(34, 36, 38, .15);
                border-radius: 0.28rem;
                background: white;
                touch-action: none;
                user-select: none;
                cursor: grab;
            }
            .chart-wrapper:active { cursor: grabbing; }

            /* Prediction Cards */
            .prediction-card {
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 14px 18px;
                min-width: 140px;
                flex: 1;
                max-width: 200px;
                box-shadow: 0 1px 4px rgba(0,0,0,0.06);
            }
            .prediction-card .party-name {
                font-weight: bold;
                font-size: 1rem;
            }
            .prediction-card .party-pct {
                font-size: 1.6rem;
                font-weight: 700;
                margin: 6px 0;
            }
            .prediction-card .party-meta {
                font-size: 0.78rem;
                color: #888;
                margin-top: 2px;
            }
            .diff-up   { color: #27ae60; }
            .diff-down { color: #e74c3c; }
        </style>

        <div class="ui container" style="margin-top: 2rem; margin-bottom: 5rem;">
            <h2 class="ui header left-aligned-header">
                <div class="content">
                    Εκλογικό Μοντέλο 2027
                    <div class="sub header">Βάσει δεδομένων από το polls.csv</div>
                </div>
            </h2>

            <!-- ===== POLLS CHART ===== -->
            <div class="chart-wrapper">
                <canvas id="pollsChart"></canvas>
            </div>

            <!-- ===== LOADING / TABLE ===== -->
            <div id="polls-loading" class="ui active inverted dimmer">
                <div class="ui text loader">Επεξεργασία...</div>
            </div>

            <div id="polls-table-wrapper" class="scrollable-container" style="display:none;">
                <table class="ui celled unstackable striped table scrolling-table" id="polls-table">
                    <thead id="polls-thead"></thead>
                    <tbody id="polls-tbody"></tbody>
                </table>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem;">
                <div style="font-size: 0.9rem;">
                    Πηγή: <a href="https://en.wikipedia.org/wiki/Opinion_polling_for_the_next_Greek_parliamentary_election" target="_blank">Wikipedia</a>
                </div>
                <a id="download-btn" style="cursor: pointer;">Λήψη CSV</a>
            </div>

            <!-- ===== PREDICTION SECTION ===== -->
            <div id="prediction-section" style="display:none; margin-top: 3rem;">
                <div class="ui divider"></div>

                <h3 class="ui header" style="margin-bottom: 0.5rem;">
                    Πρόβλεψη Εκλογών 2027
                    <div class="sub header">Σταθμισμένος μέσος + μοντέλο αποχής + ND bias correction</div>
                </h3>

                <!-- Controls -->
                <div style="display: flex; gap: 2rem; flex-wrap: wrap; align-items: flex-end; margin: 1.25rem 0;">
                    <div>
                        <label style="display:block; font-weight:600; margin-bottom:4px;">
                            Αποχή: <strong id="abstention-value">35</strong>%
                        </label>
                        <input type="range" id="abstention-slider" min="20" max="65" value="35" step="1"
                               style="width: 200px; cursor: pointer;">
                    </div>

                    <div>
                        <label style="display:block; font-weight:600; margin-bottom:4px;">Βάση δημοσκοπήσεων</label>
                        <select id="polls-count-select" style="padding: 6px 10px; border-radius: 4px; border: 1px solid #ccc;">
                            <option value="5">Τελευταίες 5</option>
                            <option value="10" selected>Τελευταίες 10</option>
                            <option value="20">Τελευταίες 20</option>
                            <option value="all">Όλες</option>
                        </select>
                    </div>

                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="nd-correction-toggle" checked style="cursor:pointer; width:16px; height:16px;">
                        <label for="nd-correction-toggle" style="cursor:pointer; font-weight:600;">
                            ND Bias Correction
                            <span id="nd-bias-label" style="color: #1d4e89; font-weight: bold;"></span>
                        </label>
                    </div>
                </div>

                <!-- Prediction Cards -->
                <div id="prediction-cards" style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 1.5rem;"></div>

                <!-- Prediction Bar Chart -->
                <div style="position: relative; height: 320px; width: 100%;
                            border: 1px solid rgba(34,36,38,.15); border-radius: 0.28rem; background: white;">
                    <canvas id="predictionChart"></canvas>
                </div>

                <!-- Methodology note -->
                <div style="margin-top: 1rem; padding: 1rem; background: #f9fafb;
                            border: 1px solid #e0e0e0; border-radius: 4px; font-size: 0.82rem; color: #555; line-height: 1.6;">
                    <strong>Μεθοδολογία:</strong>
                    Σταθμισμένος μέσος (πιο πρόσφατες δημοσκοπήσεις = 2× βάρος).
                    Ποινή αποχής ανά κόμμα: <em>abstention × (0.5 + 0.5 × volatility_index)</em>,
                    όπου <em>volatility = (max−min) / mean</em> κανονικοποιημένο 0–1.
                    Η ND Bias Correction υπολογίζεται αυτόματα από τη μέση διαφορά
                    <em>αποτέλεσμα_εκλογών − μέσος_δημοσκοπήσεων</em> για κάθε εκλογή στο CSV.
                    Τελική κανονικοποίηση στο 100%. Κατώφλι εισόδου: 3%. Έδρες: approximation 300.
                </div>
            </div>

        </div>`;

    updateContent(pageHtml);
    loadPolls();

    document.getElementById('download-btn').addEventListener('click', () => {
        window.location.href = '/polls.csv';
    });
}


// ─────────────────────────────────────────────
// POLLS LOADING & TABLE
// ─────────────────────────────────────────────

function loadPolls() {
    fetch('/polls.csv')
        .then(res => res.text())
        .then(text => {
            const { headers, rows } = parseCSV(text);

            // THEAD
            const theadHtml = `<tr>${headers.map(h => {
                const color = partyColors[h];
                const borderStyle = color ? `border-bottom: 5px solid ${color} !important;` : '';
                return `<th class="party-header" style="${borderStyle}">${h}</th>`;
            }).join('')}</tr>`;
            document.getElementById('polls-thead').innerHTML = theadHtml;

            // TBODY
            const tbodyHtml = rows.map(row => {
                const isElection = row[0].toLowerCase().includes('election');
                const rowStyle = isElection ? 'background: #f0f7ff; font-weight: bold;' : '';
                return `<tr style="${rowStyle}">${row.map((cell, index) => {
                    const isPartyCol = !!partyColors[headers[index]];
                    const align = isPartyCol ? 'text-align: center; font-weight: 500;' : 'text-align: left;';
                    return `<td style="${align}">${cell}</td>`;
                }).join('')}</tr>`;
            }).join('');
            document.getElementById('polls-tbody').innerHTML = tbodyHtml;

            // Charts
            createPollsChart(headers, rows);
            initPredictions(headers, rows);

            document.getElementById('polls-loading').style.display = 'none';
            document.getElementById('polls-table-wrapper').style.display = 'block';
            document.getElementById('prediction-section').style.display = 'block';
        })
        .catch(err => {
            console.error(err);
            document.getElementById('polls-loading').innerHTML =
                '<div class="ui error message">Σφάλμα φόρτωσης αρχείου</div>';
        });
}


// ─────────────────────────────────────────────
// POLLS LINE CHART (αρχικό)
// ─────────────────────────────────────────────

function createPollsChart(headers, rows) {
    const ctx = document.getElementById('pollsChart').getContext('2d');

    const zoomPlugin = window['chartjs-plugin-zoom'];
    if (zoomPlugin) Chart.register(zoomPlugin);

    const partyIndices = headers.reduce((acc, h, i) => {
        if (partyColors[h]) acc.push({ name: h, index: i });
        return acc;
    }, []);

    const reversedRows = [...rows].reverse();
    const dates = reversedRows.map(r => r[3]);

    const datasets = partyIndices.map(p => ({
        label: p.name,
        data: reversedRows.map(r => parseFloat(r[p.index]) || null),
        borderColor: partyColors[p.name],
        backgroundColor: partyColors[p.name],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4,
        spanGaps: true
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
                    pan: { enabled: true, mode: 'x', modifierKey: null },
                    zoom: {
                        wheel: { enabled: true, modifierKey: 'shift' },
                        pinch: { enabled: true },
                        mode: 'x'
                    }
                }
            },
            scales: {
                x: { ticks: { autoSkip: true, maxTicksLimit: 10 } },
                y: { beginAtZero: false }
            }
        }
    });
}


// ─────────────────────────────────────────────
// PREDICTION ENGINE
// ─────────────────────────────────────────────

function initPredictions(headers, rows) {
    const partyIndices = headers.reduce((acc, h, i) => {
        if (partyColors[h]) acc[h] = i;
        return acc;
    }, {});

    const electionRows = rows.filter(r => r[0].toLowerCase().includes('election'));
    const pollRows = rows.filter(r => !r[0].toLowerCase().includes('election'));

    // ND Bias: μέση διαφορά (εκλογικό αποτέλεσμα − μέσος δημοσκοπήσεων πριν)
    const ndBias = computeNDBias(electionRows, pollRows, partyIndices, 'ND');
    const ndBiasLabel = document.getElementById('nd-bias-label');
    if (ndBiasLabel) {
        ndBiasLabel.textContent = `(${ndBias >= 0 ? '+' : ''}${ndBias.toFixed(2)}%)`;
    }

    // Volatility index ανά κόμμα (από ΟΛΑ τα polls)
    const volatility = computeVolatility(pollRows, partyIndices);

    // Αρχικό render
    renderPrediction(pollRows, partyIndices, volatility, ndBias);

    // Event listeners για controls
    document.getElementById('abstention-slider').addEventListener('input', function () {
        document.getElementById('abstention-value').textContent = this.value;
        renderPrediction(pollRows, partyIndices, volatility, ndBias);
    });
    document.getElementById('polls-count-select').addEventListener('change', () => {
        renderPrediction(pollRows, partyIndices, volatility, ndBias);
    });
    document.getElementById('nd-correction-toggle').addEventListener('change', () => {
        renderPrediction(pollRows, partyIndices, volatility, ndBias);
    });
}


/**
 * ND Bias: για κάθε εκλογή στο CSV, βρίσκει τις 10 προηγούμενες δημοσκοπήσεις
 * και υπολογίζει τη μέση διαφορά (αποτέλεσμα − μέσος δημοσκοπήσεων).
 */
function computeNDBias(electionRows, pollRows, partyIndices, party) {
    const idx = partyIndices[party];
    if (idx === undefined || electionRows.length === 0) return 0;

    const biases = [];

    for (const elRow of electionRows) {
        const result = parseFloat(elRow[idx]);
        if (isNaN(result)) continue;

        const elDate = elRow[3]; // Midpoint
        const priorPolls = pollRows
            .filter(r => r[3] <= elDate)
            .slice(-10);

        if (priorPolls.length === 0) continue;

        const avg = priorPolls.reduce((sum, r) => {
            const v = parseFloat(r[idx]);
            return sum + (isNaN(v) ? 0 : v);
        }, 0) / priorPolls.length;

        biases.push(result - avg);
    }

    return biases.length > 0
        ? biases.reduce((a, b) => a + b, 0) / biases.length
        : 0;
}


/**
 * Volatility Index = (max − min) / mean, κανονικοποιημένο 0–1
 * Υψηλή τιμή = οι ψηφοφόροι του κόμματος είναι αναποφάσιστοι → μεγαλύτερη αποχή
 */
function computeVolatility(pollRows, partyIndices) {
    const raw = {};

    for (const [party, idx] of Object.entries(partyIndices)) {
        const vals = pollRows
            .map(r => parseFloat(r[idx]))
            .filter(v => !isNaN(v) && v > 0);

        if (vals.length < 2) { raw[party] = 0; continue; }

        const min = Math.min(...vals);
        const max = Math.max(...vals);
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        raw[party] = mean > 0 ? (max - min) / mean : 0;
    }

    // Κανονικοποίηση 0–1 σχετικά με το πιο volatile κόμμα
    const maxVol = Math.max(...Object.values(raw));
    const result = {};
    for (const p of Object.keys(raw)) {
        result[p] = maxVol > 0 ? raw[p] / maxVol : 0;
    }
    return result;
}


/**
 * Κύριος υπολογισμός + render (καλείται κάθε φορά που αλλάζει control)
 */
function renderPrediction(pollRows, partyIndices, volatility, ndBias) {
    const abstentionRate = parseFloat(document.getElementById('abstention-slider').value) / 100;
    const pollsCountVal = document.getElementById('polls-count-select').value;
    const useNDCorrection = document.getElementById('nd-correction-toggle').checked;

    // Επιλογή τελευταίων N δημοσκοπήσεων
    const N = pollsCountVal === 'all' ? pollRows.length : parseInt(pollsCountVal);
    const recentPolls = pollRows.slice(-N);
    const total = recentPolls.length;

    // ── ΒΗΜΑ 1: Σταθμισμένος μέσος (νεότερες = 2× βάρος) ──
    const weightedSum = {};
    let totalWeight = 0;

    recentPolls.forEach((row, i) => {
        const w = 1 + (i / Math.max(total - 1, 1)); // 1.0 → 2.0
        totalWeight += w;
        for (const [party, idx] of Object.entries(partyIndices)) {
            const v = parseFloat(row[idx]);
            if (!isNaN(v) && v > 0) {
                weightedSum[party] = (weightedSum[party] || 0) + v * w;
            }
        }
    });

    const base = {};
    for (const p of Object.keys(weightedSum)) {
        base[p] = weightedSum[p] / totalWeight;
    }

    // ── ΒΗΜΑ 2: Ποινή Αποχής ──
    // penalty_i = abstention × (0.5 + 0.5 × volatility_i) × base_i
    // Λογική: όλα τα κόμματα έχουν κάποια αποχή (×0.5),
    // αλλά τα volatile έχουν έως 2× περισσότερη.
    const afterAbstention = {};
    for (const [party, b] of Object.entries(base)) {
        const vol = volatility[party] || 0;
        const penalty = abstentionRate * (0.5 + 0.5 * vol) * b;
        afterAbstention[party] = Math.max(0, b - penalty);
    }

    // ── ΒΗΜΑ 3: ND Bias Correction ──
    if (useNDCorrection && afterAbstention['ND'] !== undefined) {
        afterAbstention['ND'] = Math.max(0, afterAbstention['ND'] + ndBias);
    }

    // ── ΒΗΜΑ 4: Κανονικοποίηση στο 100% ──
    const sumAfter = Object.values(afterAbstention).reduce((a, b) => a + b, 0);
    const predicted = {};
    for (const p of Object.keys(afterAbstention)) {
        predicted[p] = sumAfter > 0 ? (afterAbstention[p] / sumAfter) * 100 : 0;
    }

    // ── ΒΗΜΑ 5: Εκτίμηση εδρών (approximation, 300 έδρες, κατώφλι 3%) ──
    const TOTAL_SEATS = 300;
    const THRESHOLD = 3.0;
    const above = Object.entries(predicted).filter(([, v]) => v >= THRESHOLD);
    const sumAbove = above.reduce((s, [, v]) => s + v, 0);
    const seats = {};
    for (const [party, share] of above) {
        seats[party] = Math.round((share / sumAbove) * TOTAL_SEATS);
    }

    // Render
    renderPredictionCards(predicted, base, volatility, seats);
    renderPredictionChart(predicted, base);
}


function renderPredictionCards(predicted, base, volatility, seats) {
    const container = document.getElementById('prediction-cards');

    const sorted = Object.entries(predicted)
        .sort(([, a], [, b]) => b - a)
        .filter(([, v]) => v >= 1.0);

    container.innerHTML = sorted.map(([party, pct]) => {
        const basePct = base[party] || 0;
        const diff = pct - basePct;
        const vol = ((volatility[party] || 0) * 100).toFixed(0);
        const seat = seats[party] || 0;
        const color = partyColors[party] || '#888';

        const diffHtml = diff >= 0
            ? `<span class="diff-up">▲ +${Math.abs(diff).toFixed(1)}%</span>`
            : `<span class="diff-down">▼ −${Math.abs(diff).toFixed(1)}%</span>`;

        return `
        <div class="prediction-card" style="border-top: 5px solid ${color};">
            <div class="party-name" style="color:${color};">${party}</div>
            <div class="party-pct">${pct.toFixed(1)}%</div>
            <div class="party-meta">Polls avg: ${basePct.toFixed(1)}% ${diffHtml}</div>
            <div class="party-meta">
                Αστάθεια: ${vol}%
                ${seat > 0 ? `&nbsp;·&nbsp; ~${seat} έδρες` : ''}
            </div>
        </div>`;
    }).join('');
}


function renderPredictionChart(predicted, base) {
    const sorted = Object.entries(predicted)
        .sort(([, a], [, b]) => b - a)
        .filter(([, v]) => v >= 1.0);

    const labels = sorted.map(([p]) => p);
    const predData = sorted.map(([, v]) => parseFloat(v.toFixed(2)));
    const baseData = sorted.map(([p]) => parseFloat((base[p] || 0).toFixed(2)));
    const colors = labels.map(p => partyColors[p] || '#888');

    const ctx = document.getElementById('predictionChart').getContext('2d');
    if (predictionChartInstance) predictionChartInstance.destroy();

    predictionChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Πρόβλεψη 2027',
                    data: predData,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 2,
                    borderRadius: 4,
                },
                {
                    label: 'Μέσος δημοσκοπήσεων',
                    data: baseData,
                    backgroundColor: colors.map(c => c + '33'),
                    borderColor: colors,
                    borderWidth: 2,
                    borderRadius: 4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: v => v + '%' }
                }
            }
        }
    });
}


// ─────────────────────────────────────────────
// CSV PARSER
// ─────────────────────────────────────────────

function parseCSV(text) {
    const lines = text.trim().split('\n').map(l => l.replace(/\r$/, ''));
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => {
        const cols = [];
        let current = '', inQuotes = false;
        for (const char of line) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
                cols.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else current += char;
        }
        cols.push(current.trim().replace(/^"|"$/g, ''));
        return cols;
    });
    return { headers, rows };
}