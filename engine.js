const canvas = document.getElementById("c");
const gl = canvas.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: true });
gl.getExtension("OES_texture_float") || gl.getExtension("OES_texture_half_float");

window.__ALL_VIDEOS = window.__ALL_VIDEOS || [];
window.__mappedVidIndex = 0;

// PRELOAD LARGE ASSETS INTO BROWSER RAM TO PREVENT POP-IN DELAY
(new Image()).src = "files/img/void/skyline.png";

(function(){
  function ensureBin(){
    let bin = document.getElementById("__video_bin");
    if (bin) return bin;
    if (!document.body) return null;
    bin = document.createElement("div");
    bin.id = "__video_bin";
    bin.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;";
    document.body.appendChild(bin);
    return bin;
  }

  function makePoolVid(src, loop) {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.loop = !!loop;
    v.preload = "auto";
    v.autoplay = true;
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    v.src = src 
    const bin = ensureBin();
    if (bin) bin.appendChild(v);
    const p = v.play(); if (p && p.catch) p.catch(()=>{});
    window.__ALL_VIDEOS.push(v);
    return v;
  }  
  window.__primeVideoPool = function() {
    const pool = { fixed: {}, mapped: [] } 
    pool.fixed["files/mov/bh2.webm"]   = [makePoolVid("files/mov/bh2.webm",  true),
                                           makePoolVid("files/mov/bh2.webm",  true)];
    pool.fixed["files/mov/earth.webm"] = [makePoolVid("files/mov/earth.webm", true)];
    pool.fixed["files/mov/fly.webm"]   = [makePoolVid("files/mov/fly.webm",  false)] 
    
    const mappedFiles = window.MAPPED_VIDEOS || [];
    if (mappedFiles.length) {
      for (let i = 0; i < 4; i++) {
        const src = "files/mov/mapped/" + mappedFiles[window.__mappedVidIndex % mappedFiles.length];
        window.__mappedVidIndex++;
        pool.mapped.push(makePoolVid(src, true));
      }
    }
    window.__videoPool = pool;
  }  
  
  window.__claimPoolVid = function(src) {
    const pool = window.__videoPool;
    if (!pool) return null;
    const bucket = pool.fixed[src];
    if (bucket && bucket.length) return bucket.shift();
    return null;
  } 
  
  window.__claimMappedPoolVid = function() {
    const pool = window.__videoPool;
    if (pool && pool.mapped.length) return pool.mapped.shift();
    return null;
  } 
  
  window.__registerVideo = function(v){
    try{
      v.muted = true;
      v.playsInline = true;
      v.setAttribute("playsinline", "");
      v.setAttribute("webkit-playsinline", "");
      v.preload = "auto";
      v.autoplay = true;
      const bin = ensureBin();
      if (bin && v.parentNode !== bin) bin.appendChild(v);
      if (window._siteEntered) { const p = v.play(); if (p && p.catch) p.catch(()=>{}); }
    }catch(_){}
    window.__ALL_VIDEOS.push(v);
    return v;
  };

  window.__unlockAllVideos = function(){
    const vids = window.__ALL_VIDEOS || [];
    for (let i = 0; i < vids.length; i++){
      const v = vids[i];
      if (!v) continue;
      try{
        v.muted = true;
        v.playsInline = true;
        v.setAttribute("playsinline", "");
        v.setAttribute("webkit-playsinline", "");
        const p = v.play();
        if (p && p.catch) p.catch(()=>{});
      }catch(_){}
    }
  };
})();

const fit = () => {
  const dpr = Math.min(2, devicePixelRatio || 1.0); 
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  gl.viewport(0, 0, canvas.width, canvas.height);
};
let lastWidth = innerWidth;
window.addEventListener("resize", () => { if (innerWidth !== lastWidth) { lastWidth = innerWidth; fit(); rebuildFBOs(); } else fit(); }); 
fit();

const staticAssets = {};
function loadStaticTex(url) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  
  // MODE-9 FIX: opaque placeholder (no visible pop)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const img = new Image();
  img.crossOrigin = "anonymous";
  tex._w = 1; tex._h = 1;
  img.onload = () => {
    tex._w = img.naturalWidth || img.width || 1;
    tex._h = img.naturalHeight || img.height || 1  
    gl.activeTexture(gl.TEXTURE15);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
  };
  img.src = url;
  return tex;
}

