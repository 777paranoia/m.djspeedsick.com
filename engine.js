const canvas = document.getElementById("c");
const gl = canvas.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: true });
gl.getExtension("OES_texture_float") || gl.getExtension("OES_texture_half_float");

const fit = () => {
  const dpr = Math.min(2, devicePixelRatio || 1.0); 
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  gl.viewport(0, 0, canvas.width, canvas.height);
};
let lastWidth = innerWidth;
window.addEventListener("resize", () => { if (innerWidth !== lastWidth) { lastWidth = innerWidth; fit(); rebuildFBOs(); } else fit(); }); 
fit();

// --- STATIC ASSETS ---
const staticAssets = {};
function loadStaticTex(url) {
  const tex = gl.createTexture(); const img = new Image(); img.crossOrigin="anonymous";
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  }; img.src = url; return tex;
}

staticAssets.b1 = loadStaticTex(`files/img/void/building01.png`);
staticAssets.b2 = loadStaticTex(`files/img/void/building09.png`);
staticAssets.b3 = loadStaticTex(`files/img/void/building08.png`);
staticAssets.b4 = loadStaticTex(`files/img/void/building07.png`);
staticAssets.b5 = loadStaticTex(`files/img/void/building06.png`);
staticAssets.b6 = loadStaticTex(`files/img/void/building05.png`);
staticAssets.windowMask = loadStaticTex("files/img/void/canalport-mask.png");
staticAssets.oobMask = loadStaticTex("files/img/void/oob-mask.png");

// --- RAIN SIMULATION ---
const compile = (type, src) => {
  const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh);
  if(!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh));
  return sh;
};

const simProg = gl.createProgram();
gl.attachShader(simProg, compile(gl.VERTEX_SHADER, GLSL.vert));
gl.attachShader(simProg, compile(gl.FRAGMENT_SHADER, GLSL.sim));
gl.linkProgram(simProg);
gl.useProgram(simProg);
gl.uniform1i(gl.getUniformLocation(simProg,"u_window"), 7); gl.uniform1i(gl.getUniformLocation(simProg,"u_prev"), 6); 

let fbos = [], texs = [];
function makeFBO(){
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,canvas.width,canvas.height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return {fbo, tex};
}
function rebuildFBOs(){ fbos = [makeFBO(), makeFBO()]; texs = [fbos[0].tex, fbos[1].tex]; }
rebuildFBOs(); let ping = 0;

const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);

