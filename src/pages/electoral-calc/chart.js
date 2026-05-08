// src/pages/electoral-calc/chart.js
import { partyColors } from './constants.js';

/** Renders the polling-trends line chart into #pollsChart. */
export function createPollsChart(headers, rows) {
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