staticAssets.b1 = loadStaticTex(`files/img/void/building01.png`);
staticAssets.b2 = loadStaticTex(`files/img/void/building09.png`);
staticAssets.b3 = loadStaticTex(`files/img/void/building08.png`);
staticAssets.b4 = loadStaticTex(`files/img/void/building07.png`);
staticAssets.b5 = loadStaticTex(`files/img/void/building06.png`);
staticAssets.b6 = loadStaticTex(`files/img/void/building05.png`);
staticAssets.windowMask = loadStaticTex("files/img/void/canalport-mask.png");
staticAssets.oobMask = loadStaticTex("files/img/void/oob-mask.png");

const DUMMY_BLACK = (() => {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
})();

const compile = (type, src) => {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const err = gl.getShaderInfoLog(sh);
    const typeName = type === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT';
    console.error(`[GLSL] ${typeName} shader compile error:\n${err}`);
    gl.deleteShader(sh);
    return null;
  }
  return sh;
};

const simProg = gl.createProgram();
gl.attachShader(simProg, compile(gl.VERTEX_SHADER, GLSL.vert));
gl.attachShader(simProg, compile(gl.FRAGMENT_SHADER, GLSL.sim));
gl.linkProgram(simProg);
gl.useProgram(simProg);
gl.uniform1i(gl.getUniformLocation(simProg,"u_window"), 7); gl.uniform1i(gl.getUniformLocation(simProg,"u_prev"), 6); 

let fbos = [], texs = [];
let mirrorFBO = null;
function makeFBO(){
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,canvas.width,canvas.height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return {fbo, tex};
}
function rebuildFBOs(){ fbos = [makeFBO(), makeFBO()]; texs = [fbos[0].tex, fbos[1].tex]; mirrorFBO = makeFBO(); }
rebuildFBOs(); let ping = 0;

const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);

const BACKLIGHT = (() => {
  const frag = `precision mediump float; uniform vec4 u_col; void main(){ gl_FragColor = u_col; }`;
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, GLSL.vert));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  return { prog, Ucol: gl.getUniformLocation(prog, "u_col") };
})();

function drawBacklight(now, strength, audio){
  if (strength <= 0.0005) return;
  gl.useProgram(BACKLIGHT.prog);
  const loc = gl.getAttribLocation(BACKLIGHT.prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const t = now * 0.001;
  const a = Math.max(0.0, Math.min(1.0, strength + audio * 0.08));
  const r = 0.35 + 0.25 * Math.sin(t * 0.70);
  const g = 0.30 + 0.25 * Math.sin(t * 0.55 + 2.1);
  const b = 0.40 + 0.25 * Math.sin(t * 0.60 + 4.2);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.uniform4f(BACKLIGHT.Ucol, r, g, b, a);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.disable(gl.BLEND);
}

// THE REBOOT SEQUENCE
window.triggerMattMode = function() {
    const loader = document.getElementById("loading-screen");
    if (loader) loader.style.display = "flex"; 
    
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        const layerPng = document.getElementById('layer-png');
        const enterBtn = document.getElementById('enter-button');
        
        if(layerPng) layerPng.src = 'files/boettke/aerial-boettke.png';
        if(enterBtn) enterBtn.src = 'files/boettke/enter-button-boettke.png';
        if(splash) splash.style.display = 'flex';
        
        const cont = document.getElementById('container');
        if(cont) cont.style.visibility = 'hidden';
        const side = document.getElementById('conky-sidebar');
        if(side) side.style.display = 'none';
        
        const audio = document.getElementById("audioPlayer");
        if (audio) {
            audio.pause();
            audio.src = ""; 
        }
        
        const oldPlayer = document.querySelector('script[src="player.js"]');
        if (oldPlayer) oldPlayer.remove();
        const newPlayer = document.createElement('script');
        newPlayer.src = 'files/boettke/scant.js';
        document.body.appendChild(newPlayer);

        staticAssets.oobMask = loadStaticTex("files/boettke/oob-boettke.png");
        window.__mirrorVariants = ["files/boettke/mirror-boettke.png"];
        
        _entered = false;
        window._siteEntered = false;
        window.splashStartTime = Date.now(); 
        
        phase = "sleeping";
        if(currentEngine) currentEngine.destroy();
        currentEngine = null; leftEngine = null; rightEngine = null;
        activePOV = 'center';
        canvas.style.transform = '';
        mx = 0; my = 0; cx = 0; cy = 0;

        setTimeout(() => {
            if (loader) loader.style.display = "none";
        }, 500);

    }, 2000); 
};

