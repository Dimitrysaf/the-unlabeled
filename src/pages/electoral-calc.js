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

let _pollRows = [];
let _partyIndices = {};
let _volatility = {};
let _ndBias = 0;

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
            #prediction-chart-wrapper {
                position: relative;
                height: 320px;
                width: 100%;
                margin-top: 1.5rem;
                border: 1px solid rgba(34,36,38,.15);
                border-radius: 0.28rem;
                background: white;
            }
            #prediction-cards.ui.cards {
                display: flex !important;
                flex-wrap: wrap !important;
                justify-content: center;
            }
            #prediction-cards.ui.cards > .card {
                width: 170px !important;
                flex-grow: 0 !important;
            }
            
            /* Parliament Styling */
            .parliament-container {
                margin-top: 3rem;
                padding: 2rem;
                background: #fdfdfd;
                border: 1px solid rgba(34,36,38,.15);
                border-radius: 12px;
            }
            .parliament-wrapper {
                text-align: center;
                padding: 2rem;
                border-radius: 1rem;
                transition: all 0.5s ease-in-out;
                background: transparent;
            }
            .parliament-svg circle {
                transition: transform 0.2s, fill 0.3s;
                transform-origin: center;
            }
            .parliament-svg circle:hover {
                transform: scale(1.6);
                cursor: pointer;
            }
            /* Gold Glow for Majority */
            .majority-glow {
                box-shadow: 0 0 40px 10px rgba(255, 215, 0, 0.5);
                border: 2px solid rgba(255, 215, 0, 0.8);
                background: rgba(255, 248, 200, 0.15);
            }
        </style>

        <div class="ui container" style="margin-top: 2rem; margin-bottom: 5rem;">

            <h2 class="ui header left-aligned-header">
                <div class="content">
                    Εκλογικό Μοντέλο 2027
                    <div class="sub header">Βάσει δεδομένων από το polls.csv</div>
                </div>
            </h2>

            <div class="chart-wrapper">
                <canvas id="pollsChart"></canvas>
            </div>

            <div id="polls-loading" class="ui active inverted dimmer">
                <div class="ui text loader">Επεξεργασία...</div>
            </div>

            <div id="polls-table-wrapper" class="scrollable-container" style="display:none;">
                <table class="ui celled unstackable striped table scrolling-table" id="polls-table">
                    <thead id="polls-thead"></thead>
                    <tbody id="polls-tbody"></tbody>
                </table>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.75rem;">
                <div style="font-size:0.9rem;">
                    Πηγή: <a href="https://en.wikipedia.org/wiki/Opinion_polling_for_the_next_Greek_parliamentary_election" target="_blank">Wikipedia</a>
                </div>
                <a id="download-btn" class="ui tiny basic button" style="cursor:pointer;">
                    <i class="download icon"></i> Λήψη CSV
                </a>
            </div>

            <div id="prediction-section" style="display:none; margin-top:3rem;">
                <div class="ui divider"></div>

                <h3 class="ui header">
                    Πρόβλεψη Εκλογών 2027
                    <div class="sub header">Σταθμισμένος μέσος + μοντέλο αποχής + ND bias correction</div>
                </h3>

                <div class="ui form" style="margin: 1.5rem 0;">
                    <div class="fields" style="align-items:flex-end; flex-wrap:wrap; gap:1.5rem 2rem;">

                        <div class="field" style="min-width:220px;">
                            <label>Αποχή: <strong id="abstention-value">35</strong>%</label>
                            <div class="ui ticked slider" id="abstention-slider"></div>
                        </div>

                        <div class="field">
                            <label>Βάση δημοσκοπήσεων</label>
                            <div class="ui selection dropdown" id="polls-count-dropdown">
                                <input type="hidden" name="polls-count" value="10">
                                <i class="dropdown icon"></i>
                                <div class="default text">Τελευταίες 10</div>
                                <div class="scrollhint menu">
                                    <div class="item" data-value="5">Τελευταίες 5</div>
                                    <div class="item" data-value="10">Τελευταίες 10</div>
                                    <div class="item" data-value="20">Τελευταίες 20</div>
                                    <div class="item" data-value="all">Όλες</div>
                                </div>
                            </div>
                        </div>

                        <div class="field" style="padding-bottom:6px;">
                            <div class="ui checkbox" id="nd-correction-checkbox">
                                <input type="checkbox" name="nd-correction" checked>
                                <label>
                                    ND Bias Correction
                                    <span id="nd-bias-label" style="color:#1d4e89; font-weight:bold; margin-left:4px;"></span>
                                </label>
                            </div>
                        </div>

                    </div>
                </div>

                <div class="ui stackable cards" id="prediction-cards"></div>

                <div id="parliament-container" class="parliament-container" style="display:none;"></div>

                <div id="prediction-chart-wrapper">
                    <canvas id="predictionChart"></canvas>
                </div>

                <div class="ui info message" style="margin-top:1rem; font-size:0.85rem;">
                    <div class="header">Μεθοδολογία & Εκλογικός Νόμος</div>
                    <p>
                        <strong>Μοντέλο:</strong> Σταθμισμένος μέσος (2x βάρος στις πιο πρόσφατες). 
                        Ποινή αποχής: <em>abstention × (0.5 + 0.5 × volatility_index)</em>. Η ND Bias Correction υπολογίζεται ιστορικά.
                        <br><br>
                        <strong>Κατανομή Εδρών (Ενισχυμένη Αναλογική):</strong> Εφαρμογή του ισχύοντος Ν. 4654/2020. Κατώφλι εισόδου στη Βουλή 3%. Το πρώτο κόμμα λαμβάνει κλιμακωτό μπόνους (20 έδρες με 25%, +1 έδρα για κάθε επιπλέον 0.5%, με μέγιστο όριο τις 50 έδρες). Οι υπόλοιπες έδρες κατανέμονται αναλογικά στα κόμματα άνω του 3% (Μέθοδος Largest Remainder).
                    </p>
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
// DATA LOADING
// ─────────────────────────────────────────────

