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

/**
 * Κύρια συνάρτηση απόδοσης της σελίδας
 */
export function renderElectoralCalc() {
    const pageHtml = `
        <style>
            .chart-container {
                position: relative;
                height: 450px;
                width: 100%;
                margin-top: 1.5rem;
                border: 1px solid rgba(34, 36, 38, .15);
                border-radius: 0.28rem;
                background: white;
                cursor: grab;
                touch-action: none; /* Βελτιώνει το drag σε κινητά */
            }
            .chart-container:active { cursor: grabbing; }
            
            .scrollable-container {
                overflow-x: auto;
                margin-top: 1.5rem;
                border: 1px solid rgba(34, 36, 38, .15);
                border-radius: 0.28rem;
            }
            .ui.table.scrolling-table { width: 100%; white-space: nowrap; border: none; }
            .party-header { background: #f9fafb; font-weight: bold; padding: 12px 8px; }
            .election-row { background-color: #f0f7ff !important; font-weight: bold; color: #1d4e89; }
            
            .chart-info {
                margin-top: 10px;
                font-size: 0.85rem;
                color: #666;
                display: flex;
                gap: 15px;
            }
        </style>

        <div class="ui container" style="margin-top: 2rem; margin-bottom: 5rem;">
            <h2 class="ui header">
                <div class="content">
                    Εκλογικό Μοντέλο 2027
                    <div class="sub header">Ανάλυση τάσεων και αποτελεσμάτων από το polls.csv</div>
                </div>
            </h2>

            <div class="chart-container">
                <canvas id="pollsChart"></canvas>
            </div>
            
            <div class="chart-info">
                <span>🖱️ <b>Drag:</b> Μετακίνηση δεξιά-αριστερά</span>
                <span>⌨️ <b>Shift + Wheel:</b> Ζουμ στο χρόνο</span>
                <span>👆 <b>Double Click:</b> Reset</span>
            </div>

            <div id="polls-loading" class="ui active inverted dimmer">
                <div class="ui text loader">Επεξεργασία δεδομένων...</div>
            </div>

            <div id="polls-table-wrapper" class="scrollable-container" style="display:none;">
                <table class="ui celled unstackable striped table scrolling-table" id="polls-table">
                    <thead id="polls-thead"></thead>
                    <tbody id="polls-tbody"></tbody>
                </table>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem;">
                <div style="font-size: 0.9rem;">
                    Πηγή: <a href="https://en.wikipedia.org/wiki/Opinion_polling_for_the_next_Greek_parliamentary_election" target="_blank">Wikipedia</a>
                </div>
                <button class="ui tiny button" id="download-btn">
                    <i class="download icon"></i> Λήψη CSV
                </button>
            </div>
        </div>`;

    updateContent(pageHtml);
    loadPolls();

    document.getElementById('download-btn').addEventListener('click', () => {
        window.location.href = '/polls.csv';
    });
}

/**
 * Δημιουργία του διαδραστικού γραφήματος
 */
function createChart(headers, rows) {
    const canvas = document.getElementById('pollsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const partyIndices = headers.reduce((acc, h, i) => {
        if (partyColors[h]) acc.push({ name: h, index: i });
        return acc;
    }, []);

    // Αντιστροφή για χρονολογική σειρά (παλιά -> νέα)
    const reversedRows = [...rows].reverse();
    const dates = reversedRows.map(r => r[3]); // Midpoint column

    const datasets = partyIndices.map(p => ({
        label: p.name,
        data: reversedRows.map(r => {
            const val = parseFloat(r[p.index]);
            return isNaN(val) ? null : val;
        }),
        borderColor: partyColors[p.name],
        backgroundColor: partyColors[p.name],
        borderWidth: 2.5,
        pointRadius: 0,
        pointHitRadius: 20,
        tension: 0.4,
        spanGaps: true
    }));

    const chart = new Chart(ctx, {
        type: 'line',
        data: { labels: dates, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { usePointStyle: true, boxWidth: 8, padding: 15 }
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'x',
                        threshold: 10
                    },
                    zoom: {
                        wheel: {
                            enabled: true,
                            modifierKey: 'shift'
                        },
                        pinch: { enabled: true },
                        mode: 'x'
                    }
                }
            },
            scales: {
                x: {
                    ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
                    grid: { display: false }
                },
                y: {
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: { callback: (val) => val + '%' }
                }
            },
            onClick: (e) => {
                // Reset zoom on double click
                if (e.native.detail === 2) chart.resetZoom();
            }
        }
    });
}

/**
 * Φόρτωση και επεξεργασία του CSV
 */
function loadPolls() {
    fetch('/polls.csv')
        .then(res => res.text())
        .then(text => {
            const { headers, rows } = parseCSV(text);

            // 1. Κατασκευή Header Πίνακα
            const theadHtml = `<tr>${headers.map(h => {
                const color = partyColors[h];
                const borderStyle = color ? `border-bottom: 5px solid ${color} !important;` : '';
                return `<th class="party-header" style="${borderStyle}">${h}</th>`;
            }).join('')}</tr>`;
            document.getElementById('polls-thead').innerHTML = theadHtml;

            // 2. Κατασκευή Body Πίνακα (με Breakpoints)
            const tbodyHtml = rows.map(row => {
                // Έλεγχος αν είναι σειρά εκλογών (ιστορικό ορόσημο)
                const isElection = row[0].toLowerCase().includes('election');
                const rowClass = isElection ? 'class="election-row"' : '';

                return `<tr ${rowClass}>${row.map((cell, index) => {
                    const isPartyCol = !!partyColors[headers[index]];
                    const align = isPartyCol ? 'text-align: center; font-weight: 500;' : 'text-align: left;';
                    return `<td style="${align}">${cell}</td>`;
                }).join('')}</tr>`;
            }).join('');
            document.getElementById('polls-tbody').innerHTML = tbodyHtml;

            // 3. Δημιουργία Γραφήματος
            createChart(headers, rows);

            document.getElementById('polls-loading').style.display = 'none';
            document.getElementById('polls-table-wrapper').style.display = 'block';
        })
        .catch(err => {
            console.error('CSV Load Error:', err);
            document.getElementById('polls-loading').innerHTML =
                '<div class="ui error message">Αδυναμία φόρτωσης δεδομένων (polls.csv)</div>';
        });
}

/**
 * Helper: CSV Parser
 */
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