class ActiveMode {
    constructor(modeID) {
        this.id = modeID;
        const map = { 0:'city', 1:'fractal', 2:'bh', 3:'mirror', 4:'city', 5:'ocean', 6:'earth', 7:'deadcity', 8:'fly', 10:'room_left', 11:'room_right' };
        let fragKey = map[this.id];

        // HARD BLOCK BACK-TO-BACK OOB, DECREASE CHANCE TO 25%
        if (fragKey === 'mirror' || fragKey === 'room_left' || fragKey === 'room_right') {
            this.isOOB = false;
        } else {
            if (window.__lastOOB) {
                this.isOOB = false;
            } else {
                this.isOOB = Math.random() < 0.25; 
            }
            window.__lastOOB = this.isOOB;
        }
        
        this.maskTex = this.isOOB ? staticAssets.oobMask : staticAssets.windowMask;
        
        this.textures = [];
        this.vidObjs = [];
        this.startTime = -1;
        
        this.prog = gl.createProgram();
        gl.attachShader(this.prog, compile(gl.VERTEX_SHADER, GLSL.vert));
        const isRoom = (fragKey === 'room_left' || fragKey === 'room_right');
        gl.attachShader(this.prog, compile(gl.FRAGMENT_SHADER, isRoom ? GLSL.modules[fragKey] : GLSL.core + GLSL.modules[fragKey]));
        gl.linkProgram(this.prog);
        gl.useProgram(this.prog);
        gl.uniform1i(gl.getUniformLocation(this.prog,"u_texB1"), 0); gl.uniform1i(gl.getUniformLocation(this.prog,"u_texB2"), 1);
        gl.uniform1i(gl.getUniformLocation(this.prog,"u_texB3"), 2); gl.uniform1i(gl.getUniformLocation(this.prog,"u_texB4"), 3);
        gl.uniform1i(gl.getUniformLocation(this.prog,"u_texB5"), 4); gl.uniform1i(gl.getUniformLocation(this.prog,"u_texB6"), 5);
        gl.uniform1i(gl.getUniformLocation(this.prog,"u_water"), 6); gl.uniform1i(gl.getUniformLocation(this.prog,"u_texWindow"), 7); 
        gl.uniform1i(gl.getUniformLocation(this.prog,"u_texEnv1"), 8); gl.uniform1i(gl.getUniformLocation(this.prog,"u_texEnv2"), 9);
        gl.uniform1i(gl.getUniformLocation(this.prog,"u_texEnv3"), 10); gl.uniform1i(gl.getUniformLocation(this.prog,"u_texEnv4"), 11);
        gl.uniform1i(gl.getUniformLocation(this.prog,"u_texEnv6"), 12);
        gl.uniform1i(gl.getUniformLocation(this.prog,"u_texEnv5"), 13);

        this.U = {
            res: gl.getUniformLocation(this.prog,"u_resolution"), time: gl.getUniformLocation(this.prog,"u_time"),
            mouse: gl.getUniformLocation(this.prog,"u_mouse"), mode: gl.getUniformLocation(this.prog,"u_mode"),
            blink: gl.getUniformLocation(this.prog,"u_blink"), flash: gl.getUniformLocation(this.prog,"u_flash"),
            shake: gl.getUniformLocation(this.prog,"u_shake"), wake: gl.getUniformLocation(this.prog,"u_wake"),
            modeSeed: gl.getUniformLocation(this.prog,"u_modeSeed"), audio: gl.getUniformLocation(this.prog,"u_audio"),
            texSize: gl.getUniformLocation(this.prog,"u_texSize"),
            isOOB: gl.getUniformLocation(this.prog, "u_isOOB"),
            modeTime: gl.getUniformLocation(this.prog, "u_modeTime"),
            trip: gl.getUniformLocation(this.prog, "u_trip")
        };

        if (fragKey === 'room_left') {
            this.env1 = loadStaticTex("files/img/rooms/left-mobile.png");
            this.textures.push(this.env1);
            this.galleryTex = [0,1,2,3].map(() => this._makeBlackTex());
            this.galleryTex.forEach(t => this.textures.push(t));
            [0,1,2,3].forEach(i => this._loadGallerySlot(i));
        } else if (fragKey === 'room_right') {
            this.env1 = loadStaticTex("files/img/rooms/right-mobile.png");
            this.textures.push(this.env1);
            this.vidTexs = [0,1,2,3].map(() => this._makeBlackTex());
            this.vidObjs = [0,1,2,3].map(() => this._makeMappedVideo());
            this.vidTexs.forEach(t => this.textures.push(t));
        } else {
            if (fragKey === 'city' || fragKey === 'fractal') this.env1 = loadStaticTex("files/img/void/skyline.png");
            else if (fragKey === 'mirror') {
                const mirrorVariants = window.__mirrorVariants || [
                    "files/img/mirror.png",
                    "files/img/mirrorv1.png",
                    "files/img/mirrorv2.png",
                    "files/img/mirrorv3.png",
                    "files/img/mirrorv5.png"
                ];
                this.env1 = loadStaticTex(mirrorVariants[Math.floor(Math.random() * mirrorVariants.length)]);
            }
            else if (fragKey === 'ocean') this.env1 = loadStaticTex("files/img/ocean.jpg");
            else if (fragKey === 'deadcity') { this.env1 = this.loadVideo("files/mov/bh2.webm"); this.env2 = loadStaticTex("files/img/deadcity.png"); this.textures.push(this.env2); }
            else if (fragKey === 'bh') this.env1 = this.loadVideo("files/mov/bh2.webm");
            else if (fragKey === 'earth') this.env1 = this.loadVideo("files/mov/earth.webm");
            else if (fragKey === 'fly') this.env1 = this.loadVideo("files/mov/fly.webm"); 
            if (this.env1 && !['deadcity','bh','earth','fly'].includes(fragKey)) this.textures.push(this.env1);
        }
    }

