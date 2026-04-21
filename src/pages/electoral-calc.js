import { updateContent } from '../components/Layout.js';

export function renderElectoralCalc() {
    const pageHtml = `
        <div class="ui container" style="margin-top: 2rem;">
            <h2 class="ui header">
                Εκλογικό Μοντέλο 2027
                <div class="sub header">Ανάλυση δημοσκοπήσεων & πρόβλεψη εκλογικού αποτελέσματος</div>
            </h2>

            <div class="ui hidden divider"></div>

            <!-- Loading state -->
            <div id="polls-loading" class="ui active inverted dimmer">
                <div class="ui text loader">Φόρτωση δεδομένων...</div>
            </div>

            <!-- Error state -->
            <div id="polls-error" class="ui error message" style="display:none;">
                <div class="header">Σφάλμα φόρτωσης</div>
                <p>Δεν ήταν δυνατή η φόρτωση του αρχείου δεδομένων.</p>
            </div>

            <!-- Table -->
            <div id="polls-table-wrapper" style="display:none; overflow-x: auto;">
                <table class="ui celled striped compact small table" id="polls-table">
                    <thead id="polls-thead"></thead>
                    <tbody id="polls-tbody"></tbody>
                </table>
            </div>

            <button class="ui tertiary button" id="download-btn">
                <i class="download icon"></i> Κατέβασε τα δεδομένα (.csv)
            </button>
        </div>`;

    updateContent(pageHtml);
    loadPolls();
    document.getElementById('download-btn').addEventListener('click', () => {
        fetch('/polls.csv')
            .then(res => res.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'polls.csv';
                a.click();
                URL.revokeObjectURL(url);
            });
    });
}

function parseCSV(text) {
    const lines = text.trim().split('\n').map(l => l.replace(/\r$/, ''));
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => {
        const cols = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                cols.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        cols.push(current.trim().replace(/^"|"$/g, ''));
        return cols;
    });
    return { headers, rows };
}

function loadPolls() {
    fetch('/polls.csv')
        .then(res => {
            if (!res.ok) throw new Error('Network response was not ok');
            return res.text();
        })
        .then(text => {

            const { headers, rows } = parseCSV(text);

            console.log('Headers:', headers);
            console.log('Rows[0]:', rows[0]);
            console.log('Headers length:', headers.length);
            console.log('Row[0] length:', rows[0]?.length);
            // thead
            const theadHtml = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
            document.getElementById('polls-thead').innerHTML = theadHtml;

            // tbody
            const tbodyHtml = rows.map(row =>
                `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
            ).join('');
            document.getElementById('polls-tbody').innerHTML = tbodyHtml;

            const loader = document.getElementById('polls-loading');
            loader.style.display = 'none';
            loader.classList.remove('active');
            document.getElementById('polls-table-wrapper').style.display = 'block';
        })
        .catch(() => {
            const loader = document.getElementById('polls-loading');
            loader.style.display = 'none';
            loader.classList.remove('active');
            document.getElementById('polls-table-wrapper').style.display = 'block';
        });
}