function loadPolls() {
    fetch('/polls.csv')
        .then(res => res.text())
        .then(text => {
            const { headers, rows } = parseCSV(text);

            const theadHtml = `<tr>${headers.map(h => {
                const color = partyColors[h];
                const style = color ? `border-bottom: 5px solid ${color} !important;` : '';
                return `<th class="party-header" style="${style}">${h}</th>`;
            }).join('')}</tr>`;
            document.getElementById('polls-thead').innerHTML = theadHtml;

            const tbodyHtml = rows.map(row => {
                const isElection = row[0].toLowerCase().includes('election');
                const rowStyle = isElection ? 'background:#f0f7ff; font-weight:bold;' : '';
                return `<tr style="${rowStyle}">${row.map((cell, i) => {
                    const isParty = !!partyColors[headers[i]];
                    const align = isParty ? 'text-align:center; font-weight:500;' : 'text-align:left;';
                    return `<td style="${align}">${cell}</td>`;
                }).join('')}</tr>`;
            }).join('');
            document.getElementById('polls-tbody').innerHTML = tbodyHtml;

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
// CHARTS & LOGIC
// ─────────────────────────────────────────────

function createPollsChart(headers, rows) {
    const ctx = document.getElementById('pollsChart').getContext('2d');
    const zoomPlugin = window['chartjs-plugin-zoom'];
    if (zoomPlugin) Chart.register(zoomPlugin);

    const partyIdx = headers.reduce((acc, h, i) => {
        if (partyColors[h]) acc.push({ name: h, index: i });
        return acc;
    }, []);
    const reversedRows = [...rows].reverse();
    const dates = reversedRows.map(r => r[3]);

    const datasets = partyIdx.map(p => ({
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
                    zoom: { wheel: { enabled: true, modifierKey: 'shift' }, pinch: { enabled: true }, mode: 'x' }
                }
            },
            scales: {
                x: { ticks: { autoSkip: true, maxTicksLimit: 10 } },
                y: { beginAtZero: false }
            }
        }
    });
}

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

    $('#abstention-slider').slider({
        min: 20, max: 65, start: 35, step: 1, smooth: true,
        onChange: function (value) {
            document.getElementById('abstention-value').textContent = value;
            renderPrediction();
        }
    });

    $('#polls-count-dropdown').dropdown({ onChange: () => renderPrediction() });
    $('#nd-correction-checkbox').checkbox({ onChange: () => renderPrediction() });

    renderPrediction();
}