// --- THE JIT MODE CLASS ---
class ActiveMode {
    constructor(modeID) {
        this.id = modeID;
        this.textures = [];
        this.videoObj = null;
        
        const map = { 0: 'city', 1: 'fractal', 2: 'fractal', 3: 'bh', 4: 'mirror', 5: 'city', 6: 'ocean', 7: 'earth', 8: 'deadcity', 9: 'fly' };
        let fragKey = map[this.id];
        
        this.prog = gl.createProgram();
        gl.attachShader(this.prog, compile(gl.VERTEX_SHADER, GLSL.vert));
        gl.attachShader(this.prog, compile(gl.FRAGMENT_SHADER, GLSL.core + GLSL.modules[fragKey]));
        gl.linkProgram(this.prog);
        
        gl.useProgram(this.prog);
        
        gl.uniform1i(gl.getUniformLocation(this.prog,"u_texB1"), 0); gl.uniform1i(gl.getUniformLocation(this.prog,"u_texB2"), 1);
        gl.uniform1i(gl.getUniformLocation(this.prog,"u_texB3"), 2); gl.uniform1i(gl.getUniformLocation(this.prog,"u_texB4"), 3);
        gl.uniform1i(gl.getUniformLocation(this.prog,"u_texB5"), 4); gl.uniform1i(gl.getUniformLocation(this.prog,"u_texB6"), 5);
        gl.uniform1i(gl.getUniformLocation(this.prog,"u_water"), 6); gl.uniform1i(gl.getUniformLocation(this.prog,"u_texWindow"), 7); 
        gl.uniform1i(gl.getUniformLocation(this.prog,"u_texEnv1"), 8); gl.uniform1i(gl.getUniformLocation(this.prog,"u_texEnv2"), 9);
        
        this.U = {
            res: gl.getUniformLocation(this.prog,"u_resolution"), time: gl.getUniformLocation(this.prog,"u_time"),
            mouse: gl.getUniformLocation(this.prog,"u_mouse"), mode: gl.getUniformLocation(this.prog,"u_mode"),
            blink: gl.getUniformLocation(this.prog,"u_blink"), flash: gl.getUniformLocation(this.prog,"u_flash"),
            shake: gl.getUniformLocation(this.prog,"u_shake"), wake: gl.getUniformLocation(this.prog,"u_wake"),
            modeSeed: gl.getUniformLocation(this.prog,"u_modeSeed"), audio: gl.getUniformLocation(this.prog,"u_audio")
        };

        if (fragKey === 'city' || fragKey === 'fractal') {
            this.env1 = loadStaticTex("files/img/void/skyline.png");
            this.textures.push(this.env1);
        } else if (fragKey === 'mirror') {
            this.env1 = loadStaticTex("files/img/mirror.png");
            this.textures.push(this.env1);
        } else if (fragKey === 'ocean') {
            this.env1 = loadStaticTex("files/img/ocean.jpg");
            this.textures.push(this.env1);
        } else if (fragKey === 'deadcity') {
            this.env1 = this.loadVideo("files/mov/bh2.webm");
            this.env2 = loadStaticTex("files/img/deadcity.png");
            this.textures.push(this.env2);
        } else if (fragKey === 'bh') {
            this.env1 = this.loadVideo("files/mov/bh2.webm");
        } else if (fragKey === 'earth') {
            this.env1 = this.loadVideo("files/mov/earth.webm");
        } else if (fragKey === 'fly') {
            this.env1 = this.loadVideo("files/mov/fly.webm"); 
        }
    }
    
    loadVideo(srcFile) {
        const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
        const vid = document.createElement("video"); 
        vid.muted = true; vid.playsInline = true;
        vid.loop = !srcFile.includes("fly");
        const s = document.createElement("source"); s.src=srcFile; s.type="video/webm";
        vid.appendChild(s); vid.play().catch(()=>{});
        this.videoObj = vid;
        this.textures.push(tex);
        return tex;
    }

    render(now, mx, my, audioIntensity, blink, flash, shake, wakeVal, modeSeed) {
        gl.useProgram(this.prog);
        const loc = gl.getAttribLocation(this.prog, "p");
        gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        if (this.videoObj && this.videoObj.readyState >= 2) {
            gl.bindTexture(gl.TEXTURE_2D, this.env1);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.videoObj);
        }

        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, staticAssets.b1);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, staticAssets.b2);
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, staticAssets.b3);
        gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, staticAssets.b4);
        gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, staticAssets.b5);
        gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, staticAssets.b6);
        gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, texs[ping]); 
        gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, this.id === 5 ? staticAssets.oobMask : staticAssets.windowMask);

        if(this.env1) { gl.activeTexture(gl.TEXTURE8); gl.bindTexture(gl.TEXTURE_2D, this.env1); }
        if(this.env2) { gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, this.env2); }

        gl.uniform1f(this.U.audio, audioIntensity); gl.uniform2f(this.U.res, canvas.width, canvas.height); 
        gl.uniform1f(this.U.time, now*0.001); gl.uniform2f(this.U.mouse, mx, my); gl.uniform1i(this.U.mode, this.id); 
        gl.uniform1f(this.U.blink, blink); gl.uniform1f(this.U.flash, flash); gl.uniform1f(this.U.shake, shake); 
        gl.uniform1f(this.U.wake, wakeVal); gl.uniform1f(this.U.modeSeed, modeSeed);
        
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    destroy() {
        if (this.videoObj) { this.videoObj.pause(); this.videoObj.removeAttribute('src'); this.videoObj.load(); }
        for(let tex of this.textures) gl.deleteTexture(tex);
        gl.deleteProgram(this.prog);
    }
}

