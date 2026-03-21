// ═══════════════════════════════════════════════════════════════
//  BRAIN-MONITOR.JS — Neurite fiber tracing visualization
//  Branching dendrite trees that grow, fire, and degrade with trip.
//  Fixed bottom-right overlay, transparent, conky magenta palette.
// ═══════════════════════════════════════════════════════════════

(function(){

let cvs, ctx;
let running = false;
let branches = [];
let signals = [];
let monitorStartTime = 0;
let readoutLines = [];
let lastReadout = 0;
let growthPool = [];
let totalFibers = 0;

const MAX_BRANCHES = 900;
const MAX_SIGNALS = 120;
const READOUT_INTERVAL = 2200;

// ── READOUT TEMPLATES ──
const NORMAL_READOUTS = [
    () => `5-HT2A BIND: ${(72 + Math.random()*15).toFixed(1)}%`,
    () => `GABA TONE: ${(88 + Math.random()*8).toFixed(1)} mV`,
    () => `DEFAULT NET: COHERENT`,
    () => `ALPHA: ${(9.2 + Math.random()*2).toFixed(1)} Hz`,
    () => `BETA SYNC: ${(0.82 + Math.random()*0.12).toFixed(2)}`,
    () => `THALAMIC GATE: NOMINAL`,
    () => `ENTROPY: ${(4.1 + Math.random()*0.8).toFixed(2)} bits`,
    () => `VISUAL STREAM: INTACT`,
    () => `NMDA: ${(12 + Math.random()*5).toFixed(1)} pA`,
];

const TRIP_READOUTS = [
    () => `!! 5-HT2A SAT: ${(94 + Math.random()*6).toFixed(1)}%`,
    () => `DEFAULT NET: DISSOLVING`,
    () => `!! THALAMIC GATE: COMPROMISED`,
    () => `ENTROPY SPIKE: ${(7.2+Math.random()*3).toFixed(2)}`,
    () => `!! VISUAL: CROSS-MODAL`,
    () => `CLAUSTRUM: DESYNC`,
    () => `!! TEMPORAL BIND: FRAGMENT`,
    () => `PATTERN COMPL: HALLUC.`,
    () => `!! EGO BOUNDARY: UNDEFINED`,
    () => `DMN-TPN CROSSTALK`,
    () => `!! AMYGDALA OVERRIDE`,
    () => `5-HT STORM: PH ${Math.floor(Math.random()*4)+1}`,
    () => `!! REALITY TEST: FAILED`,
    () => `!! FRACTAL IN V1/V2`,
    () => `SYNESTHETIC BRIDGE: ON`,
    () => `!! BAYESIAN PRIOR: CORRUPT`,
];

// ── BRANCH — a single fiber segment ──
function makeBranch(x, y, angle, depth, parentIdx) {
    var segLen = 8 + Math.random() * 18 - depth * 0.5;
    if (segLen < 4) segLen = 4;
    return {
        x0: x, y0: y,
        x1: x, y1: y,
        tx: x + Math.cos(angle) * segLen,
        ty: y + Math.sin(angle) * segLen,
        angle: angle,
        depth: depth,
        progress: 0,
        grown: false,
        parent: parentIdx,
        thickness: Math.max(0.25, 2.0 - depth * 0.22),
        fireTimer: 0,
        jitter: (Math.random() - 0.5) * 0.18,
    };
}

// ── SEED INITIAL TREES ──
function seedTrees(w, h) {
    branches = [];
    growthPool = [];
    totalFibers = 0;

    var rootCount = 6 + Math.floor(Math.random() * 4);
    for (var i = 0; i < rootCount; i++) {
        var x = w * (0.1 + 0.8 * (i / (rootCount - 1))) + (Math.random() - 0.5) * 30;
        var y = h * (0.35 + Math.random() * 0.3);
        var angle = -Math.PI/2 + (Math.random() - 0.5) * 1.2;
        var idx = branches.length;
        branches.push(makeBranch(x, y, angle, 0, -1));
        growthPool.push(idx);
        totalFibers++;
    }
}

// ── GROW ONE STEP ──
function growStep(w, h, trip) {
    if (growthPool.length === 0 || branches.length >= MAX_BRANCHES) return;

    var growCount = Math.min(growthPool.length, 1 + Math.floor(trip * 2));

    for (var g = 0; g < growCount; g++) {
        if (growthPool.length === 0) break;
        var poolIdx = Math.floor(Math.random() * growthPool.length);
        var brIdx = growthPool[poolIdx];
        var br = branches[brIdx];

        if (!br || !br.grown) continue;
        growthPool.splice(poolIdx, 1);

        var branchCount = (Math.random() < 0.35 + trip * 0.15 && br.depth < 8) ? 2 : 1;

        for (var b = 0; b < branchCount; b++) {
            if (branches.length >= MAX_BRANCHES) break;

            var spread = (0.3 + br.depth * 0.08 + trip * 0.12) * (Math.random() > 0.5 ? 1 : -1);
            var newAngle = br.angle + spread + (Math.random() - 0.5) * 0.4;
            var newIdx = branches.length;

            var seg = makeBranch(br.x1, br.y1, newAngle, br.depth + 1, brIdx);

            if (seg.tx < -20 || seg.tx > w + 20 || seg.ty < -20 || seg.ty > h + 20) continue;

            branches.push(seg);
            growthPool.push(newIdx);
            totalFibers++;
        }
    }
}

// ── FIRE SIGNALS ALONG FIBERS ──
function spawnSignal(trip) {
    if (signals.length >= MAX_SIGNALS || branches.length < 5) return;

    var rate = 0.03 + trip * 0.08;
    if (Math.random() > rate) return;

    var startIdx = Math.floor(Math.random() * branches.length);
    var br = branches[startIdx];
    if (!br || !br.grown) return;

    signals.push({
        branchIdx: startIdx,
        progress: 0,
        speed: 0.02 + trip * 0.015 + Math.random() * 0.01,
        size: 1.0 + trip * 0.8,
        hue: trip < 0.5 ? (120 + Math.random() * 40) : (300 + Math.random() * 60),
    });
}

// ── GET TRIP STATE ──
function getTripState() {
    var z3 = window.currentZone3;
    if (z3) return { trip: z3.neuralIntensity || z3.z3Trip || 0.5, zone: 3 };
    var z2 = window.currentZone2;
    if (z2) return { trip: z2.neuralIntensity || z2.z2Trip || 0.3, zone: 2 };
    if (typeof tripIntensity !== 'undefined') return { trip: tripIntensity, zone: 1 };
    return { trip: 0.2, zone: 0 };
}

// ── DRAW BRANCHES ──
function drawBranches(t, trip) {
    for (var i = 0; i < branches.length; i++) {
        var br = branches[i];

        if (!br.grown) {
            br.progress = Math.min(1, br.progress + 0.04 + trip * 0.02);
            var p = br.progress;
            br.x1 = br.x0 + (br.tx - br.x0) * p;
            br.y1 = br.y0 + (br.ty - br.y0) * p;
            if (p > 0.2 && p < 0.8) {
                var perp = br.angle + Math.PI/2;
                var curveMag = Math.sin(p * Math.PI) * br.jitter * 12;
                br.x1 += Math.cos(perp) * curveMag;
                br.y1 += Math.sin(perp) * curveMag;
            }
            if (br.progress >= 1) br.grown = true;
        }

        br.fireTimer = Math.max(0, br.fireTimer - 0.015);

        var fire = br.fireTimer;
        var baseAlpha = Math.max(0.12, 0.55 - br.depth * 0.055);
        var r, g, b, alpha;

        if (trip < 0.5) {
            r = 20 + fire * 180;
            g = 160 + fire * 80 - br.depth * 6;
            b = 15 + fire * 50;
            alpha = baseAlpha + fire * 0.4;
        } else if (trip < 1.0) {
            var blend = (trip - 0.5) * 2;
            r = 20 + blend * 210 + fire * 200;
            g = 160 * (1 - blend * 0.7) + fire * 40;
            b = 15 + blend * 180 + fire * 80;
            alpha = baseAlpha + fire * 0.4 + blend * 0.1;
        } else {
            r = 255;
            g = fire * 60;
            b = 160 + fire * 95;
            alpha = baseAlpha + 0.15 + fire * 0.3;
        }

        alpha *= 0.85 + 0.15 * Math.sin(t * 0.8 + i * 0.3);

        ctx.beginPath();
        ctx.moveTo(br.x0, br.y0);
        ctx.lineTo(br.x1, br.y1);
        ctx.strokeStyle = 'rgba(' + (r|0) + ',' + (g|0) + ',' + (b|0) + ',' + alpha.toFixed(3) + ')';
        ctx.lineWidth = br.thickness * br.progress;
        ctx.stroke();

        if (br.grown && br.depth > 3 && fire > 0.1) {
            ctx.beginPath();
            ctx.arc(br.x1, br.y1, br.thickness * 1.3 + fire * 1.8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + (r|0) + ',' + (g|0) + ',' + (b|0) + ',' + (fire * 0.5).toFixed(3) + ')';
            ctx.fill();
        }
    }
}

function drawSignals(t, trip) {
    for (var i = signals.length - 1; i >= 0; i--) {
        var sig = signals[i];
        sig.progress += sig.speed;

        if (sig.progress >= 1) {
            var br = branches[sig.branchIdx];
            if (br) {
                br.fireTimer = 1.0;
                for (var j = 0; j < branches.length; j++) {
                    if (branches[j].parent === sig.branchIdx && branches[j].grown) {
                        if (signals.length < MAX_SIGNALS && Math.random() < 0.55 + trip * 0.2) {
                            signals.push({
                                branchIdx: j,
                                progress: 0,
                                speed: sig.speed * (0.9 + Math.random() * 0.2),
                                size: sig.size * 0.85,
                                hue: sig.hue + (Math.random() - 0.5) * 20,
                            });
                        }
                        branches[j].fireTimer = 0.7;
                    }
                }
            }
            signals.splice(i, 1);
            continue;
        }

        var sbr = branches[sig.branchIdx];
        if (!sbr) { signals.splice(i, 1); continue; }

        var sp = sig.progress;
        var px = sbr.x0 + (sbr.x1 - sbr.x0) * sp;
        var py = sbr.y0 + (sbr.y1 - sbr.y0) * sp;
        var hue = sig.hue;

        // Draw tail — line behind the pulse
        var tailLen = 0.15;
        var tp = Math.max(0, sp - tailLen);
        var tx = sbr.x0 + (sbr.x1 - sbr.x0) * tp;
        var ty = sbr.y0 + (sbr.y1 - sbr.y0) * tp;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(px, py);
        ctx.strokeStyle = 'hsla(' + hue + ', 100%, 70%, 0.5)';
        ctx.lineWidth = sig.size * 0.8;
        ctx.stroke();

        // Glow head
        var grad = ctx.createRadialGradient(px, py, 0, px, py, sig.size * 4);
        grad.addColorStop(0, 'hsla(' + hue + ', 100%, 85%, 0.9)');
        grad.addColorStop(0.3, 'hsla(' + hue + ', 100%, 65%, 0.3)');
        grad.addColorStop(1, 'hsla(' + hue + ', 80%, 50%, 0)');
        ctx.beginPath();
        ctx.arc(px, py, sig.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
    }
}

// ── READOUT ──
function updateReadout(now, trip, zone) {
    if (now - lastReadout < READOUT_INTERVAL) return;
    lastReadout = now;

    var tripChance = Math.min(0.9, trip * 0.5);
    var line;
    if (Math.random() < tripChance) {
        line = TRIP_READOUTS[Math.floor(Math.random() * TRIP_READOUTS.length)]();
    } else {
        line = NORMAL_READOUTS[Math.floor(Math.random() * NORMAL_READOUTS.length)]();
    }

    var elapsed = ((now - monitorStartTime) / 1000).toFixed(1);
    readoutLines.unshift('[T+' + elapsed + 's] ' + line);
    if (readoutLines.length > 6) readoutLines.pop();

    var el = document.getElementById('brain-readout');
    if (el) {
        el.innerHTML = readoutLines.map(function(l, i) {
            var isAlert = l.indexOf('!!') >= 0;
            var opacity = 1 - i * 0.12;
            var color = isAlert ? '#ff2040' : '#ff00ff';
            return '<div style="opacity:' + opacity + ';color:' + color + ';' + (isAlert?'font-weight:bold;':'') + '">' + l + '</div>';
        }).join('');
    }
}

function updateHeader(trip, zone) {
    var el = document.getElementById('brain-header');
    if (!el) return;

    var firingRate = (signals.length * 3.8).toFixed(0);
    var statusText, statusColor;
    if (trip < 0.3) { statusText = 'BASELINE'; statusColor = '#00cc88'; }
    else if (trip < 0.7) { statusText = 'ELEVATED'; statusColor = '#ffaa00'; }
    else if (trip < 1.2) { statusText = 'ABNORMAL'; statusColor = '#ff4400'; }
    else { statusText = 'CRITICAL'; statusColor = '#ff0040'; }

    el.innerHTML =
        '<span style="color:' + statusColor + ';font-weight:bold;">' + statusText + '</span>'
        + ' Z' + zone + ' | ' + totalFibers + ' FIBERS | ' + firingRate + ' Hz';
}

// ── MAIN LOOP ──
function render() {
    if (!running || !cvs || !ctx) return;

    var now = performance.now();
    var t = now * 0.001;
    var w = cvs._lw;
    var h = cvs._lh;

    var state = getTripState();
    var trip = state.trip;

    // Fully transparent — no background at all
    ctx.clearRect(0, 0, w, h);

    growStep(w, h, trip);
    spawnSignal(trip);
    drawBranches(t, trip);
    drawSignals(t, trip);

    // Aberrant growth bursts at high trip
    if (trip > 0.8 && branches.length < MAX_BRANCHES - 20 && Math.random() < 0.002) {
        var rx = Math.random() * w;
        var ry = Math.random() * h;
        var ra = Math.random() * Math.PI * 2;
        var idx = branches.length;
        branches.push(makeBranch(rx, ry, ra, 0, -1));
        growthPool.push(idx);
        totalFibers++;
    }

    updateReadout(now, trip, state.zone);
    updateHeader(trip, state.zone);

    requestAnimationFrame(render);
}

// ── INIT ──
window.initBrainMonitor = function() {
    var container = document.getElementById('brain-monitor-wrap');

    if (!container) {
        container = document.createElement('div');
        container.id = 'brain-monitor-wrap';
        container.style.cssText =
            'position:fixed;'
            + 'bottom:clamp(30px, 4vh, 60px);'
            + 'right:clamp(20px, 2vw, 50px);'
            + 'width:clamp(500px, 55vw, 900px);'
            + 'z-index:700;'
            + 'pointer-events:none;'
            + 'font-family:"Courier New",monospace;'
            + 'color:#ff00ff;'
            + 'text-shadow:0 0 5px rgba(255,0,255,0.6);'
            + 'font-size:clamp(9px, 0.85vw, 13px);';

        container.innerHTML =
            '<div id="brain-header" style="margin-bottom:3px;line-height:1.3;"></div>'
            + '<canvas id="brain-canvas" style="width:100%;display:block;"></canvas>'
            + '<div id="brain-readout" style="line-height:1.3;margin-top:3px;max-height:7em;overflow:hidden;"></div>';

        document.body.appendChild(container);
    }

    container.style.display = 'block';

    cvs = document.getElementById('brain-canvas');
    if (!cvs) return;

    var rect = container.getBoundingClientRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var lw = Math.max(300, rect.width);
    var lh = Math.floor(lw * 0.65);
    cvs.width = Math.floor(lw * dpr);
    cvs.height = Math.floor(lh * dpr);
    cvs.style.height = lh + 'px';
    cvs._lw = lw;
    cvs._lh = lh;

    ctx = cvs.getContext('2d');
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, lw, lh);
    seedTrees(lw, lh);
    signals = [];
    readoutLines = [];
    lastReadout = 0;
    monitorStartTime = performance.now();

    if (!running) {
        running = true;
        requestAnimationFrame(render);
    }
};

window.stopBrainMonitor = function() {
    running = false;
    var el = document.getElementById('brain-monitor-wrap');
    if (el) el.style.display = 'none';
};

})();