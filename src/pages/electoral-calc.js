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
            /* Styling για το Chart Area */
            .chart-wrapper {
                position: relative;
                height: 400px;
                width: 100%;
                margin-bottom: 2rem;
                border: 1px solid rgba(34, 36, 38, .15);
                border-radius: 0.28rem;
                background: white;
                touch-action: none; /* Απαραίτητο για να μην κάνει scroll η σελίδα αντί για το chart */
                user-select: none;
                cursor: grab;
            }
            .chart-wrapper:active { cursor: grabbing; }
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

            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 0.9rem;">
                    Πηγή: <a href="https://en.wikipedia.org/wiki/Opinion_polling_for_the_next_Greek_parliamentary_election" target="_blank">Wikipedia</a>
                </div>
                <a id="download-btn" style="cursor: pointer;">
                    Λήψη CSV
                </a>
            </div>
        </div>`;

    updateContent(pageHtml);
    loadPolls();

    document.getElementById('download-btn').addEventListener('click', () => {
        window.location.href = '/polls.csv';
    });
}

function createChart(headers, rows) {
    const ctx = document.getElementById('pollsChart').getContext('2d');
    
    // Register το plugin - Αν είναι μέσω CDN βρίσκεται στο window['chartjs-plugin-zoom']
    const zoomPlugin = window['chartjs-plugin-zoom'];
    if (zoomPlugin) {
        Chart.register(zoomPlugin);
    }

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
        data: { labels: dates, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'x',
                        modifierKey: null,
                    },
                    zoom: {
                        wheel: {
                            enabled: true,
                            modifierKey: 'shift',
                        },
                        pinch: { enabled: true },
                        mode: 'x',
                    }
                }
            },
            scales: {
                x: { 
                    ticks: { autoSkip: true, maxTicksLimit: 10 } 
                },
                y: { 
                    beginAtZero: false 
                }
            }
        }
    });
}

function loadPolls() {
    fetch('/polls.csv')
        .then(res => res.text())
        .then(text => {
            const { headers, rows } = parseCSV(text);

            // HEADERS: Χρώμα ΜΟΝΟ στο bottom border
            const theadHtml = `<tr>${headers.map(h => {
                const color = partyColors[h];
                const borderStyle = color ? `border-bottom: 5px solid ${color} !important;` : '';
                return `<th class="party-header" style="${borderStyle}">${h}</th>`;
            }).join('')}</tr>`;

            document.getElementById('polls-thead').innerHTML = theadHtml;

            // BODY: Καθαρά κελιά + Breakpoints styling
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

            // Initialize Chart
            createChart(headers, rows);

            document.getElementById('polls-loading').style.display = 'none';
            document.getElementById('polls-table-wrapper').style.display = 'block';
        })
        .catch(err => {
            console.error(err);
            document.getElementById('polls-loading').innerHTML = '<div class="ui error message">Σφάλμα αρχείου</div>';
        });
}

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