    _makeBlackTex() {
        const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        return tex;
    }

    _makeMappedVideo() {  
        const poolVid = window.__claimMappedPoolVid && window.__claimMappedPoolVid();
        if (poolVid) return poolVid 
        
        const mappedFiles = window.MAPPED_VIDEOS || [];
        const src = 'files/mov/mapped/' + mappedFiles[window.__mappedVidIndex % mappedFiles.length];
        window.__mappedVidIndex++;
        
        const vid = document.createElement("video");
        vid.muted = true; vid.playsInline = true; vid.loop = true;
        vid.src = src;
        window.__registerVideo && window.__registerVideo(vid);
        return vid;
    }

    _loadGallerySlot(i) {
        const pool = window.galleryImages || [];
        const src = 'files/img/gallery/' + pool[Math.floor(Math.random() * pool.length)];
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {   
            gl.activeTexture(gl.TEXTURE15);
            gl.bindTexture(gl.TEXTURE_2D, this.galleryTex[i]);
            gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        };
        img.src = src;
    }

    loadVideo(srcFile) {
        const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR) 
        let vid = window.__claimPoolVid && window.__claimPoolVid(srcFile);
        if (vid) { 
            vid.loop = !srcFile.includes("fly");
        } else { 
            vid = document.createElement("video");
            vid.muted = true; vid.playsInline = true;
            vid.loop = !srcFile.includes("fly");
            const s = document.createElement("source"); s.src = srcFile; s.type = "video/webm";
            vid.appendChild(s);
            window.__registerVideo && window.__registerVideo(vid);
        }