// --- STATE MACHINE & DRAG LOGIC ---
let currentEngine = null;
let mx=0,my=0,cx=0,cy=0,mode=0,blink=0,flash=0,shake=0, phase="sleeping",timer=-9999,start=0,lastNow=0,blinkCount=0,targetBlinks=1, modeSeed=0, lastMode=-1;

// Panorama state variables
let timerEdge = 0; 
const limitX = 0.65; const limitY = 0.50; let isDragging = false; let lastDragX = 0; let lastDragY = 0;

const startDrag = (x, y) => {
  if (window.activeScene !== 'main') return; // Ignore drag if side scene is active
  if (event && (event.target.id === 'secret-button' || event.target.closest('#conky-sidebar') || event.target.closest('#aboutOverlay'))) return;
  isDragging = true; lastDragX = x; lastDragY = y;
};
const doDrag = (x, y) => {
  if (!isDragging || window.activeScene !== 'main') return;
  mx -= ((x - lastDragX) / innerWidth) * 3.0; my -= ((y - lastDragY) / innerHeight) * 3.0;
  lastDragX = x; lastDragY = y; 
  mx = Math.max(-limitX, Math.min(limitX, mx)); my = Math.max(-limitY, Math.min(limitY, my));
};
const endDrag = () => { isDragging = false; };
window.addEventListener("mousedown", e => startDrag(e.clientX, e.clientY)); window.addEventListener("mousemove", e => doDrag(e.clientX, e.clientY)); window.addEventListener("mouseup", endDrag);
window.addEventListener("touchstart", e => startDrag(e.touches[0].clientX, e.touches[0].clientY), {passive: false}); window.addEventListener("touchmove", e => doDrag(e.touches[0].clientX, e.touches[0].clientY), {passive: false}); window.addEventListener("touchend", endDrag);

// Returns control from DOM to WebGL and bumps camera inward slightly so it doesn't instantly snap back
window.resetEngineToMain = function(fromSide) {
    window.activeScene = 'main';
    if (fromSide === 'right') mx = limitX - 0.2; 
    if (fromSide === 'left') mx = -limitX + 0.2;
    cx = mx; 
    timerEdge = 0;
};

function simStep(now){
  gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, texs[ping]);
  gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, staticAssets.windowMask); 
  const next = 1 - ping; gl.bindFramebuffer(gl.FRAMEBUFFER, fbos[next].fbo); gl.viewport(0,0,canvas.width,canvas.height);
  gl.useProgram(simProg); 
  const loc = gl.getAttribLocation(simProg, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(gl.getUniformLocation(simProg,"u_resolution"), canvas.width, canvas.height); gl.uniform1f(gl.getUniformLocation(simProg,"u_time"), now * 0.001); gl.uniform1f(gl.getUniformLocation(simProg,"u_dt"), Math.min((now - lastNow) * 0.001, 0.05));
  gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindFramebuffer(gl.FRAMEBUFFER, null); ping = next;
}

function isFractal(m) { return m === 1 || m === 2 || m === 6; }

function advanceMode(){
  let nextMode = mode; let attempts = 0;
  while((nextMode === mode || nextMode === lastMode || (isFractal(nextMode) && isFractal(mode))) && attempts < 20){ nextMode = Math.floor(Math.random() * 9); if (nextMode === 9) nextMode = 0; attempts++; }
  lastMode = mode; mode = nextMode; modeSeed++;
  targetBlinks = (isFractal(mode)) ? 2 : 1; blinkCount = 0;
  
  if(currentEngine) currentEngine.destroy();
  currentEngine = new ActiveMode(mode);
}

const trailIntensity = 0.85; 
function drawFadeQuad() {
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 1.0 - trailIntensity); gl.clear(gl.COLOR_BUFFER_BIT); gl.disable(gl.BLEND);
}

