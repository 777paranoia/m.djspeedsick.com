(function(){

var cvs, ctx;
var running = false;
var fibers = [];       // each fiber is a full curve with many points
var pulses = [];
var monitorStartTime = 0;
var readoutLines = [];
var lastReadout = 0;
var fiberSpawnTimer = 0;

var _bmMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && window.innerWidth < 1024);
var MAX_FIBERS = _bmMobile ? 150 : 400;
var MAX_PULSES = _bmMobile ? 30 : 60;
var READOUT_INTERVAL = 2200;
var POINTS_PER_FIBER = 30;

// ── READOUTS ──
var NORMAL_READOUTS = [
    function(){ return '\u0421\u0435\u0440\u043E\u0442\u043E\u043D\u0438\u043D 5-HT2A: ' + (72+Math.random()*15).toFixed(1) + '%'; },
    function(){ return '\u30CB\u30E5\u30FC\u30ED\u30F3\u540C\u671F: ' + (0.82+Math.random()*0.12).toFixed(2); },
    function(){ return '\u0F51\u0F56\u0F44\u0F66\u0F0B\u0F62\u0F90\u0FB1\u0F7A\u0F53 \u0F66\u0F90\u0FB1\u0F7A\u0F51: \u0F66\u0F90\u0FB1\u0F7A\u0F51\u0F0B\u0F40\u0FB1\u0F72'; },
    function(){ return '\u0422\u0430\u043B\u0430\u043C\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0448\u043B\u044E\u0437: \u041D\u041E\u0420\u041C\u0410'; },
    function(){ return '\u8996\u899A\u30B9\u30C8\u30EA\u30FC\u30E0: \u5B8C\u5168'; },
    function(){ return '\u042D\u043D\u0442\u0440\u043E\u043F\u0438\u044F: ' + (4.1+Math.random()*0.8).toFixed(2) + ' \u0431\u0438\u0442'; },
    function(){ return '\u0F66\u0F7A\u0F58\u0F66\u0F0B\u0F40\u0FB1\u0F72\u0F0B\u0F62\u0F92\u0FB1\u0F74\u0F53: ' + (9.2+Math.random()*2).toFixed(1) + ' Hz'; },
    function(){ return '\u30C7\u30D5\u30A9\u30EB\u30C8\u30CD\u30C3\u30C8: \u6574\u5408\u6027'; },
    function(){ return 'GABA \u0442\u043E\u043D\u0443\u0441: ' + (88+Math.random()*8).toFixed(1) + ' \u043C\u0412'; },
    function(){ return '\u0F51\u0F56\u0F44\u0F66\u0F0B\u0F62\u0F90\u0FB1\u0F7A\u0F53 NMDA: ' + (12+Math.random()*5).toFixed(1) + ' pA'; },
];
var TRIP_READOUTS = [
    function(){ return '!! \u041D\u0410\u0421\u042B\u0429\u0415\u041D\u0418\u0415 5-HT2A: ' + (94+Math.random()*6).toFixed(1) + '%'; },
    function(){ return '!! \u30C7\u30D5\u30A9\u30EB\u30C8\u30CD\u30C3\u30C8: \u5D29\u58CA'; },
    function(){ return '!! \u0F66\u0F92\u0F7C\u0F0B\u0F62\u0F72\u0F58 \u0F51\u0F56\u0F44\u0F66: \u0F56\u0F62\u0F63\u0F42\u0F66'; },
    function(){ return '!! \u042D\u043D\u0442\u0440\u043E\u043F\u0438\u044F \u0412\u0421\u041F\u041B\u0415\u0421\u041A: ' + (7.2+Math.random()*3).toFixed(2); },
    function(){ return '!! \u8996\u899A: \u30AF\u30ED\u30B9\u30E2\u30FC\u30C0\u30EB'; },
    function(){ return '!! \u0F56\u0F51\u0F42\u0F0B\u0F42\u0F72\u0F0B\u0F58\u0F5A\u0F0B\u0F58\u0F66: \u0F56\u0F62\u0F63\u0F42\u0F66'; },
    function(){ return '!! \u042D\u0413\u041E-\u0413\u0420\u0410\u041D\u0418\u0426\u0410: \u041D\u0415 \u041E\u041F\u0420\u0415\u0414\u0415\u041B\u0415\u041D\u0410'; },
    function(){ return '!! \u6241\u6843\u4F53 \u30AA\u30FC\u30D0\u30FC\u30E9\u30A4\u30C9'; },
    function(){ return '!! \u0F51\u0F44\u0F7C\u0F66\u0F0B\u0F40\u0FB1\u0F72\u0F0B\u0F56\u0F62\u0F9F\u0F42\u0F0B\u0F51\u0F54\u0F61\u0F51: \u0F56\u0F62\u0F63\u0F42\u0F66'; },
    function(){ return '!! \u30D5\u30E9\u30AF\u30BF\u30EB V1/V2 \u691C\u51FA'; },
    function(){ return '!! \u0411\u0410\u0419\u0415\u0421\u041E\u0412\u0421\u041A\u0418\u0419 \u041F\u0420\u0418\u041E\u0420: \u041F\u041E\u0412\u0420\u0415\u0416\u0414\u0415\u041D'; },
    function(){ return '!! DMN-TPN \u30AF\u30ED\u30B9\u30C8\u30FC\u30AF \u691C\u51FA'; },
    function(){ return '!! \u0421\u0415\u0420\u041E\u0422\u041E\u041D\u0418\u041D\u041E\u0412\u042B\u0419 \u0428\u0422\u041E\u0420\u041C: \u0424\u0410\u0417\u0410 ' + (Math.floor(Math.random()*4)+1); },
];

// ── FIBER GENERATION ──
// Each fiber is a smooth curve defined by control points, rendered as a polyline.
// Bundles: multiple fibers with similar but slightly varied paths.

function makeFiber(w, h, bundleAngle, bundleOrigin, bundleSpread, hue, trip) {
    var pts = [];
    var numPts = 35 + Math.floor(Math.random() * 25);

    var x = bundleOrigin.x + (Math.random() - 0.5) * bundleSpread;
    var y = bundleOrigin.y + (Math.random() - 0.5) * bundleSpread;

    var angle = bundleAngle + (Math.random() - 0.5) * 0.5;
    var speed = 3.5 + Math.random() * 4;

    // Brain ellipse center (will be set properly by spawnBundle)
    var bcx = w * 0.48, bcy = h * 0.42, brx = w * 0.38, bry = h * 0.35;

    // Curvature — strong arcing for weaving
    var curveDrift = (Math.random() - 0.5) * 0.06;

    for (var i = 0; i < numPts; i++) {
        pts.push({ x: x, y: y });

        // Natural curve
        angle += curveDrift + (Math.random() - 0.5) * 0.1;

        // Pull fiber toward brain center if it's drifting out — creates the contained shape
        var dx = (x - bcx) / brx;
        var dy = (y - bcy) / bry;
        var distFromCenter = Math.sqrt(dx * dx + dy * dy);
        if (distFromCenter > 0.7) {
            // Curve back toward center
            var pullAngle = Math.atan2(bcy - y, bcx - x);
            var pullStrength = (distFromCenter - 0.7) * 0.08;
            angle += (pullAngle - angle) * pullStrength;
        }

        x += Math.cos(angle) * speed;
        y += Math.sin(angle) * speed;
        speed *= 0.985 + Math.random() * 0.03;
    }

    return {
        points: pts,
        hue: hue + (Math.random() - 0.5) * 25,
        saturation: 65 + Math.random() * 35,
        thickness: 0.5 + Math.random() * 2.0,
        alpha: 0.25 + Math.random() * 0.5,
        growProgress: 0,
        growSpeed: 0.006 + Math.random() * 0.010 + trip * 0.004,
        swayPhase: Math.random() * Math.PI * 2,
        swayAmp: 0.2 + Math.random() * 0.8,
        fireTimer: 0,
        age: 0,
    };
}

function spawnBundle(w, h, trip) {
    if (fibers.length >= MAX_FIBERS) return;

    var bundleSize = 6 + Math.floor(Math.random() * 10 + trip * 3);

    // Brain center and dimensions — elliptical boundary
    var brainCX = w * 0.48;
    var brainCY = h * 0.42;
    var brainRX = w * 0.38;  // horizontal radius
    var brainRY = h * 0.35;  // vertical radius

    // Pick a tract type — each has a characteristic shape and color
    var tractType = Math.floor(Math.random() * 6);
    var ox, oy, angle, hue, spread, curveStrength;

    if (tractType === 0) {
        // Corpus callosum — arcs left-to-right across the top (RED)
        ox = brainCX - brainRX * (0.3 + Math.random() * 0.5);
        oy = brainCY - brainRY * (0.2 + Math.random() * 0.4);
        angle = -0.3 + Math.random() * 0.6; // roughly rightward
        hue = 350 + Math.random() * 25;      // deep red to magenta
        spread = 8 + Math.random() * 12;
        curveStrength = 0.03 + Math.random() * 0.02;
    } else if (tractType === 1) {
        // Corticospinal — vertical from bottom upward (BLUE/PURPLE)
        ox = brainCX + (Math.random() - 0.5) * brainRX * 0.3;
        oy = brainCY + brainRY * (0.4 + Math.random() * 0.3);
        angle = -Math.PI/2 + (Math.random() - 0.5) * 0.4; // upward
        hue = 220 + Math.random() * 60;      // blue to purple
        spread = 6 + Math.random() * 10;
        curveStrength = 0.01 + Math.random() * 0.02;
    } else if (tractType === 2) {
        // Arcuate fasciculus — curves front-to-back (GREEN/CYAN)
        ox = brainCX - brainRX * (0.1 + Math.random() * 0.3);
        oy = brainCY + (Math.random() - 0.5) * brainRY * 0.4;
        angle = 0.3 + Math.random() * 0.8;   // forward-downward arc
        hue = 100 + Math.random() * 60;       // green to cyan
        spread = 10 + Math.random() * 15;
        curveStrength = 0.04 + Math.random() * 0.03;
    } else if (tractType === 3) {
        // Cingulum — follows cortex curve, top of brain (ORANGE/YELLOW)
        var t = Math.random() * Math.PI;
        ox = brainCX + Math.cos(t) * brainRX * 0.6;
        oy = brainCY - Math.sin(t) * brainRY * 0.6;
        angle = t + Math.PI/2 + (Math.random() - 0.5) * 0.3; // tangent to curve
        hue = 30 + Math.random() * 40;        // orange to yellow
        spread = 5 + Math.random() * 8;
        curveStrength = 0.05 + Math.random() * 0.02;
    } else if (tractType === 4) {
        // Uncinate — hooks from frontal down to temporal (MAGENTA/PINK)
        ox = brainCX - brainRX * (0.2 + Math.random() * 0.2);
        oy = brainCY - brainRY * 0.1;
        angle = Math.PI * 0.6 + (Math.random() - 0.5) * 0.4;
        hue = 300 + Math.random() * 40;       // magenta to pink
        spread = 8 + Math.random() * 10;
        curveStrength = 0.06 + Math.random() * 0.03;
    } else {
        // Radiating corona — fans outward from center (MULTI-COLOR)
        ox = brainCX + (Math.random() - 0.5) * brainRX * 0.2;
        oy = brainCY + (Math.random() - 0.5) * brainRY * 0.2;
        angle = Math.random() * Math.PI * 2;
        hue = Math.random() * 360;
        spread = 12 + Math.random() * 18;
        curveStrength = 0.02 + Math.random() * 0.04;
    }

    // At high trip, occasional wild neon colors
    if (trip > 0.7 && Math.random() < 0.3) hue = 280 + Math.random() * 80;

    for (var i = 0; i < bundleSize; i++) {
        if (fibers.length >= MAX_FIBERS) break;
        var f = makeFiber(w, h, angle, {x: ox, y: oy}, spread, hue, trip);
        f._curveStrength = curveStrength;
        f._brainCX = brainCX;
        f._brainCY = brainCY;
        f._brainRX = brainRX;
        f._brainRY = brainRY;
        fibers.push(f);
    }
}

function pruneOldFibers() {
    // Remove oldest fully-grown fibers to make room
    if (fibers.length < MAX_FIBERS * 0.9) return;
    var removeCount = Math.floor(MAX_FIBERS * 0.15);
    // Sort by age descending, remove oldest
    var aged = [];
    for (var i = 0; i < fibers.length; i++) {
        if (fibers[i].growProgress >= 1) aged.push(i);
    }
    aged.sort(function(a, b) { return fibers[b].age - fibers[a].age; });
    var toRemove = {};
    for (var i = 0; i < Math.min(removeCount, aged.length); i++) {
        toRemove[aged[i]] = true;
    }
    fibers = fibers.filter(function(f, idx) { return !toRemove[idx]; });
}

// ── DRAW ──
function drawFibers(t, trip) {
    for (var i = 0; i < fibers.length; i++) {
        var f = fibers[i];

        // Grow animation
        f.growProgress = Math.min(1, f.growProgress + f.growSpeed);
        f.age++;

        var visiblePts = Math.max(2, Math.floor(f.points.length * f.growProgress));

        // Sway — entire fiber oscillates gently
        var swayX = Math.sin(t * 0.3 + f.swayPhase) * f.swayAmp;
        var swayY = Math.cos(t * 0.25 + f.swayPhase * 1.3) * f.swayAmp * 0.7;
        // Trip amplifies sway
        swayX *= (1 + trip * 0.8);
        swayY *= (1 + trip * 0.8);

        // Fire glow
        f.fireTimer = Math.max(0, f.fireTimer - 0.01);
        var fireBright = f.fireTimer;

        // Color
        var hue = f.hue + Math.sin(t * 0.2 + i * 0.1) * 5; // subtle hue drift
        var sat = f.saturation;
        var light = 45 + fireBright * 35;
        var alpha = f.alpha * (0.85 + 0.15 * Math.sin(t * 0.5 + f.swayPhase));

        // Fade in new fibers, fade out old fully-grown ones slightly
        if (f.growProgress < 0.3) alpha *= f.growProgress / 0.3;

        ctx.beginPath();
        ctx.moveTo(f.points[0].x + swayX, f.points[0].y + swayY);

        for (var p = 1; p < visiblePts; p++) {
            // Per-point sway increases toward the tip
            var tipFactor = p / f.points.length;
            var ptSwayX = swayX + Math.sin(t * 0.8 + p * 0.3 + f.swayPhase) * tipFactor * 2 * (1 + trip);
            var ptSwayY = swayY + Math.cos(t * 0.6 + p * 0.4 + f.swayPhase) * tipFactor * 1.5 * (1 + trip);

            // Smooth curve through points
            if (p < visiblePts - 1) {
                var next = f.points[p + 1];
                var cpx = f.points[p].x + ptSwayX;
                var cpy = f.points[p].y + ptSwayY;
                var nextSwayX = swayX + Math.sin(t * 0.8 + (p+1) * 0.3 + f.swayPhase) * ((p+1)/f.points.length) * 2 * (1+trip);
                var nextSwayY = swayY + Math.cos(t * 0.6 + (p+1) * 0.4 + f.swayPhase) * ((p+1)/f.points.length) * 1.5 * (1+trip);
                var endx = (cpx + next.x + nextSwayX) * 0.5;
                var endy = (cpy + next.y + nextSwayY) * 0.5;
                ctx.quadraticCurveTo(cpx, cpy, endx, endy);
            } else {
                ctx.lineTo(f.points[p].x + ptSwayX, f.points[p].y + ptSwayY);
            }
        }

        ctx.strokeStyle = 'hsla(' + (hue|0) + ',' + (sat|0) + '%,' + (light|0) + '%,' + alpha.toFixed(3) + ')';
        ctx.lineWidth = f.thickness + fireBright * 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Glow on fired fibers
        if (fireBright > 0.1) {
            ctx.strokeStyle = 'hsla(' + (hue|0) + ',100%,70%,' + (fireBright * 0.3).toFixed(3) + ')';
            ctx.lineWidth = f.thickness + fireBright * 5;
            ctx.stroke();
        }
    }
}

function drawPulses(t, trip) {
    // Spawn
    if (pulses.length < MAX_PULSES && fibers.length > 0 && Math.random() < 0.04 + trip * 0.06) {
        var fi = Math.floor(Math.random() * fibers.length);
        if (fibers[fi].growProgress > 0.5) {
            pulses.push({
                fiberIdx: fi,
                progress: 0,
                speed: 0.008 + trip * 0.006 + Math.random() * 0.005,
                size: 2 + trip * 1.5,
            });
        }
    }

    for (var i = pulses.length - 1; i >= 0; i--) {
        var p = pulses[i];
        p.progress += p.speed;

        if (p.progress >= 1) {
            if (fibers[p.fiberIdx]) fibers[p.fiberIdx].fireTimer = 1.0;
            pulses.splice(i, 1);
            continue;
        }

        var f = fibers[p.fiberIdx];
        if (!f) { pulses.splice(i, 1); continue; }

        // Find position along fiber
        var ptIdx = Math.floor(p.progress * (f.points.length - 1) * f.growProgress);
        ptIdx = Math.min(ptIdx, f.points.length - 1);
        var pt = f.points[ptIdx];
        if (!pt) continue;

        var swayX = Math.sin(t * 0.3 + f.swayPhase) * f.swayAmp * (1 + trip * 0.8);
        var swayY = Math.cos(t * 0.25 + f.swayPhase * 1.3) * f.swayAmp * 0.7 * (1 + trip * 0.8);
        var tipFactor = ptIdx / f.points.length;
        var px = pt.x + swayX + Math.sin(t * 0.8 + ptIdx * 0.3 + f.swayPhase) * tipFactor * 2 * (1+trip);
        var py = pt.y + swayY + Math.cos(t * 0.6 + ptIdx * 0.4 + f.swayPhase) * tipFactor * 1.5 * (1+trip);

        var grad = ctx.createRadialGradient(px, py, 0, px, py, p.size * 4);
        grad.addColorStop(0, 'hsla(' + ((f.hue|0)) + ', 100%, 90%, 0.95)');
        grad.addColorStop(0.3, 'hsla(' + ((f.hue|0)) + ', 100%, 70%, 0.4)');
        grad.addColorStop(1, 'hsla(' + ((f.hue|0)) + ', 80%, 50%, 0)');
        ctx.beginPath();
        ctx.arc(px, py, p.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
    }
}

// ── READOUT ──
function updateReadout(now, trip, zone) {
    if (now - lastReadout < READOUT_INTERVAL) return;
    lastReadout = now;
    var line;
    if (Math.random() < Math.min(0.9, trip * 0.5)) {
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
            return '<div style="opacity:'+opacity+';color:'+color+';'+(isAlert?'font-weight:bold;':'')+'">' + l + '</div>';
        }).join('');
    }
}