        this.videoObj = vid;
        this.textures.push(tex);
        return tex;
    }

    render(now, mx, my, audioIntensity, blink, flash, shake, wakeVal, modeSeed) {
        if (this.startTime < 0) this.startTime = now;
        let modeTime = (now - this.startTime) * 0.001;

        gl.useProgram(this.prog);
        const loc = gl.getAttribLocation(this.prog, "p");
        gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        if (this.videoObj && this.videoObj.readyState >= 2) {
            gl.activeTexture(gl.TEXTURE8);
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
        gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, this.maskTex);
        if(this.env1) { gl.activeTexture(gl.TEXTURE8); gl.bindTexture(gl.TEXTURE_2D, this.env1); }

        gl.activeTexture(gl.TEXTURE9);  gl.bindTexture(gl.TEXTURE_2D, DUMMY_BLACK);
        gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_2D, DUMMY_BLACK);
        gl.activeTexture(gl.TEXTURE11); gl.bindTexture(gl.TEXTURE_2D, DUMMY_BLACK);
        gl.activeTexture(gl.TEXTURE12); gl.bindTexture(gl.TEXTURE_2D, DUMMY_BLACK);
        gl.activeTexture(gl.TEXTURE13); gl.bindTexture(gl.TEXTURE_2D, DUMMY_BLACK);

        if (this.id === 7 && this.env2) { gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, this.env2); }

        if (this.id === 10 && this.galleryTex) {
            gl.activeTexture(gl.TEXTURE9);  gl.bindTexture(gl.TEXTURE_2D, this.galleryTex[0]);
            gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_2D, this.galleryTex[1]);
            gl.activeTexture(gl.TEXTURE11); gl.bindTexture(gl.TEXTURE_2D, this.galleryTex[2]);
            gl.activeTexture(gl.TEXTURE12); gl.bindTexture(gl.TEXTURE_2D, this.galleryTex[3]);
        }

        if (this.id === 11) {
            this.vidObjs.forEach((vid, i) => {
                if (vid.readyState >= 2) {
                    gl.activeTexture(gl.TEXTURE9 + i);
                    gl.bindTexture(gl.TEXTURE_2D, this.vidTexs[i]);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                }
            });
            gl.activeTexture(gl.TEXTURE13);
            gl.bindTexture(gl.TEXTURE_2D, mirrorFBO.tex);
        }

        gl.uniform1f(this.U.audio, audioIntensity); gl.uniform2f(this.U.res, canvas.width, canvas.height); 
        gl.uniform1f(this.U.time, now*0.001); gl.uniform2f(this.U.mouse, mx, my); gl.uniform1i(this.U.mode, this.id); 
        gl.uniform1f(this.U.blink, blink); gl.uniform1f(this.U.flash, flash); gl.uniform1f(this.U.shake, shake); 
        gl.uniform1f(this.U.wake, wakeVal); gl.uniform1f(this.U.modeSeed, modeSeed);
        
        if (this.U.isOOB !== null) gl.uniform1f(this.U.isOOB, this.isOOB ? 1.0 : 0.0);
        if (this.U.modeTime !== null) gl.uniform1f(this.U.modeTime, modeTime);
        if (this.U.trip !== null) gl.uniform1f(this.U.trip, tripIntensity);
        
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    destroy() {
        const stopVid = (v) => {
            if (!v) return;
            v.pause() 
            while (v.firstChild) v.removeChild(v.firstChild);
            v.removeAttribute('src');
            try { v.load(); } catch(_) {}
        };
        if (this.videoObj) stopVid(this.videoObj);
        if (this.vidObjs) this.vidObjs.forEach(stopVid);
        for(let tex of this.textures) gl.deleteTexture(tex);
        gl.deleteProgram(this.prog);
    }
}

let currentEngine = null, mx=0, my=0, cx=0, cy=0, mode=0, blink=0, flash=0, shake=0, phase="sleeping", timer=-9999, start=0, lastNow=0, blinkCount=0, targetBlinks=1, modeSeed=0, lastMode=-1, tripIntensity=1.0;
let leftEngine = null, rightEngine = null, activePOV = 'center'; 
const SLIDE_MS = 340, EDGE_SNAP_MS = 80;
let slideState = 'idle', slideStart = 0, slideDir = 0, slideOffset = 0, pendingPOV = null, povSwitchTime = -9999;

function beginSlide(targetPOV, direction) { if (slideState !== 'idle') return; pendingPOV = targetPOV; slideDir = direction; slideState = 'out'; slideStart = lastNow; }
function tickSlide(now) {
  if (slideState === 'idle') return;
  const elapsed = now - slideStart;
  if (slideState === 'out') {
    const t = Math.min(elapsed / SLIDE_MS, 1.0);
    slideOffset = (t * t) * innerWidth * slideDir;
    if (t >= 1.0) { slideOffset = innerWidth * slideDir; slideState = 'black'; slideStart = now; activePOV = pendingPOV; mx = 0; my = 0; cx = 0; cy = 0; povSwitchTime = now; }
  } else if (slideState === 'black') { if (elapsed >= EDGE_SNAP_MS) { slideOffset = -innerWidth * slideDir; slideState = 'in'; slideStart = now; }
  } else if (slideState === 'in') {
    const t = Math.min(elapsed / SLIDE_MS, 1.0);
    const ease = 1.0 - (1.0 - t) * (1.0 - t);
    slideOffset = -innerWidth * slideDir * (1.0 - ease);
    if (t >= 1.0) { slideOffset = 0; slideState = 'idle'; pendingPOV = null; }
  }
  canvas.style.transform = slideOffset !== 0 ? `translateX(${slideOffset.toFixed(1)}px)` : '';
}