function computeNDBias(electionRows, pollRows, partyIndices, party) {
    const idx = partyIndices[party];
    if (idx === undefined || electionRows.length === 0) return 0;
    const biases = [];
    for (const elRow of electionRows) {
        const result = parseFloat(elRow[idx]);
        if (isNaN(result)) continue;
        const elDate = elRow[3];
        const priorPolls = pollRows.filter(r => r[3] <= elDate).slice(-10);
        if (priorPolls.length === 0) continue;
        const avg = priorPolls.reduce((sum, r) => sum + (parseFloat(r[idx]) || 0), 0) / priorPolls.length;
        biases.push(result - avg);
    }
    return biases.length > 0 ? biases.reduce((a, b) => a + b, 0) / biases.length : 0;
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

function renderPrediction() {
    const abstentionRate = ($('#abstention-slider').slider('get value') || 35) / 100;
    const pollsCountVal = $('input[name="polls-count"]').val() || '10';
    const useNDCorrection = $('#nd-correction-checkbox').checkbox('is checked');

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
    renderPredictionChart(predicted, base);
    renderParliament(seats);
}

// ─────────────────────────────────────────────
// GREEK ELECTORAL LAW & PARLIAMENT RENDERER
// ─────────────────────────────────────────────

function allocateGreekSeats(predicted) {
    const TOTAL_SEATS = 300;
    const THRESHOLD = 3.0;

    // 1. Filter parties above 3% threshold
    const eligible = Object.entries(predicted)
        .filter(([, v]) => v >= THRESHOLD)
        .sort((a, b) => b[1] - a[1]);

    if (eligible.length === 0) return {};

    // 2. Find winner for bonus calculation
    const winnerParty = eligible[0][0];
    const winnerPct = eligible[0][1];

    // 3. Compute staggered bonus seats (N. 4654/2020)
    let bonus = 0;
    if (winnerPct >= 25.0) {
        bonus = 20 + Math.floor((winnerPct - 25.0) / 0.5);
        bonus = Math.min(bonus, 50); // Hard cap at 50 bonus seats
    }

    const remainingSeats = TOTAL_SEATS - bonus;

    // 4. Normalize eligible votes to 100%
    const totalPct = eligible.reduce((s, [, v]) => s + v, 0);
    const quotas = {};
    const seats = {};

    eligible.forEach(([party, pct]) => {
        const share = pct / totalPct;
        const exactSeats = share * remainingSeats;
        quotas[party] = exactSeats;
        seats[party] = Math.floor(exactSeats);
    });

    // 5. Distribute leftover seats (largest remainder method)
    let allocated = Object.values(seats).reduce((a, b) => a + b, 0);
    let remaining = remainingSeats - allocated;

    const remainders = Object.entries(quotas)
        .map(([p, q]) => [p, q - Math.floor(q)])
        .sort((a, b) => b[1] - a[1]);

    for (let i = 0; i < remaining; i++) {
        seats[remainders[i][0]]++;
    }

    // 6. Add bonus seats back to the winner
    seats[winnerParty] += bonus;

    return seats;
}

function renderParliament(seats) {
    const container = document.getElementById('parliament-container');
    if (!container) return;
    container.style.display = 'block';

    const TOTAL_SEATS = 300;
    const sortedParties = Object.entries(seats).sort((a, b) => b[1] - a[1]);

    // Check if any party has an absolute majority (>= 151)
    const hasMajority = sortedParties.some(([, count]) => count >= 151);
    const glowClass = hasMajority ? 'majority-glow' : '';

    // Create a flat array mapping every single seat to a party
    let seatList = [];
    sortedParties.forEach(([party, count]) => {
        for (let i = 0; i < count; i++) seatList.push(party);
    });

    // Configuration for the 6 concentric arcs forming the semi-circle
    const arcs = [
        { r: 100, count: 33 },
        { r: 125, count: 40 },
        { r: 150, count: 47 },
        { r: 175, count: 53 },
        { r: 200, count: 60 },
        { r: 225, count: 67 }
    ];

    let svgHtml = `<svg viewBox="0 0 500 240" class="parliament-svg" style="width:100%; max-width:600px; height:auto; overflow:visible;">`;
    let seatIndex = 0;
    const cx = 250;
    const cy = 230; // Push down slightly to align the bottom row

    for (let arc of arcs) {
        for (let i = 0; i < arc.count; i++) {
            if (seatIndex >= TOTAL_SEATS) break;

            // Distribute angles from PI (left) to 0 (right)
            const angle = Math.PI - (i * (Math.PI / (arc.count - 1)));
            const x = cx + arc.r * Math.cos(angle);
            const y = cy - arc.r * Math.sin(angle);

            const party = seatList[seatIndex];
            const color = partyColors[party] || '#ccc';

            // Add SVG circle
            svgHtml += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${color}" title="${party}: Seat ${seatIndex + 1}" />`;
            seatIndex++;
        }
    }
    svgHtml += `</svg>`;

    // Generate Legend beneath the semi-circle
    const legendHtml = sortedParties.map(([p, s]) => `
        <div style="display:inline-flex; align-items:center; margin: 0.5rem 1rem; font-size:1.1rem;">
            <span style="display:inline-block; width:14px; height:14px; background:${partyColors[p] || '#ccc'}; border-radius:50%; margin-right:6px;"></span>
            <strong style="color:${partyColors[p] || '#333'}">${p}:</strong>
            <span style="margin-left:6px; font-weight:bold;">${s}</span>
        </div>
    `).join('');

    container.innerHTML = `
        <h3 class="ui header center aligned">
            Σύνθεση Βουλής
            ${hasMajority ? '<div class="sub header" style="color:#d4af37; font-weight:bold; margin-top:0.5rem;"><i class="star icon"></i> Αυτοδυναμία</div>' : ''}
        </h3>
        <div class="parliament-wrapper ${glowClass}">
            ${svgHtml}
        </div>
        <div style="text-align:center; margin-top: 1.5rem; display:flex; flex-wrap:wrap; justify-content:center;">
            ${legendHtml}
        </div>
    `;
}

function renderPredictionCards(predicted, base, seats) {
    const container = document.getElementById('prediction-cards');
    const sorted = Object.entries(predicted).sort(([, a], [, b]) => b - a).filter(([, v]) => v >= 1.0);

    container.innerHTML = sorted.map(([party, pct]) => {
        const basePct = base[party] || 0;
        const diff = pct - basePct;
        const vol = ((_volatility[party] || 0) * 100).toFixed(0);
        const seat = seats[party] || 0;
        const fmColor = partyColors[party] || 'grey';
        const hexColor = partyColors[party] || '#888';

        const diffSign = diff >= 0 ? '+' : '−';
        const diffIcon = diff >= 0 ? '▲' : '▼';
        const diffClass = diff >= 0 ? 'green' : 'red';

        return `
        <div class="card" style="border-top: 4px solid ${hexColor};">
            <div class="content">
                <div class="header" style="font-size:1.5rem; color:${hexColor};">
                    ${pct.toFixed(1)}%
                </div>
                <div class="meta" style="font-size:1rem; font-weight:700; margin-top:2px;">
                    ${party}
                </div>
                <div class="ui divider" style="margin:6px 0;"></div>
                <div class="description" style="font-size:0.8rem; line-height:1.6;">
                    <div>
                        Polls: <strong>${basePct.toFixed(1)}%</strong>
                        <span class="ui ${diffClass} text" style="margin-left:4px;">
                            ${diffIcon} ${diffSign}${Math.abs(diff).toFixed(1)}%
                        </span>
                    </div>
                    <div>Αστάθεια: <strong>${vol}%</strong></div>
                    ${seat > 0 ? `<div>Έδρες: <strong style="color:${hexColor}">${seat}</strong></div>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
}

function renderPredictionChart(predicted, base) {
    const sorted = Object.entries(predicted).sort(([, a], [, b]) => b - a).filter(([, v]) => v >= 1.0);
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
                tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%` } }
            },
            scales: {
                y: { beginAtZero: true, ticks: { callback: v => v + '%' } }
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