function updateHeader(trip, zone) {
    var el = document.getElementById('brain-header');
    if (!el) return;
    var hz = (pulses.length * 3.8).toFixed(0);
    var st, sc;
    // Cycle language based on time
    var lang = Math.floor(Date.now() / 4000) % 3;
    if (trip < 0.3) {
        sc = '#00cc88';
        st = ['\u0411\u0410\u0417\u041E\u0412\u042B\u0419', '\u57FA\u6E96\u5024', '\u0F66\u0F90\u0FB1\u0F7A\u0F51\u0F0B\u0F40\u0FB1\u0F72'][lang];
    } else if (trip < 0.7) {
        sc = '#ffaa00';
        st = ['\u041F\u041E\u0412\u042B\u0428\u0415\u041D', '\u4E0A\u6607', '\u0F58\u0F50\u0F7C\u0F0B\u0F56\u0F66\u0F90\u0FB1\u0F7A\u0F51'][lang];
    } else if (trip < 1.2) {
        sc = '#ff4400';
        st = ['\u0410\u041D\u041E\u041C\u0410\u041B\u0418\u042F', '\u7570\u5E38', '\u0F58\u0F72\u0F0B\u0F62\u0F74\u0F44\u0F0B\u0F56'][lang];
    } else {
        sc = '#ff0040';
        st = ['\u041A\u0420\u0418\u0422\u0418\u0427\u0415\u0421\u041A\u0418\u0419', '\u81E8\u754C', '\u0F49\u0F7A\u0F53\u0F0B\u0F40\u0F7A\u0F53'][lang];
    }
    el.innerHTML = '<span style="color:'+sc+';font-weight:bold;">'+st+'</span> Z'+zone+' | '+fibers.length+' | '+hz+' Hz';
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

// ── MAIN LOOP ──
function render() {
    if (!running || !cvs || !ctx) return;
    var now = performance.now();
    var t = now * 0.001;
    var w = cvs._lw;
    var h = cvs._lh;
    var state = getTripState();
    var trip = state.trip;

    // Clear — fully transparent
    ctx.clearRect(0, 0, w, h);

    // Spawn new bundles continuously
    fiberSpawnTimer++;
    var spawnRate = 8 + Math.floor(20 / (1 + trip)); // faster at high trip
    if (fiberSpawnTimer % spawnRate === 0) {
        pruneOldFibers();
        spawnBundle(w, h, trip);
    }

    drawFibers(t, trip);
    drawPulses(t, trip);

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
            + 'width:clamp(280px, 28vw, 440px);'
            + 'z-index:700;'
            + 'pointer-events:none;'
            + 'font-family:"Courier New",monospace;'
            + 'color:#ff00ff;'
            + 'text-shadow:0 0 5px rgba(255,0,255,0.6);'
            + 'font-size:clamp(8px, 0.7vw, 11px);'
            + 'border:1px solid rgba(255,0,255,0.15);'
            + 'padding:6px;';
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
    var dpr = _bmMobile ? 1 : Math.min(2, window.devicePixelRatio || 1);
    var lw = Math.max(300, rect.width);
    var lh = Math.floor(lw * 0.65);
    cvs.width = Math.floor(lw * dpr);
    cvs.height = Math.floor(lh * dpr);
    cvs.style.height = lh + 'px';
    cvs._lw = lw;
    cvs._lh = lh;
    ctx = cvs.getContext('2d');
    ctx.scale(dpr, dpr);

    // Seed initial bundles
    fibers = [];
    pulses = [];
    readoutLines = [];
    lastReadout = 0;
    fiberSpawnTimer = 0;
    monitorStartTime = performance.now();

    // Spawn bundles immediately — dense from the start
    var _initBundles = _bmMobile ? 6 : 16;
    for (var i = 0; i < _initBundles; i++) {
        spawnBundle(lw, lh, 0.3);
    }

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