function checkPOVThreshold() {
  if (slideState !== 'idle') return;
  if (activePOV !== 'center' && (lastNow - povSwitchTime) < 600) return;
  if (!isDragging) return;
  if (activePOV === 'center') {
    if (mx >= 1.24) beginSlide('left', +1);
    else if (mx <= -1.24) beginSlide('right', -1);
  } else if (activePOV === 'left') { if (mx <= -1.14) beginSlide('center', -1);
  } else if (activePOV === 'right') { if (mx >= 1.14) beginSlide('center', +1); }
}

let isDragging = false;
let lastDragX = 0;
let lastDragY = 0;

const startDrag = (e, x, y) => {
  if (e && (e.target.id === 'secret-button' ||
      e.target.closest('#conky-sidebar') ||
      e.target.closest('#aboutOverlay'))) return;
  isDragging = true;
  lastDragX = x;
  lastDragY = y;
};

const doDrag = (x, y) => {
  if (!isDragging) return;
  mx -= ((x - lastDragX) / innerWidth)  * 3.0;
  my -= ((y - lastDragY) / innerHeight) * 3.0;
  lastDragX = x;
  lastDragY = y;
  mx = Math.max(-1.35, Math.min(1.35, mx));
  my = Math.max(-0.5,  Math.min(0.5,  my));
};

const endDrag = () => {
  isDragging = false;
  mx = 0;
  my = 0;
}

window.addEventListener("mousedown", e => startDrag(e, e.clientX, e.clientY));
window.addEventListener("mousemove", e => doDrag(e.clientX, e.clientY));
window.addEventListener("mouseup",   endDrag)

window.addEventListener("touchstart",
  e => startDrag(e, e.touches[0].clientX, e.touches[0].clientY),
  { passive: true }
);
window.addEventListener("touchmove",
  e => { if (e.touches.length > 0) doDrag(e.touches[0].clientX, e.touches[0].clientY); },
  { passive: true }
);
window.addEventListener("touchend", endDrag);

function simStep(now){
  gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, texs[ping]);
  gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, staticAssets.windowMask); 
  const next = 1 - ping; gl.bindFramebuffer(gl.FRAMEBUFFER, fbos[next].fbo); gl.viewport(0,0,canvas.width,canvas.height);
  gl.useProgram(simProg); 
  const loc = gl.getAttribLocation(simProg, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(gl.getUniformLocation(simProg,"u_resolution"), canvas.width, canvas.height); gl.uniform1f(gl.getUniformLocation(simProg,"u_time"), now * 0.001); gl.uniform1f(gl.getUniformLocation(simProg,"u_dt"), Math.min((now - lastNow) * 0.001, 0.05));
  gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindFramebuffer(gl.FRAMEBUFFER, null); ping = next;
}

function advanceMode(){
  let nextMode = mode;
  let attempts = 0;
  while((nextMode === mode || nextMode === lastMode || (mode < 7 && nextMode < 7)) && attempts < 20){ nextMode = Math.floor(Math.random() * 8); attempts++; }
  lastMode = mode; mode = nextMode; modeSeed++;
  tripIntensity = 0.2 + Math.random() * 1.5; 
  if(currentEngine) currentEngine.destroy();
  currentEngine = new ActiveMode(mode);
}

function initSideEngines() { if (!leftEngine) leftEngine = new ActiveMode(10); if (!rightEngine) rightEngine = new ActiveMode(11); }