function render(now){
  let audioIntensity = 0;
  if (window.audioAnalyser) { window.audioAnalyser.getByteFrequencyData(window.audioData); let sum = 0; for (let i=0; i<6; i++) sum += window.audioData[i]; audioIntensity = sum / (6 * 255); }

  let wakeVal = 1.0; 
  if(phase === "sleeping"){
      wakeVal = 0.0;
      if(window.startSecretFlySequence && !currentEngine) { phase = "secret_fly"; mode = 9; currentEngine = new ActiveMode(9); }
      else if(window.startWakeSequence && !currentEngine){ phase = "waking"; start = now; currentEngine = new ActiveMode(mode); }
  } 
  else if(phase === "secret_fly"){
      wakeVal = 1.0;
      if (Math.random() < 0.05 && blink < 0.1) blink = 1.0;
      blink *= 0.85;
      
      if (currentEngine && currentEngine.videoObj && currentEngine.videoObj.readyState > 0) {
          if (currentEngine.videoObj.ended || currentEngine.videoObj.currentTime >= currentEngine.videoObj.duration - 0.1) {
              phase = "waking"; 
              start = now; 
              blink = 0.0; 
              if (window.unmuteMainAudio) window.unmuteMainAudio(); 
              advanceMode();
          }
      }
  } 
  else if(phase === "waking"){ let t = Math.min((now - start) / 3000, 1.0); wakeVal = 1.0 - Math.pow(1.0 - t, 3); if(t >= 1.0){ phase = "open"; timer = now; } }

  if(phase==="open" && now-timer>9000){ blinkCount++; if(blinkCount >= targetBlinks){ phase="closing_switch"; start=now; timer=now; } else { phase="closing_blink"; start=now; timer=now; } }
  else if(phase==="closing_blink"){ blink=Math.min((now-start)/160, 1); if(blink>=1){ phase="black_blink"; start=now; } }
  else if(phase==="black_blink" && now-start>120){ phase="opening_blink"; start=now; }
  else if(phase==="opening_blink"){ blink=1.0-Math.min((now-start)/160, 1); if(blink<=0){ phase="open"; timer=now; blink=0; } }
  else if(phase==="closing_switch"){ blink=Math.min((now-start)/160, 1); if(blink>=1){ phase="black_switch"; start=now; advanceMode(); } }
  else if(phase==="black_switch" && now-start>200){ phase="opening_switch"; start=now; }
  else if(phase==="opening_switch"){ blink=1.0-Math.min((now-start)/160, 1); if(blink<=0){ phase="open"; timer=now; blink=0; } }

  // --- PANORAMA EDGE DETECTOR ---
  if (window.activeScene === 'main' && phase === "open") {
      if (mx >= limitX - 0.01) { // Pushed fully against RIGHT wall
          if (timerEdge === 0) timerEdge = now;
          else if (now - timerEdge > 1000) { // Held for 1 second
              if (window.openSideScene) window.openSideScene('right');
              timerEdge = 0;
          }
      } else if (mx <= -limitX + 0.01) { // Pushed fully against LEFT wall
          if (timerEdge === 0) timerEdge = now;
          else if (now - timerEdge > 1000) { // Held for 1 second
              if (window.openSideScene) window.openSideScene('left');
              timerEdge = 0;
          }
      } else {
          timerEdge = 0;
      }
  } else {
      timerEdge = 0;
  }

  cx += (mx - cx) * (0.12 + audioIntensity * 0.05); cy += (my - cy) * (0.12 + audioIntensity * 0.05);

  drawFadeQuad();
  if(mode !== 9) simStep(now);

  if(mode===3 || mode===8 || mode===9){ if(Math.random() < 0.08) flash = 1.0 + Math.random() * 0.5; flash *= 0.86; shake = Math.max(flash, (0.15 * Math.random() + audioIntensity * 0.4)); } else { flash *= 0.80; shake = audioIntensity * 0.1; }

  if(currentEngine) currentEngine.render(now, cx, cy, audioIntensity, blink, flash, shake, wakeVal, modeSeed);

  lastNow = now; requestAnimationFrame(render);
}
requestAnimationFrame(render);