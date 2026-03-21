/* engine2.js */

window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules['zone2_hallway'] = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_camZ;
uniform float u_blink;
uniform float u_shake; 
uniform float u_isWalking;
uniform float u_trip;

uniform sampler2D u_texFront;
uniform sampler2D u_texBack;
uniform sampler2D u_texLeft;
uniform sampler2D u_texRight;
uniform sampler2D u_texTop;
uniform sampler2D u_texBottom;
uniform sampler2D u_texDoorLeft;
uniform sampler2D u_texDoorRight;
uniform sampler2D u_voidVid;    

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}
float _hh(float x){ return fract(sin(x*127.1)*43758.5453); }
float _hh2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    float trip = clamp(u_trip, 0.0, 2.0);
    
    // ── LIQUID WARP — scales with trip, not just a tiny fixed amount ──
    float warpAmp = 0.004 + trip * 0.012;
    float liquidX = sin(uv.y * 12.0 + u_time * 0.4) * warpAmp + cos(uv.x * 10.0 - u_time * 0.3) * warpAmp * 0.75;
    float liquidY = cos(uv.x * 14.0 + u_time * 0.3) * warpAmp + sin(uv.y * 11.0 - u_time * 0.4) * warpAmp * 0.75;
    // Audio shake amplifies
    liquidX += sin(u_time * 30.0) * 0.01 * u_shake;
    liquidY += cos(u_time * 25.0) * 0.01 * u_shake;
    // Trip adds a slower, sicker oscillation layer
    liquidX += sin(uv.y * 3.0 + u_time * 0.15) * trip * 0.008;
    liquidY += cos(uv.x * 4.0 - u_time * 0.12) * trip * 0.006;
    
    // ── GLITCH SCANLINE — random horizontal UV tears ──
    float gTick = floor(u_time * 14.0);
    float glitchProb = 0.985 - trip * 0.04;
    if(step(glitchProb, _hh(gTick * 133.77)) > 0.0) {
        float bandY = floor(uv.y * mix(8.0, 25.0, _hh(gTick * 2.1)));
        liquidX += (_hh(bandY + gTick) - 0.5) * 0.15 * trip;
    }

    vec3 box = vec3(0.5625, 1.0, 3.5); 
    
    float bobX = sin(u_time * 2.5) * 0.006 * u_isWalking;
    float bobY = cos(u_time * 5.0) * 0.008 * u_isWalking;
    vec3 ro = vec3(bobX, bobY, u_camZ);
    vec3 rd = normalize(vec3(uv.x + liquidX, uv.y + liquidY, 1.0));
    
    vec2 m = u_mouse * 0.35;
    rd.yz *= rot(m.y * 0.8);
    rd.xz *= rot(m.x);
    
    vec3 safeRd = max(abs(rd), vec3(0.0001)) * sign(rd);
    vec3 tPos = (box * sign(safeRd) - ro) / safeRd;
    float t = min(min(tPos.x, tPos.y), tPos.z);
    vec3 pos = ro + rd * t;
    vec3 nPos = pos / box;
    vec3 absPos = abs(nPos);
    
    vec4 hallTex;
    vec2 tileUV;
    int wallID = -1;
    if (absPos.x > absPos.y && absPos.x > absPos.z) {
        if (nPos.x > 0.0) { 
            tileUV = vec2(-nPos.z, -nPos.y) * 0.5 + 0.5;
            hallTex = texture2D(u_texRight, tileUV);
            wallID = 1;
        } else { 
            tileUV = vec2(nPos.z, -nPos.y) * 0.5 + 0.5;
            hallTex = texture2D(u_texLeft, tileUV);
            wallID = 0;
        }
    } else if (absPos.y > absPos.x && absPos.y > absPos.z) {
        wallID = 4;
        if (nPos.y > 0.0) { 
            tileUV = vec2(nPos.x, -nPos.z) * 0.5 + 0.5;
            hallTex = texture2D(u_texTop, tileUV);
        } else { 
            tileUV = vec2(nPos.x, nPos.z) * 0.5 + 0.5;
            hallTex = texture2D(u_texBottom, tileUV);
        }
    } else {
        if (nPos.z > 0.0) { 
            tileUV = vec2(nPos.x, -nPos.y) * 0.5 + 0.5;
            hallTex = texture2D(u_texFront, tileUV);
            wallID = 2;
        } else { 
            tileUV = vec2(-nPos.x, -nPos.y) * 0.5 + 0.5;
            hallTex = texture2D(u_texBack, tileUV);
            wallID = 3;
        }
    }
    
    vec3 finalCol = hallTex.rgb;
    bool isCutout = hallTex.a < 0.1 || (hallTex.g > 0.4 && hallTex.r < 0.25 && hallTex.b < 0.25);
    float outAlpha = 1.0;
    
    if (isCutout && wallID != 4) {
        vec2 vuv = gl_FragCoord.xy / u_resolution.xy;
        if (wallID == 2) {
            outAlpha = 0.0;
            finalCol = vec3(0.0);
        } else if (wallID == 0) {
            finalCol = texture2D(u_texDoorLeft, vuv).rgb;
        } else if (wallID == 1) {
            finalCol = texture2D(u_texDoorRight, vuv).rgb;
        }
    }
    
    if (wallID == 4 && isCutout) finalCol = vec3(0.0);
    
    // ── FOG — thicker with trip, more oppressive ──
    float fogThickness = 0.5 + trip * 0.15;
    float fogFactor = exp(-t * fogThickness);
    vec3 fogColor = vec3(0.02, 0.03, 0.04);
    // Trip shifts fog toward sickly green-brown
    fogColor = mix(fogColor, vec3(0.04, 0.03, 0.01), trip * 0.3);
    finalCol = mix(fogColor, finalCol, fogFactor);
    
    // ── EERIE TINT — desaturate + shift to cold/warm based on trip ──
    float lum = dot(finalCol, vec3(0.299, 0.587, 0.114));
    vec3 eerieTint = vec3(lum * 0.75, lum * 0.9, lum * 1.1); 
    finalCol = mix(finalCol, eerieTint, 0.4 + trip * 0.15);
    
    // ── EMERGENCY LIGHT FLICKER — faint red pulse on floor ──
    float floorGlow = smoothstep(-0.3, -0.8, nPos.y) * (0.4 + 0.6 * sin(u_time * 1.3 + pos.z * 0.4));
    finalCol += vec3(0.08, 0.01, 0.005) * floorGlow * (0.3 + trip * 0.4);
    
    // ── LIGHT FLICKER — random brightness drops ──
    float flicker = 1.0 - step(0.97, _hh(floor(u_time * 12.0) * 7.3)) * 0.3 * trip;
    finalCol *= flicker;

    float vignette = smoothstep(1.3, 0.2, length(uv));
    finalCol *= vignette;
    finalCol *= 0.65;
    
    gl_FragColor = vec4(finalCol * (1.0 - u_blink), outAlpha);
}
`;

if (!GLSL.modules['z2_seq_hole']) {
    GLSL.modules['z2_seq_hole'] = `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform sampler2D u_tex;
    void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        gl_FragColor = texture2D(u_tex, uv); 
    }
    `;
}

class Zone2RoomMode {
    constructor(fragKey, texPath) {
        this.prog = gl.createProgram();
        
        const roomWarpVert = `
        attribute vec2 p;
        uniform float u_time;
        uniform float u_trip;
        uniform float u_shake;
        void main() {
            vec2 pos = p;
            float warpX = sin(pos.y * 6.0 + u_time * 1.5) * 0.015 * u_trip;
            float warpY = cos(pos.x * 6.0 + u_time * 1.8) * 0.015 * u_trip;
            pos += vec2(warpX, warpY);
            pos.x += sin(u_time * 30.0) * 0.015 * u_shake;
            pos.y += cos(u_time * 37.0) * 0.015 * u_shake;
            gl_Position = vec4(pos, 0.0, 1.0);
        }
        `;
        
        gl.attachShader(this.prog, compile(gl.VERTEX_SHADER, roomWarpVert));
        gl.attachShader(this.prog, compile(gl.FRAGMENT_SHADER, GLSL.modules[fragKey]));
        gl.linkProgram(this.prog);
        
        this.tex = loadStaticTex(texPath);

        this.bcTexGL = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.bcTexGL);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,255]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        this.U = {
            res: gl.getUniformLocation(this.prog, "u_resolution"),
            time: gl.getUniformLocation(this.prog, "u_time"),
            modeTime: gl.getUniformLocation(this.prog, "u_modeTime"),
            mouse: gl.getUniformLocation(this.prog, "u_mouse"),
            blink: gl.getUniformLocation(this.prog, "u_blink"),
            texEnv1: gl.getUniformLocation(this.prog, "u_texEnv1"),
            texEnv2: gl.getUniformLocation(this.prog, "u_texEnv2"),
            texEnv3: gl.getUniformLocation(this.prog, "u_texEnv3"),
            texEnv4: gl.getUniformLocation(this.prog, "u_texEnv4"),
            wake: gl.getUniformLocation(this.prog, "u_wake"),
            windowTex: gl.getUniformLocation(this.prog, "u_windowTex"),
            bcTex: gl.getUniformLocation(this.prog, "u_bcTex"),
            trip: gl.getUniformLocation(this.prog, "u_trip"),
            shake: gl.getUniformLocation(this.prog, "u_shake"),
            flash: gl.getUniformLocation(this.prog, "u_flash"),
            audio: gl.getUniformLocation(this.prog, "u_audio"),
            modeSeed: gl.getUniformLocation(this.prog, "u_modeSeed")
        };
    }
    
    render(now, cx, cy, blink, windowFBOTex, shake, flash, audioIntensity, trip, modeSeed) {
        gl.useProgram(this.prog);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.tex);
        if (this.U.texEnv1 !== null) gl.uniform1i(this.U.texEnv1, 0);

        if (windowFBOTex) {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, windowFBOTex);
            if (this.U.windowTex !== null) gl.uniform1i(this.U.windowTex, 1);
            if (this.U.texEnv2 !== null) gl.uniform1i(this.U.texEnv2, 1);
            if (this.U.texEnv3 !== null) gl.uniform1i(this.U.texEnv3, 1);
            if (this.U.texEnv4 !== null) gl.uniform1i(this.U.texEnv4, 1);
        }

        if (this.U.bcTex !== null) {
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, this.bcTexGL);
            try {
                if (window.bcCanvas && window.bcCanvas.width > 0) {
                    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, window.bcCanvas);
                }
            } catch(e) {}
            gl.uniform1i(this.U.bcTex, 2);
        }
        
        const cvs = document.getElementById('c');
        gl.uniform2f(this.U.res, cvs ? cvs.width : window.innerWidth, cvs ? cvs.height : window.innerHeight);
        gl.uniform1f(this.U.time, now * 0.001);
        gl.uniform2f(this.U.mouse, cx, cy);
        gl.uniform1f(this.U.blink, blink);
        
        if (this.U.modeTime !== null) gl.uniform1f(this.U.modeTime, now * 0.001);
        if (this.U.wake !== null) gl.uniform1f(this.U.wake, 1.0);
        if (this.U.trip !== null) gl.uniform1f(this.U.trip, trip || 0.0);
        if (this.U.shake !== null) gl.uniform1f(this.U.shake, shake || 0.0);
        if (this.U.flash !== null) gl.uniform1f(this.U.flash, flash || 0.0);
        if (this.U.audio !== null) gl.uniform1f(this.U.audio, audioIntensity || 0.0);
        if (this.U.modeSeed !== null) gl.uniform1f(this.U.modeSeed, modeSeed || 0.0);
        
        if (!this.quadBuffer) {
            this.quadBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        
        const loc = gl.getAttribLocation(this.prog, "p");
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    
    destroy() {
        gl.deleteTexture(this.tex);
        gl.deleteTexture(this.bcTexGL);
        gl.deleteProgram(this.prog);
        if (this.quadBuffer) gl.deleteBuffer(this.quadBuffer);
    }
}

window.z2SpaceHeld = window.z2SpaceHeld || false;
window.z2TouchHeld = window.z2TouchHeld || false;

// Shared mobile walk zone — bottom centre of screen, consistent across all zones
window.__mobileWalkZoneContains = window.__mobileWalkZoneContains || function(x, y) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return y >= h * 0.68 && x >= w * 0.30 && x <= w * 0.70;
};

window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        e.preventDefault(); 
        window.z2SpaceHeld = true;
        if (window.currentZone2 && window.currentZone2.voidVid) {
            window.currentZone2.voidVid.play().catch(()=>{});
        }
    }
});
window.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
        e.preventDefault();
        window.z2SpaceHeld = false;
    }
});

function checkZ2Touch(e) {
    if (!e.touches) return;
    if (!window.currentZone2 || window.currentZone2.isDead) return;
    let isWalking = false;
    const inWalkZone = window.__mobileWalkZoneContains;
    for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (inWalkZone(t.clientX, t.clientY)) isWalking = true;
    }
    window.z2TouchHeld = isWalking;
    if (isWalking && window.currentZone2.voidVid && window.currentZone2.voidVid.paused) {
        let p = window.currentZone2.voidVid.play();
        if (p !== undefined) p.catch(() => {});
    }
}

window.addEventListener("touchstart", checkZ2Touch, {passive: true});
window.addEventListener("touchmove", checkZ2Touch, {passive: true});
window.addEventListener("touchend", checkZ2Touch, {passive: true});
window.addEventListener("touchcancel", () => { window.z2TouchHeld = false; });

class Zone2Engine {
    constructor() {
        this.prog = buildProgram('zone2_hallway');
        gl.useProgram(this.prog);
        this.U = {
            res: gl.getUniformLocation(this.prog, "u_resolution"),
            time: gl.getUniformLocation(this.prog, "u_time"),
            mouse: gl.getUniformLocation(this.prog, "u_mouse"),
            camZ: gl.getUniformLocation(this.prog, "u_camZ"),
            blink: gl.getUniformLocation(this.prog, "u_blink"),
            shake: gl.getUniformLocation(this.prog, "u_shake"),
            isWalking: gl.getUniformLocation(this.prog, "u_isWalking"),
            trip: gl.getUniformLocation(this.prog, "u_trip")
        };
        
        gl.uniform1i(gl.getUniformLocation(this.prog, "u_texFront"), 0);
        gl.uniform1i(gl.getUniformLocation(this.prog, "u_texBack"), 1);
        gl.uniform1i(gl.getUniformLocation(this.prog, "u_texLeft"), 2);
        gl.uniform1i(gl.getUniformLocation(this.prog, "u_texRight"), 3);
        gl.uniform1i(gl.getUniformLocation(this.prog, "u_texTop"), 4);
        gl.uniform1i(gl.getUniformLocation(this.prog, "u_texBottom"), 5);
        gl.uniform1i(gl.getUniformLocation(this.prog, "u_texDoorLeft"), 7);
        gl.uniform1i(gl.getUniformLocation(this.prog, "u_texDoorRight"), 8);
        gl.uniform1i(gl.getUniformLocation(this.prog, "u_voidVid"), 6);
        
        this.texFront = loadStaticTex("files/img/rooms/hallway/FORWARD.png"); 
        this.texBack = loadStaticTex("files/img/rooms/hallway/BACK.png"); 
        this.texLeft = loadStaticTex("files/img/rooms/hallway/LEFTWALL.png"); 
        this.texRight = loadStaticTex("files/img/rooms/hallway/RIGHTWALL.png"); 
        this.texTop = loadStaticTex("files/img/rooms/hallway/TOP.png"); 
        this.texBottom = loadStaticTex("files/img/rooms/hallway/GROUND.png");

        this.texVoidVid = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texVoidVid);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,255]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        
        this.voidVid = document.createElement('video');
        this.voidVid.muted = true;
        this.voidVid.playsInline = true;
        this.voidVid.loop = true;
        this.voidVid.preload = "auto";
        this.voidVid.setAttribute("playsinline", "");
        this.voidVid.setAttribute("webkit-playsinline", "");
        this.voidVid.src = "files/mov/bh3.webm";
        // Register with global video pool so iOS unlock applies
        if (window.__ALL_VIDEOS) window.__ALL_VIDEOS.push(this.voidVid);
        this.voidVid.play().catch(() => {});
        // Fallback: if play was blocked, retry when browser says it can play
        this.voidVid.addEventListener('canplay', () => {
            if (this.voidVid.paused) this.voidVid.play().catch(() => {});
        }, { once: false });
        
        this.START_Z = -3.4;
        this.camZ = this.START_Z;               
        this.INTERSECTION_Z = 2.4; 
        this.intersectionReached = false;

        this.leftRoom = GLSL.modules['z2_room_left'] ? new Zone2RoomMode('z2_room_left', "files/img/rooms/bathroom.png") : null;
        this.rightRoom = GLSL.modules['z2_room_right'] ? new Zone2RoomMode('z2_room_right', "files/img/rooms/bedrooom.png") : null;

        this.activePOV = 'center';
        this.pendingPOV = null;
        this.slideState = 'idle';
        this.slideStart = 0;
        this.slideDir = 0;
        this.slideOffset = 0;
        this.povSwitchTime = -9999;

        const cvs = document.getElementById('c');
        this.lastCvsW = cvs ? cvs.width : window.innerWidth;
        this.lastCvsH = cvs ? cvs.height : window.innerHeight;

        this.cx = 0;
        this.cy = 0;
        this.lastRenderTime = performance.now();
        this.seqState = 'initial';
        this.leftBlinkCount = 0;
        
        this.texBathroomBlood = loadStaticTex("files/img/rooms/bathroom-blood.png");
        this.texBathroomHole = loadStaticTex("files/img/rooms/bathroom-hole.png");

        this.holeProg = gl.createProgram();
        gl.attachShader(this.holeProg, compile(gl.VERTEX_SHADER, GLSL.vert));
        gl.attachShader(this.holeProg, compile(gl.FRAGMENT_SHADER, GLSL.modules['z2_seq_hole']));
        gl.linkProgram(this.holeProg);
        
        this.solidProg = gl.createProgram();
        gl.attachShader(this.solidProg, compile(gl.VERTEX_SHADER, GLSL.vert));
        gl.attachShader(this.solidProg, compile(gl.FRAGMENT_SHADER, `precision mediump float; uniform vec4 u_col; void main(){ gl_FragColor = u_col; }`));
        gl.linkProgram(this.solidProg);

        this.windowFBO = this.makeFBO();
        this.holeFBO = this.makeFBO();
        this.mirrorFBO = this.makeFBO();

        this.blankMask = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.blankMask);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255,255,255,255]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        this.noWindowTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.noWindowTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,0]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        this.mode9_T_create = performance.now();
        this.mode9_T_hole = -1; 
        if (typeof ActiveMode !== 'undefined') {
            this.mode9 = new ActiveMode(9);
            this.mode9.maskTex = this.noWindowTex;
        }

        this.windowModes = [1, 2, 5, 6, 7];
        this.currentWindowModeIndex = Math.floor(Math.random() * this.windowModes.length);
        this.windowActiveMode = null;
        if (typeof ActiveMode !== 'undefined') {
            this.windowActiveMode = new ActiveMode(this.windowModes[this.currentWindowModeIndex]);
            this.windowActiveMode.maskTex = this.noWindowTex;
        }

        this.lastBlinkTime = performance.now();
        this.nextBlinkInterval = 4000 + Math.random() * 8000;
        this.blinking = false;
        this.blinkStart = 0;
        this.rBlink = 0;
        
        this.z2ModeSeed = Math.random() * 100.0;
        this.z2Trip = 0.2 + Math.random() * 1.5;
        this.modeSwapped = false;
        this.z2FractalSeed = Math.random() * 100.0;
        this.z2BlinkPeakTime = performance.now();

        this.redStartTime = -1;
        this.readyForZone3 = false;
        this.z3TransitionStarted = false;
        this.isDead = false;
    }

    makeFBO() {
        const cvs = document.getElementById('c');
        const w = cvs ? cvs.width : window.innerWidth;
        const h = cvs ? cvs.height : window.innerHeight;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return { fbo, tex };
    }

    _blitTex(tex, cWidth, cHeight) {
        gl.useProgram(this.holeProg);
        gl.disable(gl.BLEND);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(gl.getUniformLocation(this.holeProg, "u_tex"), 0);
        gl.uniform2f(gl.getUniformLocation(this.holeProg, "u_resolution"), cWidth, cHeight);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        const loc = gl.getAttribLocation(this.holeProg, "p");
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    drawOverlay(r, g, b, a) {
        if (a <= 0.0) return;
        gl.useProgram(this.solidProg);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform4f(gl.getUniformLocation(this.solidProg, "u_col"), r, g, b, a);
        
        if (!this.quadBuffer) {
            this.quadBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        const loc = gl.getAttribLocation(this.solidProg, "p");
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.disable(gl.BLEND);
    }

    beginSlide(targetPOV, direction) {
        if (this.slideState !== 'idle') return;
        this.pendingPOV = targetPOV;
        this.slideDir = direction;
        this.slideState = 'out';
        this.slideStart = window.lastNow || performance.now();
    }

    tickSlide(now) {
        if (this.slideState === 'idle') return;
        const elapsed = now - this.slideStart;
        const SLIDE_MS = 340;
        const EDGE_SNAP_MS = 80;
        
        if (this.slideState === 'out') {
            const t = Math.min(elapsed / SLIDE_MS, 1.0);
            this.slideOffset = (t * t) * window.innerWidth * this.slideDir;
            
            if (t >= 1.0) {
                this.slideOffset = window.innerWidth * this.slideDir;
                this.slideState = 'black';
                this.slideStart = now;
                this.activePOV = this.pendingPOV;
                
                if (this.seqState === 'blood' && this.activePOV === 'right') {
                    this.seqState = 'bedroom_visited';
                } else if (this.seqState === 'bedroom_visited' && this.activePOV === 'left') {
                    this.seqState = 'hole';
                    if (this.leftRoom) this.leftRoom.tex = this.texBathroomHole;
                    this.mode9_T_hole = performance.now();
                }

                window.dispatchEvent(new Event('mouseup'));
                window.dispatchEvent(new Event('touchend'));
                this.cx = 0;
                this.cy = 0;
                this.povSwitchTime = now;
            }
        } else if (this.slideState === 'black') {
            if (elapsed >= EDGE_SNAP_MS) {
                this.slideOffset = -window.innerWidth * this.slideDir;
                this.slideState = 'in';
                this.slideStart = now;
            }
        } else if (this.slideState === 'in') {
            const t = Math.min(elapsed / SLIDE_MS, 1.0);
            const ease = 1.0 - (1.0 - t) * (1.0 - t);
            this.slideOffset = -window.innerWidth * this.slideDir * (1.0 - ease);
            
            if (t >= 1.0) {
                this.slideOffset = 0;
                this.slideState = 'idle';
                this.pendingPOV = null;
            }
        }
        
        const cvs = document.getElementById('c');
        if (cvs) {
            cvs.style.transform = this.slideOffset !== 0 ? `translateX(${this.slideOffset.toFixed(1)}px)` : '';
        }
    }

    checkPOVThreshold(now, currentMx) {
        if (this.seqState === 'red') return;
        if (this.slideState !== 'idle') return;
        if ((now - this.povSwitchTime) < 600) return;
        if (this.activePOV === 'center') {
            if (!this.intersectionReached) return;
            if (currentMx >= 1.24) {
                this.beginSlide('left', +1);
            }
            else if (currentMx <= -1.24) {
                this.beginSlide('right', -1);
            }
        } else if (this.activePOV === 'left') {
            if (currentMx <= -1.14) {
                this.beginSlide('center', -1);
            }
        } else if (this.activePOV === 'right') {
            if (currentMx >= 1.14) {
                this.beginSlide('center', +1);
            }
        }
    }

    render(now, currentMx, currentMy, _ignoreAudio, _ignoreBlink, _ignoreFlash, _ignoreShake) {
        if (this.isDead) return;
        
        if (this.readyForZone3 && !this.z3TransitionStarted) {
            this.z3TransitionStarted = true;
            // WebGL red overlay already fills the screen — no CSS fade needed.
            // Destroy engine2 and start engine3 immediately while red is still up.
            this.destroy();
            if (typeof window.startZone3 === 'function') {
                window.startZone3();
            } else if (typeof Zone3Engine !== 'undefined') {
                window.currentZone3 = new Zone3Engine();
            }
            return;
        }
        
        let dt = now - this.lastRenderTime;
        if (dt > 100) dt = 16; 
        this.lastRenderTime = now;
        window.lastNow = now;

        if (window.butterchurnVisualizer) window.butterchurnVisualizer.render();
        if (typeof this.cx === 'undefined') { this.cx = currentMx; this.cy = currentMy; }
        this.cx += (currentMx - this.cx) * 0.12;
        this.cy += (currentMy - this.cy) * 0.12;

        let audioIntensity = 0;
        if (window.audioAnalyser) {
            window.audioAnalyser.getByteFrequencyData(window.audioData);
            let sum = 0;
            for (let i = 0; i < 6; i++) sum += window.audioData[i];
            audioIntensity = sum / (6 * 255);
        }

        let shake = audioIntensity * 0.1;

        // ── Composite neural intensity — exposed for brain monitor ──
        var seqBoost = 0;
        if (this.seqState === 'blood')    seqBoost = 0.4;
        if (this.seqState === 'hole')     seqBoost = 1.2;
        if (this.seqState === 'red')      seqBoost = 1.8;
        if (this.seqState === 'bedroom_visited') seqBoost = 0.2;
        // leftBlinkCount escalation — each bathroom visit ratchets it
        var visitBoost = Math.min(1.0, this.leftBlinkCount * 0.15);
        this.neuralIntensity = this.z2Trip + seqBoost + visitBoost + audioIntensity * 0.3;

        const cvs = document.getElementById('c');
        const cWidth = cvs ? cvs.width : window.innerWidth;
        const cHeight = cvs ? cvs.height : window.innerHeight;

        this.checkPOVThreshold(now, currentMx);
        this.tickSlide(now);
        
        if (now - this.lastBlinkTime > this.nextBlinkInterval) {
            this.blinking = true;
            this.blinkStart = now;
            this.lastBlinkTime = now;
            this.nextBlinkInterval = 4000 + Math.random() * 8000;
        }

        this.rBlink = 0.0;
        if (this.blinking) {
            let el = now - this.blinkStart;
            if (el < 120) {
                this.rBlink = el / 120;
            } else if (el < 200) {
                this.rBlink = 1.0;
                
                if (!this.modeSwapped) {
                    this.modeSwapped = true;
                    if (this.windowActiveMode) this.windowActiveMode.destroy();
                    this.currentWindowModeIndex = (this.currentWindowModeIndex + 1) % this.windowModes.length;
                    if (typeof ActiveMode !== 'undefined') {
                        this.windowActiveMode = new ActiveMode(this.windowModes[this.currentWindowModeIndex]);
                        this.windowActiveMode.maskTex = this.noWindowTex;
                    }
                    this.z2ModeSeed = Math.random() * 100.0;
                    this.z2Trip = 0.2 + Math.random() * 1.5;
                    this.z2FractalSeed = Math.random() * 100.0;
                    this.z2BlinkPeakTime = now;
                }
            } else if (el < 320) {
                this.rBlink = 1.0 - ((el - 200) / 120);
            } else {
                this.rBlink = 0.0;
                this.blinking = false;
                this.modeSwapped = false;

                if (this.activePOV === 'left' && this.seqState === 'initial') {
                    this.leftBlinkCount++;
                    if (this.leftBlinkCount >= 2) {
                        if (this.leftRoom) this.leftRoom.tex = this.texBathroomBlood;
                        this.seqState = 'blood';
                    }
                }
            }
        }

        if (this.lastCvsW !== cWidth || this.lastCvsH !== cHeight) {
            if (this.windowFBO) { gl.deleteTexture(this.windowFBO.tex); gl.deleteFramebuffer(this.windowFBO.fbo); this.windowFBO = this.makeFBO(); }
            if (this.holeFBO) { gl.deleteTexture(this.holeFBO.tex); gl.deleteFramebuffer(this.holeFBO.fbo); this.holeFBO = this.makeFBO(); }
            if (this.mirrorFBO) { gl.deleteTexture(this.mirrorFBO.tex); gl.deleteFramebuffer(this.mirrorFBO.fbo); this.mirrorFBO = this.makeFBO(); }
            this.lastCvsW = cWidth;
            this.lastCvsH = cHeight;
        }

        if (!this.quadBuffer) {
            this.quadBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1.0, -1.0, 3.0, -1.0, -1.0, 3.0]), gl.STATIC_DRAW);
        }

        if (this.activePOV === 'right' || this.activePOV === 'left') {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.windowFBO.fbo);
            gl.viewport(0, 0, cWidth, cHeight);
            gl.clearColor(0, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            
            if (this.windowActiveMode) {
                this.windowActiveMode.maskTex = this.noWindowTex;
                window.__tripAmount = this.z2Trip;
                this.windowActiveMode.render(now, 0, 0, audioIntensity, 0.0, 0, shake, 1.0, this.z2ModeSeed);
            }
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, cWidth, cHeight);
        }

        if (this.activePOV === 'left' && this.leftRoom) {
            
            if (this.rightRoom) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, this.mirrorFBO.fbo);
                gl.viewport(0, 0, cWidth, cHeight);
                gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);
                this.rightRoom.render(now, -this.cx, this.cy, 0.0, this.windowFBO.tex, shake, 0.0, audioIntensity, this.z2Trip, this.z2ModeSeed);
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.viewport(0, 0, cWidth, cHeight);
            }

            gl.clearColor(0, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);

            if (this.seqState === 'hole') {
                if (this.mode9 && this.holeFBO) {
                    gl.bindFramebuffer(gl.FRAMEBUFFER, this.holeFBO.fbo);
                    gl.viewport(0, 0, cWidth, cHeight);
                    gl.clearColor(0,0,0,1);
                    gl.clear(gl.COLOR_BUFFER_BIT);
                    
                    let spoofedNow = now;
                    if (this.mode9_T_hole > 0) {
                        spoofedNow = now - this.mode9_T_hole + this.mode9_T_create;
                    }

                    window.__tripAmount = this.z2Trip;
                    this.mode9.render(spoofedNow, 0, 0, audioIntensity, 0.0, 0, shake, 1.0, this.z2ModeSeed);
                    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                    gl.viewport(0, 0, cWidth, cHeight);

                    gl.useProgram(this.holeProg);
                    gl.disable(gl.BLEND);
                    
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, this.holeFBO.tex);
                    gl.uniform1i(gl.getUniformLocation(this.holeProg, "u_tex"), 0);
                    gl.uniform2f(gl.getUniformLocation(this.holeProg, "u_resolution"), cWidth, cHeight);

                    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
                    const locH = gl.getAttribLocation(this.holeProg, "p");
                    gl.enableVertexAttribArray(locH);
                    gl.vertexAttribPointer(locH, 2, gl.FLOAT, false, 0, 0);
                    gl.drawArrays(gl.TRIANGLES, 0, 3);

                    let elapsedHole = now - this.mode9_T_hole;
                    if (elapsedHole >= 4400) {
                        this.seqState = 'red';
                        this.redStartTime = now;
                        // Kill the plane: freeze holeFBO to black so nothing shows through the hole
                        gl.bindFramebuffer(gl.FRAMEBUFFER, this.holeFBO.fbo);
                        gl.clearColor(0,0,0,1);
                        gl.clear(gl.COLOR_BUFFER_BIT);
                        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                    }
                }

                // Painter layer 1: holeProg already blitted the plane above
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                this.leftRoom.render(now, this.cx, this.cy, 0.0, this.mirrorFBO.tex, shake, 0.0, audioIntensity, this.z2Trip, this.z2ModeSeed);
                gl.disable(gl.BLEND);
                if (typeof drawHallucinationOverlay === 'function')
                    drawHallucinationOverlay(now, this.z2Trip, this.z2FractalSeed, (now - this.z2BlinkPeakTime) * 0.001);

            } else if (this.seqState === 'red') {
                this.drawOverlay(0.0, 0.0, 0.0, 1.0);

                if (this.redStartTime > 0) {
                    let redElapsed = now - this.redStartTime;
                    let redAlpha = 0.0;

                    if (redElapsed < 400) {
                        redAlpha = redElapsed / 400.0;
                    } else if (redElapsed < 2000) {
                        redAlpha = 1.0 - ((redElapsed - 400) / 1600.0);
                    } else if (redElapsed < 4500) {
                        redAlpha = 0.0;
                    } else if (redElapsed < 6500) {
                        redAlpha = (redElapsed - 4500) / 2000.0;
                    } else {
                        redAlpha = 1.0;
                        if (redElapsed > 7000) {
                            this.readyForZone3 = true;
                        }
                    }

                    if (redAlpha > 0.001) {
                        this.drawOverlay(0.8, 0.0, 0.0, redAlpha);
                    }
                }

            } else {
                this._blitTex(this.mirrorFBO.tex, cWidth, cHeight);
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                this.leftRoom.render(now, this.cx, this.cy, 0.0, this.mirrorFBO.tex, shake, 0.0, audioIntensity, this.z2Trip, this.z2ModeSeed);
                gl.disable(gl.BLEND);
                
                if (this.seqState === 'blood') {
                    let throb = 0.5 + 0.5 * Math.sin(now * 0.001);
                    this.drawOverlay(0.05 * throb, 0.0, 0.0, 0.65);
                }
                if (typeof drawHallucinationOverlay === 'function')
                    drawHallucinationOverlay(now, this.z2Trip, this.z2FractalSeed, (now - this.z2BlinkPeakTime) * 0.001);
            }

            // Blink applied as top-level black overlay — works correctly over the painter composite
            if (this.rBlink > 0.001) this.drawOverlay(0.0, 0.0, 0.0, this.rBlink);
            
        } else if (this.activePOV === 'right' && this.rightRoom) {
            this.rightRoom.render(now, this.cx, this.cy, 0.0, this.windowFBO.tex, shake, 0.0, audioIntensity, this.z2Trip, this.z2ModeSeed);
            
            if (this.seqState === 'blood' || this.seqState === 'bedroom_visited' || this.seqState === 'hole' || this.seqState === 'red') {
                this.drawOverlay(0.0, 0.0, 0.05, 0.65);
            }
            if (typeof drawHallucinationOverlay === 'function')
                drawHallucinationOverlay(now, this.z2Trip, this.z2FractalSeed, (now - this.z2BlinkPeakTime) * 0.001);
            if (this.rBlink > 0.001) this.drawOverlay(0.0, 0.0, 0.0, this.rBlink);
            
        } else {
            gl.clearColor(0, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            
            let isWalkingFloat = 0.0;
            if (!this.intersectionReached && (window.z2SpaceHeld || window.z2TouchHeld)) {
                this.camZ += 0.04;
                isWalkingFloat = 1.0; 
                if (this.camZ >= this.INTERSECTION_Z) {
                    this.camZ = this.INTERSECTION_Z;
                    this.intersectionReached = true;
                    isWalkingFloat = 0.0;
                }
            }

            let progress = Math.max(0.0, Math.min(1.0, (this.camZ - this.START_Z) / (this.INTERSECTION_Z - this.START_Z)));
            if (window.__audioWetGain) window.__audioWetGain.gain.value = 0.7 * (1.0 - progress * 0.9);
            if (window.__audioDryGain) window.__audioDryGain.gain.value = 0.3 + (progress * 0.7);

            if (this.voidVid && this.voidVid.readyState >= 2) {
                gl.activeTexture(gl.TEXTURE6);
                gl.bindTexture(gl.TEXTURE_2D, this.texVoidVid);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.voidVid);
            }

            // Painter layer 1: video fills canvas — hallway renders on top with blend,
            // forward green portal is alpha=0 so video shows through at exact screen position.
            this._blitTex(this.texVoidVid, cWidth, cHeight);

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.useProgram(this.prog);
            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.texFront);
            gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.texBack);
            gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.texLeft);
            gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, this.texRight);
            gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, this.texTop);
            gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, this.texBottom);
            
            gl.activeTexture(gl.TEXTURE7); 
            gl.bindTexture(gl.TEXTURE_2D, (this.seqState === 'hole' || this.seqState === 'red') ? this.holeFBO.tex : this.mirrorFBO.tex);
            
            gl.activeTexture(gl.TEXTURE8); 
            gl.bindTexture(gl.TEXTURE_2D, this.windowFBO.tex);
            
            gl.uniform2f(this.U.res, cWidth, cHeight);
            gl.uniform1f(this.U.time, now * 0.001);
            gl.uniform2f(this.U.mouse, this.cx, this.cy);
            gl.uniform1f(this.U.camZ, this.camZ);
            gl.uniform1f(this.U.blink, this.rBlink);
            gl.uniform1f(this.U.shake, shake); 
            gl.uniform1f(this.U.isWalking, isWalkingFloat);
            gl.uniform1f(this.U.trip, this.z2Trip);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
            const loc = gl.getAttribLocation(this.prog, "p");
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            gl.disable(gl.BLEND);
            if (typeof drawHallucinationOverlay === 'function')
                drawHallucinationOverlay(now, this.z2Trip, this.z2FractalSeed, (now - this.z2BlinkPeakTime) * 0.001);
            if (this.rBlink > 0.001) this.drawOverlay(0.0, 0.0, 0.0, this.rBlink);
        }
    }

    destroy() {
        this.isDead = true; 
        
        const cvs = document.getElementById('c');
        if (cvs) cvs.style.transform = ''; 
        
        if (this.leftRoom) this.leftRoom.destroy();
        if (this.rightRoom) this.rightRoom.destroy();
        if (this.windowActiveMode) this.windowActiveMode.destroy();
        if (this.mode9) this.mode9.destroy();
        
        if (this.windowFBO) { gl.deleteTexture(this.windowFBO.tex); gl.deleteFramebuffer(this.windowFBO.fbo); }
        if (this.holeFBO) { gl.deleteTexture(this.holeFBO.tex); gl.deleteFramebuffer(this.holeFBO.fbo); }
        if (this.mirrorFBO) { gl.deleteTexture(this.mirrorFBO.tex); gl.deleteFramebuffer(this.mirrorFBO.fbo); }
        if (this.quadBuffer) gl.deleteBuffer(this.quadBuffer);
        if (this.blankMask) gl.deleteTexture(this.blankMask);
        if (this.noWindowTex) gl.deleteTexture(this.noWindowTex);
        
        if (this.voidVid) {
            this.voidVid.pause();
            this.voidVid.removeAttribute('src');
            try { this.voidVid.load(); } catch(e){}
        }
        
        gl.deleteTexture(this.texFront); gl.deleteTexture(this.texBack);
        gl.deleteTexture(this.texLeft); gl.deleteTexture(this.texRight);
        gl.deleteTexture(this.texTop); gl.deleteTexture(this.texBottom);
        gl.deleteTexture(this.texVoidVid); 
        
        gl.deleteProgram(this.holeProg); gl.deleteProgram(this.solidProg);
    }
}

window.startZone2 = function() {
    window.currentZone2 = new Zone2Engine();

    // voidVid was just added to __ALL_VIDEOS in Zone2Engine constructor.
    // Unlock now so it plays without needing a walk touch first.
    if (window.__unlockAllVideos) window.__unlockAllVideos();
    
    let fadeOverlay = document.getElementById("zone-fade-overlay");
    if (!fadeOverlay) {
        fadeOverlay = document.createElement("div");
        fadeOverlay.id = "zone-fade-overlay";
        fadeOverlay.style.cssText = "position:fixed;inset:0;background:black;pointer-events:none;transition:opacity 0.2s ease-in-out;z-index:99999;";
        document.body.appendChild(fadeOverlay);
    }
    
    fadeOverlay.style.opacity = "1";
    setTimeout(() => { fadeOverlay.style.opacity = "0"; }, 50);

    const checkStart = () => {
        if (!window.isEngine1Dead) {
            requestAnimationFrame(checkStart);
            return;
        }
        
        if (!window.__zone2Governor) {
            const IS_MOBILE = /Mobi|Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && window.innerWidth < 1024);
            const TARGET_FPS = IS_MOBILE ? 20 : 30;
            const FRAME_INTERVAL = 1000 / TARGET_FPS;
            let lastZ2Frame = 0;
            window.__zone2Governor = function(now) {
                requestAnimationFrame(window.__zone2Governor);
                if (now - lastZ2Frame < FRAME_INTERVAL) return;
                lastZ2Frame = now;
                if (window.currentZone2 && !window.currentZone2.isDead) {
                    window.currentZone2.render(now, window.mx || 0, window.my || 0, 0, 0, 0, 0);
                }
            };
            requestAnimationFrame(window.__zone2Governor);
        }
    };
    checkStart();
};