function render(now){
  let audioIntensity = 0;
  if (window.audioAnalyser) { window.audioAnalyser.getByteFrequencyData(window.audioData); let sum = 0; for (let i=0; i<6; i++) sum += window.audioData[i]; audioIntensity = sum / (6 * 255); }
  let wakeVal = 1.0;
  
  if(phase === "sleeping"){
      wakeVal = 0.0;
      if(window.startSecretFlySequence && !currentEngine){ 
          mode = 8;
          phase = "waking"; 
          start = now; 
          currentEngine = new ActiveMode(mode); 
          initSideEngines(); 
          if(window.playFlyAudio) window.playFlyAudio();
      } else if(window.startWakeSequence && !currentEngine){ 
          phase = "waking"; 
          start = now; 
          currentEngine = new ActiveMode(mode); 
          initSideEngines(); 
      }
  } else if(phase === "waking"){ let t = Math.min((now - start) / 3000, 1.0); wakeVal = 1.0 - Math.pow(1.0 - t, 3); if(t >= 1.0){ phase = "open"; timer = now; } }

  if (activePOV === 'center') {
    
    if (mode === 8 && phase === "open") {
        if (currentEngine && currentEngine.videoObj && currentEngine.videoObj.ended) {
            phase = "waking"; 
            start = now; 
            advanceMode();
            if(window.unmuteMainAudio) window.unmuteMainAudio();
        }
    } else if (phase === "open" && now - timer > 9000) {
        blinkCount++; 
        if(blinkCount >= targetBlinks){ phase="closing_switch"; start=now; timer=now; } 
        else { phase="closing_blink"; start=now; timer=now; } 
    }

    if(phase==="closing_blink"){ blink=Math.min((now-start)/160, 1); if(blink>=1){ phase="black_blink"; start=now; } }
    else if(phase==="black_blink" && now-start>120){ phase="opening_blink"; start=now; }
    else if(phase==="opening_blink"){ blink=1.0-Math.min((now-start)/160, 1); if(blink<=0){ phase="open"; timer=now; blink=0; } }
    else if(phase==="closing_switch"){ blink=Math.min((now-start)/160, 1); if(blink>=1){ phase="black_switch"; start=now; advanceMode(); } }
    else if(phase==="black_switch" && now-start>200){ phase="opening_switch"; start=now; }
    else if(phase==="opening_switch"){ blink=1.0-Math.min((now-start)/160, 1); if(blink<=0){ phase="open"; timer=now; blink=0; } }
  }

  if (phase === "open" || activePOV !== 'center') checkPOVThreshold();
  tickSlide(now);
  cx += (mx - cx) * 0.12; cy += (my - cy) * 0.12;

  if (activePOV === 'right' && mx <= -1.15) {
      if (!window.mattModeTimer) window.mattModeTimer = now;
      if (now - window.mattModeTimer > 5000 && !window.mattModeTriggered) {
          window.mattModeTriggered = true;
          triggerMattMode();
      }
  } else {
      window.mattModeTimer = 0;
  }

  if (activePOV === 'center') {
    drawBacklight(now, 0.35, audioIntensity);
    simStep(now);

    if(mode === 2 || mode === 7){ 
        if(Math.random()<0.08) flash=1.2; 
        flash*=0.86; 
        shake=Math.max(flash, audioIntensity*0.07); 
    } else if (mode === 8) {
        flash *= 0.8; 
        let windGust = Math.random() < 0.2 ? Math.random() * 0.8 : 0.0;
        shake = 0.07 + (audioIntensity * 0.8) + windGust;
    } else { 
        flash*=0.8; 
        shake=audioIntensity*0.1; 
    }

    if(currentEngine) currentEngine.render(now, cx, cy, audioIntensity, blink, flash, shake, wakeVal, modeSeed);
  } else if (activePOV === 'left') {
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    if (leftEngine) leftEngine.render(now, cx, cy, audioIntensity, blink, 0, 0, wakeVal, modeSeed);
  } else if (activePOV === 'right') {
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    simStep(now);
    if (currentEngine && mirrorFBO) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, mirrorFBO.fbo);
      gl.viewport(0, 0, canvas.width, canvas.height);
      currentEngine.render(now, 0, 0, audioIntensity, 0, 0, 0, wakeVal, modeSeed);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    if (rightEngine) rightEngine.render(now, cx, cy, audioIntensity, blink, 0, 0, wakeVal, modeSeed);
  }
  lastNow = now; requestAnimationFrame(render);
}

requestAnimationFrame(render);