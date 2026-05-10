// src/pages/electoral-calc/chart.js
import { partyColors } from './constants.js';

/** Renders the polling-trends SVG chart into #pollsChart with zoom, pan and party toggling. */
export function createPollsChart(headers, rows) {
    const pollRows = rows.filter(r => !r[0].toLowerCase().includes('election'));
    const pts = [...pollRows].reverse(); // oldest → newest
    const n = pts.length;
    if (!n) return;

    const partyDefs = headers.reduce((acc, h, i) => {
        if (partyColors[h]) acc.push({ name: h, idx: i });
        return acc;
    }, []);

    const allSeries = partyDefs.map(p => {
        const values = pts.map(r => { const v = parseFloat(r[p.idx]); return isNaN(v) || v === 0 ? null : v; });
        const recent = values.slice(-20).filter(v => v !== null);
        const avg = recent.length ? recent.reduce((s, v) => s + v, 0) / recent.length : 0;
        return { name: p.name, color: partyColors[p.name], values, avg };
    }).filter(s => s.avg >= 2.5).sort((a, b) => b.avg - a.avg);

    // ── Mutable view state ───────────────────────────────────────────────
    let startIdx = 0;
    let endIdx = n - 1;
    const hiddenParties = new Set();

    // ── Static scaffold ──────────────────────────────────────────────────
    const container = document.getElementById('pollsChart');
    container.style.position = 'relative';
    container.innerHTML = `
        <div class="polls-chart-toolbar">
            <div class="polls-chart-btn-group" role="group" aria-label="Chart controls">
                <button type="button" class="polls-chart-btn" id="chart-zoom-in">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <circle cx="5" cy="5" r="4" stroke="currentColor" stroke-width="1.5"/>
                        <line x1="3" y1="5" x2="7" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        <line x1="5" y1="3" x2="5" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        <line x1="8.5" y1="8.5" x2="11" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    Zoom in
                </button>
                <button type="button" class="polls-chart-btn" id="chart-zoom-out">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <circle cx="5" cy="5" r="4" stroke="currentColor" stroke-width="1.5"/>
                        <line x1="3" y1="5" x2="7" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        <line x1="8.5" y1="8.5" x2="11" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    Zoom out
                </button>
                <button type="button" class="polls-chart-btn" id="chart-pan-left" aria-label="Show earlier polls">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M8 2L3 6l5 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Earlier
                </button>
                <button type="button" class="polls-chart-btn" id="chart-pan-right" aria-label="Show later polls">
                    Later
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M4 2l5 4-5 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <button type="button" class="polls-chart-btn polls-chart-btn--ghost" id="chart-reset">Reset</button>
            </div>
            <span class="polls-chart-range" id="polls-chart-range" aria-live="polite"></span>
        </div>
        <div id="polls-svg-wrapper" style="position:relative;"></div>
        <div class="polls-chart-legend" id="polls-chart-legend" role="group" aria-label="Toggle parties"></div>
    `;

    // ── Redraw ────────────────────────────────────────────────────────────
    function redraw() {
        const visible = pts.slice(startIdx, endIdx + 1);
        const visN = visible.length;

        const W = 880, H = 300;
        const ml = 44, mr = 12, mt = 10, mb = 58;
        const pw = W - ml - mr, ph = H - mt - mb;

        const activeSeries = allSeries.filter(s => !hiddenParties.has(s.name));

        const allVals = activeSeries.flatMap(s =>
            Array.from({ length: visN }, (_, i) => s.values[startIdx + i]).filter(v => v !== null)
        );
        const dataMax = allVals.length ? Math.max(...allVals) : 40;
        const maxY = Math.ceil(dataMax / 5) * 5;

        const xOf = i => visN > 1 ? (i / (visN - 1)) * pw : pw / 2;
        const yOf = v => ph - (v / maxY) * ph;

        // Grid + Y labels
        let gridHtml = '';
        for (let v = 0; v <= maxY; v += 5) {
            const y = yOf(v).toFixed(1);
            gridHtml += `<line x1="0" y1="${y}" x2="${pw}" y2="${y}" stroke="${v === 0 ? '#b1b4b6' : '#f3f2f1'}" stroke-width="1"/>`;
            gridHtml += `<text x="-6" y="${(+y + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#505a5f" font-family="arial,sans-serif">${v}%</text>`;
        }

        // X labels
        let xLabelHtml = '';
        const xCount = Math.min(8, visN);
        for (let i = 0; i < xCount; i++) {
            const idx = xCount > 1 ? Math.round(i * (visN - 1) / (xCount - 1)) : 0;
            xLabelHtml += `<text transform="translate(${xOf(idx).toFixed(1)},${(ph + 12).toFixed(1)}) rotate(-35)"
                text-anchor="end" dominant-baseline="hanging"
                font-size="11" fill="#505a5f" font-family="arial,sans-serif">${visible[idx]?.[3] || ''}</text>`;
        }

        // Series lines
        let linesHtml = '';
        activeSeries.forEach(s => {
            let d = '';
            for (let i = 0; i < visN; i++) {
                const v = s.values[startIdx + i];
                if (v === null) continue;
                const x = xOf(i).toFixed(1), y = yOf(v).toFixed(1);
                const prevNull = i === 0 || s.values[startIdx + i - 1] === null;
                d += prevNull ? `M ${x} ${y}` : ` L ${x} ${y}`;
            }
            if (d) linesHtml += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
        });

        // Render SVG
        const wrapper = document.getElementById('polls-svg-wrapper');
        wrapper.innerHTML = `
            <svg id="polls-svg" width="100%" viewBox="0 0 ${W} ${H}"
                 style="display:block;overflow:visible;" aria-label="Polling trends chart">
                <g transform="translate(${ml},${mt})">
                    ${gridHtml}
                    ${linesHtml}
                    <line id="polls-crosshair" x1="0" y1="0" x2="0" y2="${ph}"
                          stroke="#0b0c0c" stroke-width="1" stroke-dasharray="4,3"
                          opacity="0" pointer-events="none"/>
                    <rect id="polls-hit" x="0" y="0" width="${pw}" height="${ph}"
                          fill="transparent" style="cursor:crosshair;"/>
                    ${xLabelHtml}
                </g>
            </svg>
            <div id="polls-tooltip" style="display:none;position:absolute;background:#fff;
                 border:1px solid #0b0c0c;padding:8px 12px;font-size:12px;
                 font-family:arial,sans-serif;pointer-events:none;z-index:10;
                 min-width:130px;box-shadow:2px 2px 0 #0b0c0c;"></div>`;

        // Tooltip interactions
        const svg = wrapper.querySelector('#polls-svg');
        const xhair = wrapper.querySelector('#polls-crosshair');
        const tip = wrapper.querySelector('#polls-tooltip');
        const hit = wrapper.querySelector('#polls-hit');

        hit.addEventListener('mousemove', e => {
            const rect = svg.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) * (W / rect.width) - ml;
            const idx = Math.max(0, Math.min(visN - 1, Math.round((mouseX / pw) * (visN - 1))));
            const cx = xOf(idx).toFixed(1);
            xhair.setAttribute('x1', cx); xhair.setAttribute('x2', cx);
            xhair.setAttribute('opacity', '0.5');

            tip.innerHTML =
                `<div style="font-weight:700;margin-bottom:6px;color:#0b0c0c;">${visible[idx]?.[3] || ''}</div>` +
                activeSeries
                    .filter(s => s.values[startIdx + idx] !== null)
                    .map(s => {
                        const v = s.values[startIdx + idx];
                        return `<div style="display:flex;justify-content:space-between;gap:12px;">
                            <span>
                                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;
                                             background:${s.color};margin-right:4px;vertical-align:middle;"></span>
                                ${s.name}
                            </span>
                            <strong style="color:${s.color}">${v != null ? v.toFixed(1) + '%' : '—'}</strong>
                        </div>`;
                    }).join('');
            tip.style.display = 'block';

            const cRect = container.getBoundingClientRect();
            let tx = e.clientX - cRect.left + 14;
            let ty = e.clientY - cRect.top - 16;
            if (tx + 160 > cRect.width) tx -= 172;
            tip.style.left = tx + 'px';
            tip.style.top = ty + 'px';
        });
        hit.addEventListener('mouseleave', () => {
            xhair.setAttribute('opacity', '0');
            tip.style.display = 'none';
        });

        // Range label
        const rangeEl = document.getElementById('polls-chart-range');
        if (rangeEl && visN > 0) {
            rangeEl.textContent =
                `${visible[0]?.[3] || ''} – ${visible[visN - 1]?.[3] || ''} (${visN} poll${visN === 1 ? '' : 's'})`;
        }

        // Button disabled states
        document.getElementById('chart-pan-left').disabled = startIdx === 0;
        document.getElementById('chart-pan-right').disabled = endIdx === n - 1;
        document.getElementById('chart-zoom-out').disabled = endIdx - startIdx >= n - 1;
        document.getElementById('chart-zoom-in').disabled = endIdx - startIdx < 2;

        // Legend
        renderLegend();
    }

    // ── Legend with toggle buttons ────────────────────────────────────────
    function renderLegend() {
        const legend = document.getElementById('polls-chart-legend');
        if (!legend) return;
        legend.innerHTML = allSeries.map(s => {
            const hidden = hiddenParties.has(s.name);
            return `<button type="button"
                        class="polls-legend-btn${hidden ? ' polls-legend-btn--off' : ''}"
                        data-party="${s.name}"
                        style="--c:${s.color}"
                        aria-pressed="${String(!hidden)}">
                        <span class="polls-legend-pip" aria-hidden="true"></span>
                        ${s.name}
                    </button>`;
        }).join('');

        legend.querySelectorAll('.polls-legend-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const party = btn.dataset.party;
                if (hiddenParties.has(party)) hiddenParties.delete(party);
                else hiddenParties.add(party);
                redraw();
            });
        });
    }

    // ── Control button wiring ─────────────────────────────────────────────
    document.getElementById('chart-zoom-in').addEventListener('click', () => {
        const win = endIdx - startIdx;
        const step = Math.max(1, Math.floor(win * 0.25));
        // Zoom toward the right (recent) end
        startIdx = Math.min(startIdx + step, endIdx - 1);
        endIdx = Math.max(endIdx - step, startIdx + 1);
        redraw();
    });

    document.getElementById('chart-zoom-out').addEventListener('click', () => {
        const win = endIdx - startIdx;
        const step = Math.max(1, Math.floor(win * 0.33));
        startIdx = Math.max(0, startIdx - step);
        endIdx = Math.min(n - 1, endIdx + step);
        redraw();
    });

    document.getElementById('chart-pan-left').addEventListener('click', () => {
        const win = endIdx - startIdx;
        const step = Math.max(1, Math.floor(win * 0.25));
        const shift = Math.min(step, startIdx);
        startIdx -= shift;
        endIdx -= shift;
        redraw();
    });

    document.getElementById('chart-pan-right').addEventListener('click', () => {
        const win = endIdx - startIdx;
        const step = Math.max(1, Math.floor(win * 0.25));
        const shift = Math.min(step, n - 1 - endIdx);
        startIdx += shift;
        endIdx += shift;
        redraw();
    });

    document.getElementById('chart-reset').addEventListener('click', () => {
        startIdx = 0;
        endIdx = n - 1;
        hiddenParties.clear();
        redraw();
    });

    // ── Initial draw ──────────────────────────────────────────────────────
    redraw();
}