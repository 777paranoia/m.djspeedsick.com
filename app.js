// engine.js
const IS_MOBILE = /Mobi|Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && window.innerWidth < 1024);

const canvas = document.getElementById("c");
const gl = canvas.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: true });
gl.getExtension("OES_texture_float") || gl.getExtension("OES_texture_half_float");

window.__ALL_VIDEOS = window.__ALL_VIDEOS || [];

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
    v.src = src;
    const bin = ensureBin();
    if (bin) bin.appendChild(v);
    const p = v.play(); if (p && p.catch) p.catch(()=>{});
    window.__ALL_VIDEOS.push(v);
    return v;
  }  

  window.__primeVideoPool = function() {
    const pool = { fixed: {}, mapped: [] };
    pool.fixed["files/mov/bh2.webm"]   = [makePoolVid("files/mov/bh2.webm",  true),
                                           makePoolVid("files/mov/bh2.webm",  true),
                                           makePoolVid("files/mov/bh2.webm",  true)];
    pool.fixed["files/mov/earth.webm"] = [makePoolVid("files/mov/earth.webm", true)];
    pool.fixed["files/mov/fly.webm"]   = [makePoolVid("files/mov/fly.webm",  false)];
    
    const mappedFiles = window.MAPPED_VIDEOS || [];
    if (mappedFiles.length && !IS_MOBILE) {
      let shuffled = [...mappedFiles].sort(() => Math.random() - 0.5);
      for (let i = 0; i < 4; i++) {
        const src = "files/mov/mapped/" + shuffled[i % shuffled.length];
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
  const dpr = IS_MOBILE ? Math.min(1.0, devicePixelRatio || 1.0) : Math.min(2, devicePixelRatio || 1.0);
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  gl.viewport(0, 0, canvas.width, canvas.height);
};
let lastWidth = innerWidth;
let __resizeTimer = null;
window.addEventListener("resize", () => {
  fit();
  if (innerWidth !== lastWidth) { lastWidth = innerWidth; rebuildFBOs(); return; }

  clearTimeout(__resizeTimer);
  __resizeTimer = setTimeout(() => { fit(); rebuildFBOs(); }, 200);
});
fit();

const staticAssets = {};
function loadStaticTex(url) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  
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
    tex._h = img.naturalHeight || img.height || 1;  
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

const PROGRAM_CACHE = {};

function buildProgram(fragKey) {
  if (PROGRAM_CACHE[fragKey]) return PROGRAM_CACHE[fragKey];

  if (!GLSL.modules[fragKey] && fragKey !== 'zone2_hallway' && fragKey !== 'z2_composite') return null;

  const prog = gl.createProgram();
  const vert = compile(gl.VERTEX_SHADER, GLSL.vert);
  if (!vert) return null;
  gl.attachShader(prog, vert);

  const isStandalone = (fragKey === 'room_left' || fragKey === 'room_right' || fragKey === 'room_back' || fragKey === 'zone2_hallway' || fragKey === 'z2_composite');
  
  let fragSrc = isStandalone ? GLSL.modules[fragKey] : GLSL.core + GLSL.modules[fragKey];
  if (!fragSrc || fragSrc.includes("undefined")) return null;

  const fragShader = compile(gl.FRAGMENT_SHADER, fragSrc);
  if (!fragShader) return null;

  gl.attachShader(prog, fragShader);
  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(`[GLSL] PROGRAM link error (${fragKey}):\n${gl.getProgramInfoLog(prog)}`);
    return null;
  }

  PROGRAM_CACHE[fragKey] = prog;
  return prog;
}

function warmPrograms() {
  const keys = ['fly','city','fractal','bh','mirror','ocean','earth','deadcity','goreville','plane','room_left','room_right','room_back'];
  for (let i = 0; i < keys.length; i++) {
    if (GLSL.modules[keys[i]]) buildProgram(keys[i]);
  }
}

const simProg = gl.createProgram();
gl.attachShader(simProg, compile(gl.VERTEX_SHADER, GLSL.vert));
gl.attachShader(simProg, compile(gl.FRAGMENT_SHADER, GLSL.sim));
gl.linkProgram(simProg);
gl.useProgram(simProg);
gl.uniform1i(gl.getUniformLocation(simProg,"u_window"), 7); gl.uniform1i(gl.getUniformLocation(simProg,"u_prev"), 6); 

let fbos = [], texs = [];
let mirrorFBO = null;
let windowFBO = null;
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
function rebuildFBOs(){ fbos = [makeFBO(), makeFBO()]; texs = [fbos[0].tex, fbos[1].tex]; mirrorFBO = makeFBO(); windowFBO = makeFBO(); }
rebuildFBOs();
warmPrograms();
let ping = 0;

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

class ActiveMode {
    constructor(modeID) {
        this.id = modeID;
        const map = {
          0:'fly', 1:'city', 2:'fractal', 3:'bh', 4:'mirror',
          5:'ocean', 6:'earth', 7:'deadcity', 8:'goreville', 9:'plane',
          98:'room_left', 99:'room_right', 97:'room_back'
        };
        let fragKey = map[this.id];

        if (fragKey === 'mirror' || fragKey === 'room_left' || fragKey === 'room_right' || fragKey === 'room_back') {
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
        
        this.prog = buildProgram(fragKey);
        if (!this.prog) return;

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
            [0,1,2].forEach(i => this._loadGallerySlot(i));
        } else if (fragKey === 'room_back') {
            this.env1 = loadStaticTex("files/img/rooms/back.png");
            this.textures.push(this.env1);
            this.bcTex = this._makeBlackTex();
            this.textures.push(this.bcTex);
        } else if (fragKey === 'room_right') {
            this.env1 = loadStaticTex("files/img/rooms/right-mobile.png");
            this.textures.push(this.env1);
            this.vidTexs = [0,1,2,3].map(() => this._makeBlackTex());
            this.vidObjs = [0,1,2,3].map(() => this._makeMappedVideo());
            this.vidTexs.forEach(t => this.textures.push(t));
        } else {
         if (fragKey === 'city' || fragKey === 'fractal' || fragKey === 'plane')
            this.env1 = loadStaticTex("files/img/void/skyline.png");            
         else if (fragKey === 'mirror') {
                this.env1 = loadStaticTex(window.__mirrorVariants ? window.__mirrorVariants[0] : "files/img/rooms/mirror-b.png");
                const overlayPick = ["files/img/rooms/mirror-v1.png","files/img/rooms/mirror-v2.png","files/img/rooms/mirror-v3.png"];
                this.env2 = loadStaticTex(window.__mirrorOverlay || overlayPick[Math.floor(Math.random() * overlayPick.length)]);
                this.textures.push(this.env2);

                this.bcTex = this._makeBlackTex();
                this.textures.push(this.bcTex);
            }
            else if (fragKey === 'goreville') {
                this.env1 = loadStaticTex("files/img/void/goresky.png");
                this.env2 = loadStaticTex("files/img/void/gorebuilding01.png");
                this.env3 = loadStaticTex("files/img/void/gorebuilding02.png");
                this.env4 = loadStaticTex("files/img/void/gorebuilding03.png");
                this.env5 = loadStaticTex("files/img/void/gorewater.png");
                this.textures.push(this.env1, this.env2, this.env3, this.env4, this.env5);
            }
            else if (fragKey === 'ocean') this.env1 = loadStaticTex("files/img/ocean.jpg");
            else if (fragKey === 'deadcity') { this.env1 = this.loadVideo("files/mov/bh2.webm"); this.env2 = loadStaticTex("files/img/deadcity.png"); this.textures.push(this.env2); }
            else if (fragKey === 'bh') this.env1 = this.loadVideo("files/mov/bh2.webm");
            else if (fragKey === 'earth') this.env1 = this.loadVideo("files/mov/earth.webm");
            else if (fragKey === 'fly') this.env1 = this.loadVideo("files/mov/fly.webm"); 
            if (this.env1 && !['deadcity','bh','earth','fly','goreville'].includes(fragKey)) this.textures.push(this.env1);
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
        if (poolVid) return poolVid; 
        
        const mappedFiles = window.MAPPED_VIDEOS || [];
        const src = 'files/mov/mapped/' + mappedFiles[Math.floor(Math.random() * mappedFiles.length)];
        
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
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); 
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
        if (!this.prog) return;
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

        if (this.id === 7 && this.env2) {
            gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, this.env2);
        }

        if (this.id === 8 && this.env2) {
            gl.activeTexture(gl.TEXTURE9);  gl.bindTexture(gl.TEXTURE_2D, this.env2);
            gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_2D, this.env3 || DUMMY_BLACK);
            gl.activeTexture(gl.TEXTURE11); gl.bindTexture(gl.TEXTURE_2D, this.env4 || DUMMY_BLACK);
            gl.activeTexture(gl.TEXTURE13); gl.bindTexture(gl.TEXTURE_2D, this.env5 || DUMMY_BLACK);
        }

        if (this.id === 4) {
            if (window.butterchurnVisualizer && window.bcCanvas) {
                gl.activeTexture(gl.TEXTURE9);
                gl.bindTexture(gl.TEXTURE_2D, this.bcTex || DUMMY_BLACK);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, window.bcCanvas);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            }
            if (this.env2) {
                gl.activeTexture(gl.TEXTURE10);
                gl.bindTexture(gl.TEXTURE_2D, this.env2);
            }
        }

        if (this.id === 98 && this.galleryTex) {
            gl.activeTexture(gl.TEXTURE9);  gl.bindTexture(gl.TEXTURE_2D, this.galleryTex[0]);
            gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_2D, this.galleryTex[1]);
            gl.activeTexture(gl.TEXTURE11); gl.bindTexture(gl.TEXTURE_2D, this.galleryTex[2]);
            
            gl.activeTexture(gl.TEXTURE12); 
            gl.bindTexture(gl.TEXTURE_2D, this.galleryTex[3]);
            if (window.butterchurnVisualizer && window.bcCanvas) {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, window.bcCanvas);
            }
        }

        if (this.id === 97) {
            if (window.butterchurnVisualizer && window.bcCanvas) {
                gl.activeTexture(gl.TEXTURE9);
                gl.bindTexture(gl.TEXTURE_2D, this.bcTex || DUMMY_BLACK);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, window.bcCanvas);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            }
        }

        if (this.id === 99 || this.id === 97) {
            if (this.id === 99) {
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
            }
            gl.activeTexture(gl.TEXTURE13);
            gl.bindTexture(gl.TEXTURE_2D, mirrorFBO ? mirrorFBO.tex : DUMMY_BLACK);
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

    setZoom(z) {
        if (!this.prog) return;
        const loc = gl.getUniformLocation(this.prog, 'u_zoom');
        if (loc) { gl.useProgram(this.prog); gl.uniform1f(loc, z); }
    }

    destroy() {
        const stopVid = (v) => {
            if (!v) return;
            v.pause(); 
            while (v.firstChild) v.removeChild(v.firstChild);
            v.removeAttribute('src');
            try { v.load(); } catch(_) {}
        };
        if (this.videoObj) stopVid(this.videoObj);
        if (this.vidObjs) this.vidObjs.forEach(stopVid);
        for(let tex of this.textures) gl.deleteTexture(tex);
    }
}

var currentEngine = null, mx=0, my=0, cx=0, cy=0, mode=1, blink=0, flash=0, shake=0, phase="sleeping", timer=-9999, start=0, lastNow=0, blinkCount=0, targetBlinks=1, modeSeed=0, lastMode=-1, tripIntensity=1.0;
var leftEngine = null, rightEngine = null, backEngine = null, activePOV = 'center';
var backZoom = 0.0, backZoomTarget = 0.0;

// ═══════════════════════════════════════════════════════════════
//  HALLUCINATION ENGINE — layered reality degradation system
//  Layers: grain → scanline tears → fractal bleed → horror vignette
//  All layers build with trip intensity across the full session.
//  Blinks don't gate visibility — they surge/shuffle the character.
// ═══════════════════════════════════════════════════════════════

var fractalSeed = Math.random() * 100.0;
var blinkPeakTime = performance.now();
var hallucinationProg = null;
var hallucinationQuadBuf = null;
var hallucinationU = null;
var _tripAccum = 0.0;   // slowly ratchets up across the session — never goes down

function initHallucinationOverlay() {
    // ── FRAGMENT SHADER ──────────────────────────────────────
    // WebGL1-safe: NO break in loops. Uses step() to skip iterations.
    // Premultiplied alpha output: blend with gl.ONE, gl.ONE_MINUS_SRC_ALPHA
    const fragSrc = `
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
uniform float u_trip;        // current zone trip intensity
uniform float u_tripAccum;   // session accumulator — only grows
uniform float u_fractalSeed;
uniform float u_blinkAge;    // seconds since last blink peak

// ── HASHES ──
float hh(float x){ return fract(sin(x*127.1)*43758.5453); }
float hh2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
    vec2 i=floor(p); vec2 f=fract(p); vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hh2(i),hh2(i+vec2(1,0)),u.x),
               mix(hh2(i+vec2(0,1)),hh2(i+vec2(1,1)),u.x),u.y);
}

// ── BURNING SHIP FRACTAL ──
// z_{n+1} = (|Re(z)| + i|Im(z)|)^2 + c
// Produces inverted cityscapes / melting buildings — fits the void city aesthetic
float burningShip(vec2 c){
    vec2 z = vec2(0.0);
    float escaped = 0.0;
    float smooth_i = 0.0;
    for(int n=0; n<48; n++){
        z = vec2(abs(z.x), abs(z.y));
        z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
        // WebGL1-safe: no break — accumulate with step
        float esc = step(4.0, dot(z,z));
        smooth_i += (1.0 - esc);  // count pre-escape iterations
    }
    return smooth_i / 48.0;
}

// ── JULIA SET ──
float julia(vec2 z, vec2 c){
    float smooth_i = 0.0;
    for(int n=0; n<40; n++){
        z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
        smooth_i += (1.0 - step(4.0, dot(z,z)));
    }
    return smooth_i / 40.0;
}

// ── PALETTE — sickly neon with seed-driven hue ──
vec3 sickPal(float t, float seed){
    // Horror palette: shifted toward reds/magentas/acid greens
    vec3 a = vec3(0.5, 0.4, 0.45);
    vec3 b = vec3(0.5, 0.35, 0.5);
    vec3 c = vec3(1.0, 0.8, 1.0);
    vec3 d = vec3(hh(seed)*0.5, hh(seed+1.0)*0.3 + 0.1, hh(seed+2.0)*0.4 + 0.3);
    return a + b * cos(6.28318*(c*t + d));
}

void main(){
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
    vec2 screenUV = gl_FragCoord.xy / u_resolution;
    float r = length(uv);
    float t = u_time;
    float trip = clamp(u_trip, 0.0, 2.0);
    float accum = clamp(u_tripAccum, 0.0, 8.0);

    // Base intensity: always present once trip > 0, grows with accumulator
    float baseStrength = trip * 0.12 + accum * 0.025;
    // Blink surge: snaps in at blink, decays over 6 seconds
    float surge = smoothstep(6.0, 0.0, u_blinkAge) * trip * 0.35;
    float totalStrength = baseStrength + surge;

    if(totalStrength < 0.008){ gl_FragColor = vec4(0.0); return; }

    // ════════════════════════════════════════════════════════
    //  LAYER 1: FILM GRAIN — always on, scales with trip
    //  Survival horror film stock damage
    // ════════════════════════════════════════════════════════
    float grainSeed = floor(t * 24.0); // 24fps grain refresh
    float grain = hh2(screenUV * u_resolution * 0.5 + grainSeed * 7.3) - 0.5;
    // Heavier grain in dark areas (shadow noise) — peripheral weighting
    float grainAmt = totalStrength * 0.12 * (1.0 + r * 0.6);
    // Occasional heavy grain bursts
    float grainBurst = step(0.92, hh(grainSeed * 3.1 + u_fractalSeed)) * trip;
    grainAmt += grainBurst * 0.25;

    // ════════════════════════════════════════════════════════
    //  LAYER 2: VHS SCANLINE CORRUPTION
    //  Horizontal bands that tear/shift — PT hallway vibes
    // ════════════════════════════════════════════════════════
    float scanY = screenUV.y * u_resolution.y;
    float scanBand = floor(scanY / 3.0); // 3px band height
    float scanRoll = hh(scanBand * 7.7 + floor(t * 6.0));
    // Tear probability increases with trip
    float tearProb = 0.985 - totalStrength * 0.06;
    float isTear = step(tearProb, scanRoll);
    // Tear color: dark desaturated band or bright white flash
    float tearBright = step(0.7, hh(scanBand * 13.3 + floor(t * 12.0)));
    vec3 tearColor = mix(vec3(0.0, 0.0, 0.02), vec3(0.9, 0.85, 0.95), tearBright);
    float tearAlpha = isTear * totalStrength * 0.5;

    // ════════════════════════════════════════════════════════
    //  LAYER 3: FRACTAL PERIPHERAL BLEED
    //  Burning Ship + Julia sets in the outer vision
    //  Like seeing geometry that shouldn't exist
    // ════════════════════════════════════════════════════════
    float periph = smoothstep(0.20, 0.95, r);
    float fracAlpha = 0.0;
    vec3 fracCol = vec3(0.0);

    if(periph * totalStrength > 0.01) {
        // Seed picks fractal type and region
        float typeRoll = hh(u_fractalSeed * 3.7);
        float zoom = mix(0.6, 3.0, hh(u_fractalSeed * 1.3));

        // Slow drift — fractal region crawls over time
        vec2 drift = vec2(
            sin(t * 0.03 + u_fractalSeed) * 0.2,
            cos(t * 0.02 + u_fractalSeed * 1.7) * 0.2
        );

        vec2 sampleUV = uv / zoom + drift;
        float val = 0.0;

        if(typeRoll < 0.4) {
            // Burning Ship — melting cityscape structures
            vec2 region = vec2(-1.76, -0.028) + vec2(hh(u_fractalSeed*5.1)-0.5, hh(u_fractalSeed*7.3)-0.5) * 0.3;
            val = burningShip(sampleUV * 0.5 + region);
        } else if(typeRoll < 0.7) {
            // Julia set — organic/alien tendrils
            vec2 jc = vec2(
                -0.8 + sin(t * 0.015 + u_fractalSeed) * 0.15,
                 0.156 + cos(t * 0.012 + u_fractalSeed * 2.0) * 0.1
            );
            val = julia(sampleUV * 0.8, jc);
        } else {
            // Burning Ship zoomed into the "mast" — tower structures
            vec2 region = vec2(-1.755, -0.022);
            float deepZoom = mix(2.0, 8.0, hh(u_fractalSeed * 9.1));
            val = burningShip(sampleUV * 0.15 / deepZoom + region);
        }

        // Animate color cycling — slow, nauseous
        val = fract(val * 3.5 + t * 0.04 * (0.3 + hh(u_fractalSeed * 9.0)));
        fracCol = sickPal(val, u_fractalSeed * 11.3);
        // Kill deep interior (val near 1.0 = never escaped = boring)
        fracCol *= smoothstep(0.0, 0.12, val) * smoothstep(1.0, 0.7, val);

        float fracPulse = 0.6 + 0.4 * sin(t * (0.8 + hh(u_fractalSeed*4.0)) + u_fractalSeed);
        fracAlpha = periph * totalStrength * 0.22 * fracPulse;
    }

    // ════════════════════════════════════════════════════════
    //  LAYER 4: HORROR VIGNETTE — dark red peripheral creep
    //  The edges of vision darken and pulse, like blood pressure
    // ════════════════════════════════════════════════════════
    float vignPulse = 0.5 + 0.5 * sin(t * 0.7 + sin(t * 0.3) * 2.0);
    float vignStrength = smoothstep(0.35, 1.1, r) * totalStrength * 0.28 * vignPulse;
    // Asymmetric — heavier at bottom (gravity, blood pooling)
    vignStrength *= 1.0 + max(0.0, -uv.y) * 0.8;

    // ════════════════════════════════════════════════════════
    //  LAYER 5: DATAMOSH BLOCKS — random rectangles of wrong color
    //  Like frame buffer corruption / Enter the Void blink cuts
    // ════════════════════════════════════════════════════════
    float moshAlpha = 0.0;
    vec3 moshCol = vec3(0.0);
    float moshTrigger = step(0.96, hh(floor(t * 8.0) * 13.7 + u_fractalSeed));
    if(moshTrigger > 0.5 && totalStrength > 0.15) {
        float blockSize = mix(32.0, 128.0, hh(floor(t*8.0)*5.3));
        vec2 blockID = floor(gl_FragCoord.xy / blockSize);
        float blockRnd = hh2(blockID + floor(t * 4.0));
        float isCorrupt = step(0.88, blockRnd);
        // Corrupt blocks show a shifted solid color
        vec3 corruptCol = sickPal(blockRnd * 3.0 + t * 0.1, u_fractalSeed * 7.0);
        // Sometimes invert, sometimes desaturate
        float invertRoll = hh(blockRnd * 17.0);
        if(invertRoll > 0.6) corruptCol = 1.0 - corruptCol;
        else if(invertRoll > 0.3) corruptCol = vec3(dot(corruptCol, vec3(0.299, 0.587, 0.114)));
        moshAlpha = isCorrupt * totalStrength * 0.4;
        moshCol = corruptCol;
    }

    // ════════════════════════════════════════════════════════
    //  LAYER 6: AFTERIMAGE GHOST — faint echo of fractal from
    //  previous blink, still fading. Creates persistence of vision.
    // ════════════════════════════════════════════════════════
    float ghostAge = u_blinkAge + 4.0; // offset to previous cycle
    float ghostAlpha = 0.0;
    vec3 ghostCol = vec3(0.0);
    if(ghostAge < 10.0 && accum > 0.5) {
        float ghostEnv = smoothstep(10.0, 4.0, ghostAge) * 0.08 * accum;
        float ghostSeed = u_fractalSeed + 50.0; // different region
        vec2 ghostUV = uv / 1.5 + vec2(sin(t*0.02)*0.3, cos(t*0.015)*0.3);
        float gVal = burningShip(ghostUV * 0.4 + vec2(-1.76, -0.03));
        gVal = fract(gVal * 2.0 + t * 0.02);
        ghostCol = sickPal(gVal, ghostSeed * 7.0) * smoothstep(0.0, 0.15, gVal);
        ghostAlpha = smoothstep(0.3, 0.8, r) * ghostEnv;
    }

    // ════════════════════════════════════════════════════════
    //  COMPOSITE — premultiplied alpha
    //  Grain: additive noise
    //  Tears: replace bands
    //  Fractals: additive glow in periphery
    //  Vignette: darken edges
    //  Mosh: color replacement blocks
    //  Ghost: faint additive persistence
    // ════════════════════════════════════════════════════════

    vec3 outRGB = vec3(0.0);
    float outA = 0.0;

    // Grain — additive, very subtle
    outRGB += vec3(grain * grainAmt);

    // Fractal glow — additive peripheral
    outRGB += fracCol * fracAlpha;
    outA = max(outA, fracAlpha * 0.5); // slight background darken behind fractals

    // Tears — opaque bands
    outRGB = mix(outRGB, tearColor * tearAlpha, tearAlpha);
    outA = max(outA, tearAlpha);

    // Horror vignette — darkening
    outA = max(outA, vignStrength);
    outRGB = mix(outRGB, vec3(0.03, 0.0, 0.0), vignStrength); // dark red-black

    // Mosh blocks
    outRGB = mix(outRGB, moshCol * moshAlpha, moshAlpha);
    outA = max(outA, moshAlpha);

    // Ghost afterimage
    outRGB += ghostCol * ghostAlpha;

    // Premultiplied output
    gl_FragColor = vec4(outRGB, outA);
}`;

    const vert = compile(gl.VERTEX_SHADER, GLSL.vert);
    const frag = compile(gl.FRAGMENT_SHADER, fragSrc);
    if (!vert || !frag) { console.error('[HALLUCINATION] shader compile failed'); return; }

    hallucinationProg = gl.createProgram();
    gl.attachShader(hallucinationProg, vert);
    gl.attachShader(hallucinationProg, frag);
    gl.linkProgram(hallucinationProg);

    if (!gl.getProgramParameter(hallucinationProg, gl.LINK_STATUS)) {
        console.error('[HALLUCINATION] link error:', gl.getProgramInfoLog(hallucinationProg));
        hallucinationProg = null;
        return;
    }

    hallucinationQuadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, hallucinationQuadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);

    hallucinationU = {
        res:       gl.getUniformLocation(hallucinationProg, "u_resolution"),
        time:      gl.getUniformLocation(hallucinationProg, "u_time"),
        trip:      gl.getUniformLocation(hallucinationProg, "u_trip"),
        tripAccum: gl.getUniformLocation(hallucinationProg, "u_tripAccum"),
        seed:      gl.getUniformLocation(hallucinationProg, "u_fractalSeed"),
        age:       gl.getUniformLocation(hallucinationProg, "u_blinkAge"),
    };
    console.log('[HALLUCINATION] overlay initialized OK');
}

function drawHallucinationOverlay(now, tripOverride, seedOverride, ageOverride) {
    if (!hallucinationProg) return;
    const blinkAge = (ageOverride !== undefined) ? ageOverride : (now - blinkPeakTime) * 0.001;
    const trip     = (tripOverride !== undefined) ? tripOverride : tripIntensity;
    const seed     = (seedOverride !== undefined) ? seedOverride : fractalSeed;

    // Accumulator: ratchets up across the session, never decreases
    _tripAccum += trip * 0.00008;

    // No early return — base layer is always active when trip > 0
    if (trip < 0.02 && _tripAccum < 0.1) return;

    gl.useProgram(hallucinationProg);
    gl.enable(gl.BLEND);
    // Premultiplied alpha: output.rgb already contains color*alpha
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.uniform2f(hallucinationU.res, canvas.width, canvas.height);
    gl.uniform1f(hallucinationU.time, now * 0.001);
    gl.uniform1f(hallucinationU.trip, trip);
    gl.uniform1f(hallucinationU.tripAccum, _tripAccum);
    gl.uniform1f(hallucinationU.seed, seed);
    gl.uniform1f(hallucinationU.age,  blinkAge);

    gl.bindBuffer(gl.ARRAY_BUFFER, hallucinationQuadBuf);
    const loc = gl.getAttribLocation(hallucinationProg, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.BLEND);
} 
var slideState = 'idle', slideStart = 0, slideDir = 0, slideOffset = 0, pendingPOV = null, povSwitchTime = -9999;
var isDragging = false;
var lastDragX = 0;
var lastDragY = 0;

const SLIDE_MS = 340, EDGE_SNAP_MS = 80;

window.isEngine1Dead = false;

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
  } else if (activePOV === 'right') { if (mx >= 1.14) beginSlide('center', +1); else if (mx <= -1.24) beginSlide('back', -1); }
  else if (activePOV === 'back') { if (mx >= 1.14) beginSlide('right', +1); }
}

const startDrag = (e, x, y) => {
  if (window.audioCtx && window.audioCtx.state === 'suspended') window.audioCtx.resume();
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
  window.mx = mx; window.my = my;
};

const endDrag = () => {
  isDragging = false;
  mx = 0;
  my = 0;
  window.mx = 0; window.my = 0;
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

canvas.addEventListener("pointerup", function(e) {
  if (!window.__mobileDebug) return;
  if (phase !== "open") return;

  if (e.target !== canvas) return;
  phase = "closing_switch"; start = performance.now(); timer = performance.now();
});

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
  while(nextMode === mode){ nextMode = Math.floor(Math.random() * 9) + 1; }
  lastMode = mode; mode = nextMode; modeSeed++;
  tripIntensity = 0.2 + Math.random() * 1.5;
  fractalSeed = Math.random() * 100.0;
  blinkPeakTime = performance.now();
  if(currentEngine) currentEngine.destroy();
  currentEngine = new ActiveMode(mode);
}

function initSideEngines() { if (!leftEngine) leftEngine = new ActiveMode(98); if (!rightEngine) rightEngine = new ActiveMode(99); if (!backEngine) backEngine = new ActiveMode(97); }

function render(now){
  if (window.butterchurnVisualizer) window.butterchurnVisualizer.render();

  let dt = now - lastNow;
  if (dt > 100 || dt <= 0) dt = 16.666;
  let timeScale = dt / 16.666;

  let audioIntensity = 0;
  if (window.audioAnalyser) { window.audioAnalyser.getByteFrequencyData(window.audioData); let sum = 0; for (let i=0; i<6; i++) sum += window.audioData[i]; audioIntensity = sum / (6 * 255); }
  let wakeVal = 1.0;
  
  if(phase === "sleeping"){
      wakeVal = 0.0;
      if(window.startWakeSequence && !currentEngine){ 
          mode = 1;
          phase = "waking"; 
          start = now; 
          currentEngine = new ActiveMode(mode); 
          initSideEngines(); 
      } else if (window.startTestSequence && !currentEngine) {
          mode = 1;
          phase = "open";
          start = now;
          timer = now;
          wakeVal = 1.0;
          currentEngine = new ActiveMode(mode);
          initSideEngines();
      }
  }
   else if (phase === "suspended") {
      wakeVal = 0.0;
  } else if(phase === "waking"){ let t = Math.min((now - start) / 3000, 1.0); wakeVal = 1.0 - Math.pow(1.0 - t, 3); if(t >= 1.0){ phase = "open"; timer = now; } }

  if (activePOV === 'center') {
    if (mode === 9 && phase === "open" && !window.__mobileDebug && currentEngine &&
               currentEngine.startTime > 0 && (now - currentEngine.startTime) * 0.001 >= 4.4) {
        phase = "closing_switch"; start = now; timer = now;
    } else if (phase === "open" && !window.__mobileDebug && now - timer > 9000 && activePOV === 'center') {
        phase = "closing_switch"; start = now; timer = now;
    }
  }

  if(phase==="closing_blink"){ blink=Math.min((now-start)/160, 1); if(blink>=1){ phase="black_blink"; start=now; } }
  else if(phase==="black_blink" && now-start>120){ phase="opening_blink"; start=now; fractalSeed=Math.random()*100.0; blinkPeakTime=now; }
  else if(phase==="opening_blink"){ blink=1.0-Math.min((now-start)/160, 1); if(blink<=0){ phase="open"; timer=now; blink=0; } }
  else if(phase==="closing_switch"){ blink=Math.min((now-start)/160, 1); if(blink>=1){ phase="black_switch"; start=now; advanceMode(); } }
  else if(phase==="black_switch" && now-start>200){ phase="opening_switch"; start=now; }
  else if(phase==="opening_switch"){ blink=1.0-Math.min((now-start)/160, 1); if(blink<=0){ phase="open"; timer=now; blink=0; } }

  if (phase === "open" || activePOV !== 'center') checkPOVThreshold();
  tickSlide(now);
  
  cx += (mx - cx) * Math.min(1.0, 0.12 * timeScale); 
  cy += (my - cy) * Math.min(1.0, 0.12 * timeScale);

  if (activePOV === 'back' && isDragging && mx < -1.0) {
    backZoomTarget = Math.min(1.0, backZoomTarget + (-mx - 1.0) * 0.012 * timeScale);
  } else {
    backZoomTarget = 0.0;
  }
  backZoom += (backZoomTarget - backZoom) * Math.min(1.0, 0.06 * timeScale);

  if (activePOV === 'back' && backZoom > 0.88) {
    const loader = document.getElementById("loading-screen");
    if (loader) loader.style.display = "none";

    let fadeOverlay = document.getElementById("zone-fade-overlay");
    if (!fadeOverlay) {
        fadeOverlay = document.createElement("div");
        fadeOverlay.id = "zone-fade-overlay";
        fadeOverlay.style.cssText = "position:fixed;inset:0;background:black;opacity:0;pointer-events:none;transition:opacity 1.0s ease-in-out;z-index:99999;";
        document.body.appendChild(fadeOverlay);
    }

    setTimeout(() => { fadeOverlay.style.opacity = "1"; }, 10);
    window.isEngine1Dead = true;

    setTimeout(() => {
        if (currentEngine) { currentEngine.destroy(); currentEngine = null; }
        if (leftEngine) { leftEngine.destroy(); leftEngine = null; }
        if (rightEngine) { rightEngine.destroy(); rightEngine = null; }
        if (backEngine) { backEngine.destroy(); backEngine = null; }

        activePOV = 'center';
        mx = 0; my = 0; cx = 0; cy = 0;
        backZoom = 0; backZoomTarget = 0;

        if (typeof window.startZone2 === 'function') {
            window.startZone2();
        }
        
        setTimeout(() => { fadeOverlay.style.opacity = "0"; }, 200);
    }, 1000);

    return;
  }

  if (activePOV === 'center') {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawBacklight(now, 0.35, audioIntensity);
    simStep(now);

    if(mode === 3 || mode === 9){ 
        if(Math.random()<0.08) flash=1.2; 
        flash *= Math.pow(0.86, timeScale); 
        shake=Math.max(flash, audioIntensity*0.07); 
    } else if (mode === 0) {
        flash *= Math.pow(0.8, timeScale); 
        let windGust = Math.random() < 0.2 ? Math.random() * 0.8 : 0.0;
        shake = 0.07 + (audioIntensity * 0.8) + windGust;
    } else { 
        flash *= Math.pow(0.8, timeScale); 
        shake=audioIntensity*0.1; 
    }

    if(currentEngine) currentEngine.render(now, cx, cy, audioIntensity, blink, flash, shake, wakeVal, modeSeed);
    drawHallucinationOverlay(now);
  } else if (activePOV === 'left') {
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    if (leftEngine) leftEngine.render(now, cx, cy, audioIntensity, blink, flash, shake, wakeVal, modeSeed);
    drawHallucinationOverlay(now);
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
    if (rightEngine) rightEngine.render(now, cx, cy, audioIntensity, blink, flash, shake, wakeVal, modeSeed);
    drawHallucinationOverlay(now);
  }
  if (activePOV === 'back') {
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    simStep(now);
    
    if (currentEngine && mirrorFBO) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, mirrorFBO.fbo);
        gl.viewport(0, 0, canvas.width, canvas.height);
        currentEngine.render(now, 0, 0, audioIntensity, 0, 0, 0, wakeVal, modeSeed);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    
    if (backEngine) {
        backEngine.render(now, cx, cy, audioIntensity, blink, flash, shake, wakeVal, modeSeed);
        backEngine.setZoom(backZoom);
        if (window.bcCanvas) {
            const loc = gl.getUniformLocation(backEngine.prog, 'u_bcResolution');
            if (loc) { gl.useProgram(backEngine.prog); gl.uniform2f(loc, window.bcCanvas.width, window.bcCanvas.height); }
        }
    }
    drawHallucinationOverlay(now);
  }
  lastNow = now;
}

initHallucinationOverlay();

const TARGET_FPS = IS_MOBILE ? 20 : 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

let __lastFrameTime = 0;

function __frameGovernor(now){
    if (window.isEngine1Dead) return;
    if(now - __lastFrameTime >= FRAME_INTERVAL){
        __lastFrameTime = now;
        render(now);
    }
    requestAnimationFrame(__frameGovernor);
}

requestAnimationFrame(__frameGovernor);/* engine2.js */

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
};window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules['z3_merged'] = `
precision highp float;

uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_time;
uniform float u_blink;
uniform float u_wake;
uniform float u_camZ;
uniform float u_camX;
uniform float u_yawOffset;
uniform float u_doorOpen;
uniform float u_doorSwitched;
uniform float u_isWalking;
uniform float u_shake;
uniform float u_flash;
uniform float u_zoom;
uniform float u_suctionFade;
uniform float u_trip;
uniform float u_modeSeed;
uniform float u_modeTime;
uniform float u_isOOB;
uniform float u_fractalActive;
uniform float u_fractalSeed;
uniform float u_blinkAge;

float _mHash(float x){ return fract(sin(x*127.1)*43758.5453); }
// Burning Ship — melting building structures, WebGL1-safe (no break)
float _burningShip(vec2 c){
    vec2 z=vec2(0.0); float si=0.0;
    for(int n=0;n<48;n++){
        z=vec2(abs(z.x),abs(z.y));
        z=vec2(z.x*z.x-z.y*z.y,2.0*z.x*z.y)+c;
        si+=(1.0-step(4.0,dot(z,z)));
    }
    return si/48.0;
}
// Julia set — organic alien tendrils
float _julia(vec2 z, vec2 c){
    float si=0.0;
    for(int n=0;n<36;n++){
        z=vec2(z.x*z.x-z.y*z.y,2.0*z.x*z.y)+c;
        si+=(1.0-step(4.0,dot(z,z)));
    }
    return si/36.0;
}
vec3 _mPal(float t, float seed){
    // Horror palette — sickly neon
    vec3 a=vec3(0.5,0.4,0.45);
    vec3 b=vec3(0.5,0.35,0.5);
    vec3 c_=vec3(1.0,0.8,1.0);
    vec3 d=vec3(_mHash(seed)*0.5,_mHash(seed+1.0)*0.3+0.1,_mHash(seed+2.0)*0.4+0.3);
    return a+b*cos(6.28318*(c_*t+d));
}

uniform sampler2D u_texLeft;
uniform sampler2D u_texRight;
uniform sampler2D u_texTop;
uniform sampler2D u_texBottom;
uniform sampler2D u_voidTex;
uniform sampler2D u_doorClosedTex;
uniform sampler2D u_doorOpenTex;
uniform sampler2D u_cockpitTex;

const int   MAX_STEPS = 100;
const float MAX_DIST  = 25.0;
const float SURF_DIST = 0.008;
const float FUSE_R      = 1.72;
const float FLOOR_Y     = -0.82;
const float AISLE_W     = 0.32;
const float SEAT_PITCH  = 0.79;

const float ROW_START   = 5.0;
const float EXIT_ROW_Z  = 12.0;
const float COCKPIT_Z   = 21.0;

mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c, -s, s, c); }
float hash2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float hash1(float x){ return fract(sin(x*127.1)*43758.5453); }

float noise2(vec2 p){
    vec2 i=floor(p); vec2 f=fract(p); vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash2(i),hash2(i+vec2(1,0)),u.x),mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),u.x),u.y);
}
float fbm(vec2 p){
    float v=0.0; float a=0.5;
    mat2 r=mat2(cos(0.5),sin(0.5),-sin(0.5),cos(0.5));
    for(int i=0;i<4;i++){ v+=a*noise2(p); p=r*p*2.0+vec2(100.0); a*=0.5; }
    return v;
}
float sdBox(vec3 p, vec3 b){ vec3 q = abs(p)-b; return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0); }
float sdRBox(vec3 p, vec3 b, float r){ return sdBox(p,b-r)-r; }

float sdSeat(vec3 p){
    float fy = FLOOR_Y;
    float cushion = sdBox(p-vec3(0, fy+0.24, 0),        vec3(0.20, 0.045, 0.20));
    float back    = sdBox(p-vec3(0, fy+0.54,-0.20),      vec3(0.20, 0.24,  0.025));
    float head    = sdRBox(p-vec3(0, fy+0.86,-0.20),     vec3(0.12, 0.07,  0.03), 0.01);
    float armL    = sdBox(p-vec3(-0.22, fy+0.32, -0.04), vec3(0.02, 0.055, 0.17));
    float armR    = sdBox(p-vec3( 0.22, fy+0.32, -0.04), vec3(0.02, 0.055, 0.17));
    float legs    = sdBox(p-vec3(0, fy+0.11, 0.08),      vec3(0.16, 0.11,  0.025));
    return min(min(min(cushion,back),min(head,legs)),min(armL,armR));
}

float seatRows(vec3 p){
    if(p.z < ROW_START - 0.5 || p.z > COCKPIT_Z - 1.0) return 8.0;
    if(abs(p.z - EXIT_ROW_Z) < 1.5) return 8.0; 
    float cellZ = mod(p.z - ROW_START, SEAT_PITCH) - SEAT_PITCH*0.5;
    vec3 lp = vec3(p.x, p.y, cellZ);
    float d = sdSeat(lp - vec3(-AISLE_W-0.25, 0, 0));
    d = min(d, sdSeat(lp - vec3(-AISLE_W-0.69, 0, 0)));
    d = min(d, sdSeat(lp - vec3( AISLE_W+0.25, 0, 0)));
    d = min(d, sdSeat(lp - vec3( AISLE_W+0.69, 0, 0)));
    return d;
}

float overheadBins(vec3 p){
    if(abs(p.z - EXIT_ROW_Z) < 1.4) return 8.0;
    float binL = sdBox(p-vec3(-1.08, 0.72, 12.0), vec3(0.32, 0.14, 10.0));
    float binR = sdBox(p-vec3( 1.08, 0.72, 12.0), vec3(0.32, 0.14, 10.0));
    return min(binL, binR);
}

float cockpitWall(vec3 p){
    float wall = sdBox(p - vec3(0.0, FLOOR_Y + 1.5, COCKPIT_Z), vec3(FUSE_R, 1.5, 0.05));
    wall = max(wall, length(p.xy)-FUSE_R);
    wall = max(wall, -(p.y-FLOOR_Y));
    float doorHole = sdBox(p-vec3(0.0, FLOOR_Y+0.95, COCKPIT_Z), vec3(0.4, 0.95, 0.1));
    wall = max(wall, -doorHole); 
    return wall;
}

float cockpitDoor(vec3 p) {
    return sdBox(p-vec3(0.0, FLOOR_Y+0.95, COCKPIT_Z - 0.01), vec3(0.4, 0.95, 0.02));
}

float exitDoor(vec3 p){
    // Door geometry stays visible when switched — shows open PNG texture
    // Only disappears entirely when doorOpen=1 (suction pulls it away)
    if(u_doorOpen > 0.5) return 8.0;
    if(p.x > 0.0) return 8.0; // port side only (-X)
    float doorH = 1.8;
    float doorD = 0.95;
    float distToWall = abs(length(p.xy) - FUSE_R);
    float dZ = abs(p.z - EXIT_ROW_Z) - doorD * 0.5;
    float dY = abs(p.y - (FLOOR_Y + 0.1 + doorH * 0.5)) - doorH * 0.5;
    return max(max(dZ, dY), distToWall - 0.12);
}

bool inExitHole(vec3 p){
    // Hole only opens when door is fully open (suction), not just switched
    if(u_doorOpen < 0.5) return false;
    return abs(p.z - EXIT_ROW_Z) < 0.48 &&
           p.y > FLOOR_Y + 0.05 && p.y < FLOOR_Y + 1.95 &&
           p.x < -FUSE_R + 0.25;
}

bool isWindowHit(vec3 p){
    float distToShell = abs(length(p.xy) - FUSE_R);
    if(distToShell > 0.08) return false;
    if(p.z < ROW_START || p.z > COCKPIT_Z) return false;
    float localZ = mod(p.z - ROW_START, SEAT_PITCH);
    float winCenter = SEAT_PITCH * 0.5;
    float winH = abs(p.y - 0.18);
    return abs(localZ - winCenter) < 0.07 && winH < 0.11;
}

float sdFractalStern(vec3 p) {
    // Fractal floats at the back end of the cabin (stern) — visible after 180 turn
    vec3 z = p - vec3(0.0, FLOOR_Y + 1.1, ROW_START + 0.5);
    z.xy *= rot(u_time * 0.13);
    z.yz *= rot(u_time * 0.17);
    float scale = 1.0;
    for(int i = 0; i < 7; i++){
        z = abs(z);
        if(z.x < z.y) z.xy = z.yx;
        if(z.x < z.z) z.xz = z.zx;
        if(z.y < z.z) z.yz = z.zy;
        z = z * 2.0 - vec3(0.7);
        scale *= 2.0;
    }
    return (length(z) - 0.15) / scale;
}

vec2 scene(vec3 p){
    float toWall  = FUSE_R - length(p.xy);
    float toFloor = p.y - FLOOR_Y;
    float toBack  = p.z - 3.49; 
    
    float d  = min(min(toWall, toFloor), toBack);
    float id = (d == toFloor) ? 2.0 : 1.0;
    
    if(inExitHole(p)){ d = max(d, 0.05); }

    float s = seatRows(p);
    if(s<d){ d=s; id=3.0; }
    float b = overheadBins(p);
    if(b<d){ d=b; id=4.0; }
    float c = cockpitWall(p);
    if(c<d){ d=c; id=5.0; }
    float cd = cockpitDoor(p);
    if(cd<d){ d=cd; id=10.0; }
    float ed = exitDoor(p);
    if(ed<d){ d=ed; id=9.0; }
    float frac = sdFractalStern(p);
    if(u_fractalActive > 0.5 && frac < d){ d = frac; id = 11.0; }
    
    return vec2(d, id);
}

vec3 calcNormal(vec3 p){
    vec2 e = vec2(0.005, 0.0);
    float d = scene(p).x;
    return normalize(vec3(scene(p+e.xyy).x-d, scene(p+e.yxy).x-d, scene(p+e.yyx).x-d));
}

vec3 emergencyStrip(vec3 p){
    float stripEdge = abs(abs(p.x)-AISLE_W);
    float onStrip = smoothstep(0.06, 0.0, stripEdge) * smoothstep(FLOOR_Y+0.06, FLOOR_Y+0.005, p.y);
    float pulse = 0.55 + 0.45*sin(u_time*1.3 + p.z*0.4);
    return vec3(0.95, 0.12, 0.04) * onStrip * pulse * 4.0;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    uv *= u_zoom; 

    float t_warp = u_time * 0.15;
    vec2 q = vec2(fbm(uv * 2.0 + vec2(0.0, t_warp)), fbm(uv * 2.0 + vec2(t_warp, 0.0)));
    vec2 warpR = vec2(
        fbm(uv * 2.0 + 2.0 * q + vec2(1.7, 9.2) + 0.15 * t_warp),
        fbm(uv * 2.0 + 2.0 * q + vec2(8.3, 2.8) + 0.12 * t_warp)
    );
    float liqAmp = mix(0.015, 0.10, u_isOOB) * u_trip;
    uv += (warpR - 0.5) * liqAmp;

    // Surge / snap — driven by modeSeed, randomizes on each blink
    float mt = u_modeTime * u_isOOB;
    float w1 = sin(mt * 0.4 + u_modeSeed);
    float w2 = sin(mt * 0.9 + u_modeSeed * 2.0);
    float w3 = sin(mt * 1.5 + u_modeSeed * 3.0);
    float surge = smoothstep(0.8, 1.0, (w1 + w2 + w3) / 3.0);
    float snap  = pow(surge, 2.0) * 8.0 * u_isOOB;
    uv *= 1.0 + mt * 0.003 + snap * 0.015;

    // Glitch scanline — random horizontal offset burst
    float gTick = floor(u_time * 16.0);
    if(step(0.979, hash1(gTick * 133.77 + u_modeSeed)) > 0.0)
        uv.x += (hash1(floor(uv.y * mix(10.0, 30.0, hash1(gTick * 2.1))) + gTick) - 0.5)
                 * 0.18 * clamp(u_trip, 0.0, 1.5);

    // Shake
    float latShake = u_shake * 5.0;
    uv.x += sin(u_time * 40.0) * 0.012 * latShake;
    uv.y += cos(u_time * 25.0) * 0.012 * latShake;

    float bobX = sin(u_time * 2.5) * 0.006 * u_isWalking;
    float bobY = cos(u_time * 5.0) * 0.008 * u_isWalking;
    
    vec3 ro = vec3(bobX + u_camX, bobY + snap * 0.08, u_camZ); 
    vec3 rd = normalize(vec3(uv.x, uv.y, 1.0));
    
    float yaw   = u_yawOffset - (u_mouse.x * 0.42);
    float pitch = u_mouse.y * 0.26;
    rd.yz *= rot(pitch);
    rd.xz *= rot(yaw);   

    if (u_doorSwitched > 0.5) {
        rd.x += sin(u_time*2.3)*0.015 * latShake; 
        rd = normalize(rd);
    }

    vec3 finalCol = vec3(0.0);
    float t_march = 0.0;
    bool doRaymarch = false;
    float t_box = 0.0;

    if (u_camZ < 3.49) {
        vec3 box = vec3(0.5625, 1.0, 3.5); 
        vec3 tPos = (box * sign(rd) - ro) / rd;
        t_box = min(min(tPos.x, tPos.y), tPos.z);
        vec3 boxHit = ro + rd * t_box;
        vec3 nPos = boxHit / box;
        vec3 absPos = abs(nPos);
        
        int wallID = -1; 
        vec2 tileUV;
        
        if (absPos.x > absPos.y && absPos.x > absPos.z) {
            if (nPos.x > 0.0) { tileUV = vec2(-nPos.z, -nPos.y) * 0.5 + 0.5; finalCol = texture2D(u_texRight, tileUV).rgb; wallID = 1; } 
            else              { tileUV = vec2(nPos.z, -nPos.y) * 0.5 + 0.5; finalCol = texture2D(u_texLeft, tileUV).rgb; wallID = 0; }
        } else if (absPos.y > absPos.x && absPos.y > absPos.z) {
            if (nPos.y > 0.0) { tileUV = vec2(nPos.x, -nPos.z) * 0.5 + 0.5; finalCol = texture2D(u_texTop, tileUV).rgb; wallID = 4; } 
            else              { tileUV = vec2(nPos.x, nPos.z) * 0.5 + 0.5; finalCol = texture2D(u_texBottom, tileUV).rgb; wallID = 4; }
        } else {
            if (nPos.z > 0.0) { wallID = 2; } 
            else              { wallID = 3; finalCol = vec3(0.0); } 
        }

        if (wallID == 2) {
            doRaymarch = true;
            t_march = t_box;
        } else if (wallID != 3) {
            vec4 tcol = (wallID==1) ? texture2D(u_texRight, tileUV) : ((wallID==0) ? texture2D(u_texLeft, tileUV) : vec4(1.0));
            if (tcol.a < 0.1 || (tcol.g > 0.4 && tcol.r < 0.25 && tcol.b < 0.25)) {
                // Doorway — show dark interior room glimpse, not empty void
                float depthFog = exp(-t_box * 0.4);
                vec3 roomCol = (wallID == 0)
                    ? vec3(0.06, 0.04, 0.04)   // left door: dark bathroom warm
                    : vec3(0.04, 0.04, 0.07);  // right door: dark bedroom cool
                // Subtle voidTex bleed so it's not completely dead
                vec2 vuv = gl_FragCoord.xy / u_resolution.xy;
                vec3 voidHint = texture2D(u_voidTex, vuv).rgb * 0.15;
                finalCol = mix(roomCol + voidHint, vec3(0.03, 0.01, 0.01), 1.0 - depthFog);
            } else {
                finalCol = tcol.rgb;
                float fogFactor = exp(-t_box * 0.5);
                finalCol = mix(vec3(0.03, 0.01, 0.01), finalCol, fogFactor);
                float lum = dot(finalCol, vec3(0.299, 0.587, 0.114));
                finalCol = mix(finalCol, vec3(lum * 0.85, lum * 0.7, lum * 0.7), 0.4);
            }
        }
    } else {
        doRaymarch = true;
        t_march = 0.0;
    }

    if (doRaymarch) {
        vec3 cp_ro = ro + rd * t_march; 

        float t = 0.0; float mid = 0.0; bool hit = false;
        for(int i=0; i<MAX_STEPS; i++){
            vec3 p = cp_ro + rd*t;
            vec2 res = scene(p);
            if(res.x < SURF_DIST){ mid = res.y; hit = true; break; }
            if(t > MAX_DIST) break;
            t += res.x * 0.7;
        }

        vec3 col = vec3(0.01, 0.012, 0.025);
        vec3 fogCol = vec3(0.008, 0.008, 0.012);

        if(!hit) {
            vec2 vuv = gl_FragCoord.xy / u_resolution.xy;
            if(u_doorOpen > 0.5) {
                // Ray escaped through door aperture — show the exterior
                col = texture2D(u_voidTex, vuv).rgb * 1.2;
            } else {
                // Ray escaped off the back end — conceal with fog
                col = mix(texture2D(u_voidTex, vuv).rgb * 0.3, fogCol, 0.85);
            }
        } else {
            vec3 p = cp_ro + rd*t;
            float totalDist = t_march + t;
            float fogAmt = clamp((totalDist - 6.0) / 12.0, 0.0, 1.0);
            fogAmt = fogAmt * fogAmt;
            
            if(mid > 4.5 && mid < 5.5) { 
                vec3 n = calcNormal(p);
                col = vec3(0.1, 0.12, 0.15) * (max(dot(n, vec3(0,0,-1)), 0.0) * 0.4 + 0.15);
                col = mix(col, fogCol, fogAmt);

            } else if(mid > 9.5 && mid < 10.5) { 
                vec2 cpUV = vec2((p.x + 0.4) / 0.80, 1.0 - ((p.y - FLOOR_Y) / 1.9));
                vec4 cpTex = texture2D(u_cockpitTex, clamp(cpUV, 0.0, 1.0));
                
                if (cpTex.a < 0.2) {
                    vec2 vuv = gl_FragCoord.xy / u_resolution.xy;
                    col = texture2D(u_voidTex, vuv).rgb * 1.2;
                } else {
                    vec3 n = calcNormal(p);
                    col = cpTex.rgb * (max(dot(n, vec3(0,0,-1)), 0.0) * 0.6 + 0.4);
                    col = mix(col, fogCol, fogAmt);
                }

            } else if(mid > 8.5 && mid < 9.5) { 
                // Exit door — PNG mapped onto cylinder wall surface
                float doorH = 1.8;
                float doorD = 0.9;
                // U maps along Z, V maps down Y — same for both sides
                float u_coord = clamp((p.z - (EXIT_ROW_Z - doorD * 0.5)) / doorD, 0.0, 1.0);
                float v_coord = clamp(1.0 - (p.y - (FLOOR_Y + 0.1)) / doorH, 0.0, 1.0);
                // No mirror — single port door
                vec2 doorUV = vec2(u_coord, v_coord);
                vec4 dTex = (u_doorSwitched > 0.5)
                    ? texture2D(u_doorOpenTex,   clamp(doorUV, 0.0, 1.0))
                    : texture2D(u_doorClosedTex, clamp(doorUV, 0.0, 1.0));
                vec3 n = calcNormal(p);
                // Door face normal points inward (toward aisle)
                float diff = max(dot(n, normalize(vec3(-sign(p.x), 0.1, 0.0))), 0.0) * 0.7 + 0.3;
                col = dTex.rgb * diff;
                col = mix(col, fogCol, fogAmt);

            } else if(mid > 10.5 && mid < 11.5) {
                // Stern fractal — visible after 180 turn at cockpit
                // Pulsing, breathing geometry that shouldn't exist
                vec3 n = calcNormal(p);
                float pulse = 0.5 + 0.5 * sin(u_time * 2.5 + length(p) * 3.0);
                float pulse2 = 0.5 + 0.5 * sin(u_time * 1.1 + p.y * 5.0);
                // Deep red → magenta → void black cycling
                vec3 fracCol = mix(vec3(0.6, 0.02, 0.08), vec3(0.8, 0.05, 0.5), pulse);
                fracCol = mix(fracCol, vec3(0.02, 0.0, 0.05), pulse2 * 0.4);
                // Lighting: overhead + emergency strip glow
                float diff = max(dot(n, normalize(vec3(0.0, 1.0, 1.0))), 0.0) * 0.8 + 0.2;
                // Inner glow — brighter at the core
                float coreDist = length(p - vec3(0.0, FLOOR_Y + 1.1, ROW_START + 0.5));
                float coreGlow = exp(-coreDist * 2.0) * 1.5;
                col = fracCol * diff + vec3(0.9, 0.1, 0.3) * coreGlow;
                // Fractal ignores fog — it glows through the darkness

            } else if(mid < 1.5 && isWindowHit(p)) {
                vec2 vuv = gl_FragCoord.xy / u_resolution.xy;
                col = texture2D(u_voidTex, vuv).rgb * mix(1.0, 1.5, fogAmt);

            } else {
                vec3 n = calcNormal(p);
                vec3 matCol;
                if(mid < 1.5)      matCol = vec3(0.45, 0.47, 0.50);
                else if(mid < 2.5) matCol = vec3(0.14, 0.14, 0.16) + hash2(floor(p.xz*18.0))*0.04;
                else if(mid < 3.5) matCol = vec3(0.15, 0.17, 0.32);
                else               matCol = vec3(0.48, 0.48, 0.52);

                float flicker = 0.7 + 0.3 * sin(u_time*3.9) * sin(u_time*5.7+1.4);
                vec3 ambient = vec3(0.22, 0.24, 0.28) * flicker;
                vec3 cockpitLit = vec3(0.15, 0.22, 0.28) * max(dot(n, vec3(0,0,-1)), 0.0) * smoothstep(COCKPIT_Z, COCKPIT_Z-10.0, p.z) * 2.5;

                col = matCol * (ambient + emergencyStrip(p) + cockpitLit);
                col = mix(col, fogCol, fogAmt);
            }
        }
        
        col += vec3(1.0, 0.9, 0.9) * u_flash; 
        finalCol = col;
    } 
    
    finalCol *= smoothstep(1.3, 0.2, length(uv)) * 0.65;

    // ═══ CABIN HALLUCINATION — Burning Ship/Julia bleeding into reality ═══
    // Active after cockpit. Builds from peripheral halos to full-screen horror.
    if (u_fractalActive > 0.5) {
        vec2 suv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
        float r = length(suv);
        float periph = smoothstep(0.18, 0.85, r);

        // Blink surge + persistent base (never fully gone)
        float env = smoothstep(6.0, 0.0, u_blinkAge) * 0.35 + 0.15;
        float strength = periph * env * u_trip;

        if (strength > 0.005) {
            float typeRoll = _mHash(u_fractalSeed * 3.7);
            float zoom = mix(0.8, 3.5, _mHash(u_fractalSeed * 1.3));
            vec2 drift = vec2(sin(u_time*0.03+u_fractalSeed)*0.2, cos(u_time*0.02+u_fractalSeed*1.7)*0.2);
            vec2 sUV = suv / zoom + drift;
            float val = 0.0;

            if(typeRoll < 0.45) {
                // Burning Ship — melting buildings
                vec2 region = vec2(-1.76, -0.028) + vec2(_mHash(u_fractalSeed*5.1)-0.5, _mHash(u_fractalSeed*7.3)-0.5)*0.3;
                val = _burningShip(sUV * 0.5 + region);
            } else if(typeRoll < 0.75) {
                // Julia set — organic tendrils
                vec2 jc = vec2(-0.8+sin(u_time*0.015+u_fractalSeed)*0.15, 0.156+cos(u_time*0.012)*0.1);
                val = _julia(sUV * 0.8, jc);
            } else {
                // Deep Burning Ship zoom — antenna/mast structures
                val = _burningShip(sUV * 0.08 + vec2(-1.755, -0.022));
            }

            val = fract(val * 3.5 + u_time * 0.04);
            vec3 fracHalo = _mPal(val, u_fractalSeed * 11.3);
            fracHalo *= smoothstep(0.0, 0.12, val) * smoothstep(1.0, 0.7, val);
            float pulse = 0.55 + 0.45 * sin(u_time * (0.9 + _mHash(u_fractalSeed*4.0)) + u_fractalSeed);
            finalCol += fracHalo * strength * pulse;

            // Second layer: faint ghost from different region — creates depth
            float ghost = _burningShip(suv * 0.3 + vec2(-1.77, -0.01) + drift * 0.5);
            ghost = fract(ghost * 2.0 + u_time * 0.025);
            vec3 ghostCol = _mPal(ghost, u_fractalSeed * 7.0 + 50.0) * smoothstep(0.0, 0.15, ghost);
            finalCol += ghostCol * periph * env * 0.06 * u_trip;
        }
    }

    gl_FragColor = vec4(finalCol * (1.0 - u_blink) * smoothstep(0.0, 0.8, u_wake), 1.0);
}
`;

GLSL.modules['z3_fall'] = `
precision highp float;

uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_time;
uniform float u_fallProgress;
uniform float u_blink;

const int MAX_STEPS = 90;
const float MAX_DIST = 80.0;
const float SURF_DIST = 0.015;

float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }
float sdBox(vec3 p, vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0); }

vec2 map(vec3 p) {
    vec2 cell = floor(p.xz * 0.4);
    vec2 local = fract(p.xz * 0.4) - 0.5;
    
    bool isTarget = (cell.x == 0.0 && cell.y == 0.0);
    float h = isTarget ? 3.0 : hash(cell) * 6.0 + 1.0;
    
    float dFloor = p.y;
    
    vec3 q = vec3(local.x * 2.5, p.y - h*0.5, local.y * 2.5);
    float dBldg = sdBox(q, vec3(0.8, h*0.5, 0.8)); 
    dBldg /= 2.5; 
    
    float d = min(dFloor, dBldg);
    float id = (d == dFloor) ? 1.0 : (isTarget ? 3.0 : 2.0);
    return vec2(d, id);
}

vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.01, 0.0);
    float d = map(p).x;
    return normalize(vec3(map(p+e.xyy).x-d, map(p+e.yxy).x-d, map(p+e.yyx).x-d));
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    
    float startY = 60.0;
    float endY = 3.5;
    float ease = 1.0 - pow(1.0 - u_fallProgress, 2.0);
    float camY = mix(startY, endY, ease);
    
    vec3 ro = vec3(0.0, camY, 0.0);
    
    ro.x += sin(u_fallProgress * 6.0) * 3.0 * (1.0 - u_fallProgress);
    ro.z += cos(u_fallProgress * 5.0) * 3.0 * (1.0 - u_fallProgress);
    
    vec3 fwd = normalize(vec3(0.0, -1.0, 0.0));
    vec3 right = normalize(vec3(1.0, 0.0, 0.0));
    vec3 up = cross(right, fwd);
    
    float spin = u_fallProgress * 3.1415 * 0.5;
    right.xz *= rot(spin);
    up.xz *= rot(spin);
    
    vec3 rd = normalize(fwd + uv.x * right + uv.y * up);
    
    rd.xy *= rot(u_mouse.y * 0.2);
    rd.xz *= rot(u_mouse.x * 0.2);

    float t = 0.0;
    float id = 0.0;
    for(int i=0; i<MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        vec2 res = map(p);
        if(res.x < SURF_DIST) { id = res.y; break; }
        if(t > MAX_DIST) break;
        t += res.x * 0.7; 
    }

    vec3 col = vec3(0.01, 0.01, 0.02); 
    
    if(t < MAX_DIST) {
        vec3 p = ro + rd * t;
        vec3 n = calcNormal(p);
        
        if(id == 1.0) { 
            col = vec3(0.04, 0.03, 0.02);
            float gridX = smoothstep(0.9, 1.0, sin(p.x * 3.1415 * 0.4));
            float gridZ = smoothstep(0.9, 1.0, sin(p.z * 3.1415 * 0.4));
            col += vec3(1.0, 0.6, 0.2) * (gridX + gridZ) * 0.7; 
            
            float cars = step(0.95, fract(p.x * 2.0 + u_time * 2.0)) * gridZ;
            cars += step(0.95, fract(p.z * 2.0 - u_time * 2.5)) * gridX;
            col += vec3(1.0, 0.2, 0.1) * cars;
            
        } else if(id == 2.0) { 
            col = vec3(0.02, 0.02, 0.03);
            if (abs(n.y) < 0.1) { 
                vec2 winUV = vec2(dot(p, vec3(1,0,0)) + dot(p, vec3(0,0,1)), p.y);
                float win = step(0.7, fract(winUV.x * 3.0)) * step(0.7, fract(winUV.y * 3.0));
                float r = hash(floor(winUV * 3.0) + floor(p.xz));
                if(r > 0.8) col += vec3(0.8, 0.8, 0.6) * win; 
                if(r > 0.95) col += vec3(0.4, 0.7, 1.0) * win; 
            } else { 
                col = vec3(0.01, 0.01, 0.015);
                float ac = step(0.9, fract(p.x*2.0)*fract(p.z*2.0));
                col += vec3(0.1) * ac;
            }
        } else if(id == 3.0) { 
            col = vec3(0.03);
            if (abs(n.y) > 0.9) { 
                float dCenter = length(p.xz);
                float ring = smoothstep(0.08, 0.0, abs(dCenter - 0.8));
                
                float pulse = 0.5 + 0.5 * sin(u_time * 4.0);
                col += vec3(1.0, 0.1, 0.1) * ring * pulse * 2.0; 
                
                float H = smoothstep(0.05, 0.0, abs(p.x)) * step(abs(p.z), 0.4) + 
                          smoothstep(0.05, 0.0, abs(p.x - 0.4)) * step(abs(p.z), 0.4) + 
                          smoothstep(0.05, 0.0, abs(p.x + 0.4)) * step(abs(p.z), 0.4) +
                          smoothstep(0.05, 0.0, abs(p.z)) * step(abs(p.x), 0.4); 
                col += vec3(0.8) * H;
            } else {
                vec2 winUV = vec2(dot(p, vec3(1,0,0)) + dot(p, vec3(0,0,1)), p.y);
                float win = step(0.7, fract(winUV.x * 3.0)) * step(0.7, fract(winUV.y * 3.0));
                if(hash(floor(winUV * 3.0) + floor(p.xz)) > 0.5) col += vec3(0.9, 0.2, 0.2) * win;
            }
        }
        
        col = mix(col, vec3(0.01, 0.015, 0.02), 1.0 - exp(-t * 0.02));
    }
    
    col += vec3(1.0, 0.5, 0.2) * 0.08 * (1.0 - exp(-t * 0.005));
    
    float flash = smoothstep(0.15, 0.0, u_fallProgress) + smoothstep(0.64, 0.666, u_fallProgress);
    col = mix(col, vec3(1.0), clamp(flash, 0.0, 1.0));
    
    gl_FragColor = vec4(col * (1.0 - u_blink), 1.0);
}
`;

let z3SpaceHeld = false;
let z3TouchHeld = false;

window.addEventListener("keydown", (e) => { if (e.code === "Space") { e.preventDefault(); z3SpaceHeld = true; } });
window.addEventListener("keyup", (e) => { if (e.code === "Space") { e.preventDefault(); z3SpaceHeld = false; } });

function checkZ3Touch(e) {
    if (!e.touches) return;
    if (!window.currentZone3 && !z3SpaceHeld) { z3TouchHeld = false; return; }
    let isWalking = false;
    const inWalkZone = (typeof window.__mobileWalkZoneContains === "function")
        ? window.__mobileWalkZoneContains
        : ((x, y) => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            return y >= h * 0.68 && x >= w * 0.30 && x <= w * 0.70;
        });
    for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (inWalkZone(t.clientX, t.clientY)) {
            isWalking = true;
            break;
        }
    }
    z3TouchHeld = isWalking;
}

window.addEventListener("touchstart", checkZ3Touch, {passive: true});
window.addEventListener("touchmove", checkZ3Touch, {passive: true});
window.addEventListener("touchend", checkZ3Touch, {passive: true});
window.addEventListener("touchcancel", () => { z3TouchHeld = false; });

class Zone3Engine {
    constructor() {
        this.bathroomProg = this._buildProg('z3_bathroom');
        this.centerProg   = this._buildProg('z3_merged');
        this.fallProg     = this._buildProg('z3_fall');

        this.texBathroomHole = loadStaticTex("files/img/rooms/bathroom-hole.png");
        this.texDoorClosed   = loadStaticTex("files/img/rooms/door-closed.png");
        this.texDoorOpen     = loadStaticTex("files/img/rooms/door-open.png");
        this.texCockpit      = loadStaticTex("files/img/rooms/cockpit.png");
        
        this.texHallLeft     = loadStaticTex("files/img/rooms/hallway/RIGHTWALL.png");
        this.texHallRight    = loadStaticTex("files/img/rooms/hallway/LEFTWALL.png");
        this.texHallTop      = loadStaticTex("files/img/rooms/hallway/TOP.png");
        this.texHallBottom   = loadStaticTex("files/img/rooms/hallway/GROUND.png");
        
        this.quadBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);

        this.voidFBO = this._makeFBO();
        this.voidMode = (typeof ActiveMode !== 'undefined') ? new ActiveMode(2) : null;
        if(this.voidMode) this.voidMode.maskTex = this._makeBlankTex();

        this.activePOV = 'left'; 
        this.centerPhase = 'hallway'; 
        this.HALL_START_Z = -3.4; this.HALL_END_Z = 3.5; this.EXIT_ROW_Z = 12.0; this.COCKPIT_Z = 21.0;
        
        this.camZ = this.HALL_START_Z; this.camX = 0.0;
        this.cabinState = 'forward'; this.doorOpen = 0.0; this.suctionShake = 0.0; this.flashVal = 0.0;
        this.yawOffset = 0.0; this.yawTarget = 0.0;
        this.zoom = 1.0; this.zoomTarget = 1.0;
        this.suctionFade = 0.0;
        this.fractalActive = 0.0;
        this.doorSwitched = 0.0;
        this.suctionYawSnapped = false;
        
        this.fallStart = 0;
        this.fallProgress = 0.0;
        this.isResetting = false; 

        this.slideState = 'in'; this.slideStart = performance.now();
        this.cx = 0; this.cy = 0;
        this.lastRenderTime = performance.now();

        // Camera warp state — randomizes on each blink
        this.z3ModeSeed = Math.random() * 100.0;
        this.z3Trip     = 0.5;
        this.z3ModeTime = 0.0;
        this.z3IsOOB    = 0.0;
        this.z3ModeStart = performance.now();
        this.z3BlinkPeakTime = performance.now();

        // Blink state
        this.lastBlinkTime    = performance.now();
        this.nextBlinkInterval = 3000 + Math.random() * 6000;
        this.blinking   = false;
        this.blinkStart  = 0;
        this.blinkSeeded = false;
        this.rBlink      = 0.0;

        // Red continuation from engine2 crash impact
        this.z3RedStart = performance.now();
        this.z3RedDone = false;

        // Audio
        this._initAudio();
    }

    _initAudio() {
        const ctx = window.__audioCtx;
        if (!ctx) return;
        // Leave wet/dry exactly where engine2 left them.
        // Only add the cabin hum oscillator.
        try {
            this._humOsc = ctx.createOscillator();
            this._humGain = ctx.createGain();
            this._humOsc.type = 'sine';
            this._humOsc.frequency.value = 62;
            this._humGain.gain.value = 0.0;
            this._humOsc.connect(this._humGain);
            this._humGain.connect(ctx.destination);
            this._humOsc.start();
        } catch(e) {}
    }

    _updateAudio(now) {
        const ctx = window.__audioCtx;
        if (!ctx) return;
        const t = ctx.currentTime;
        const wet = window.__audioWetGain;
        const dry = window.__audioDryGain;
        const filt = window.__audioFilter;

        if (this.centerPhase === 'hallway') {
            // Do nothing — leave engine2's levels alone

        } else if (this.centerPhase === 'cabin') {
            const p = Math.max(0, Math.min(1,
                (this.camZ - this.HALL_END_Z) / (this.COCKPIT_Z - this.HALL_END_Z)));

            // Music stays, filter closes and reverb drops as you go deeper
            if (wet)  wet.gain.setTargetAtTime(0.3 - p * 0.15, t, 2.0);
            if (filt) filt.frequency.setTargetAtTime(500 - p * 220, t, 2.0);

            // Hum builds
            if (this._humGain) this._humGain.gain.setTargetAtTime(p * 0.025, t, 3.0);

            // Turbulence: filter stutters
            if (this.cabinState === 'cockpit_turbulence') {
                if (filt) filt.frequency.setTargetAtTime(200 + Math.random() * 150, t, 0.08);
            }

            // Suction: filter closes hard, hum rises
            if (this.cabinState === 'suction') {
                const pull = Math.abs(this.camX) / 1.1;
                if (filt) filt.frequency.setTargetAtTime(Math.max(80, 280 - pull * 200), t, 0.4);
                if (this._humGain) this._humGain.gain.setTargetAtTime(0.025 + pull * 0.04, t, 0.4);
                if (this._humOsc)  this._humOsc.frequency.setTargetAtTime(62 + pull * 30, t, 0.4);
            }

        } else if (this.centerPhase === 'falling') {
            if (wet) wet.gain.setTargetAtTime(0.0, t, 0.5);
            if (dry) dry.gain.setTargetAtTime(0.0, t, 0.5);
            if (this._humGain) this._humGain.gain.setTargetAtTime(0.0, t, 0.3);
        }
    }

    _destroyAudio() {
        try {
            if (this._humOsc)  { this._humOsc.stop(); this._humOsc.disconnect(); }
            if (this._humGain) this._humGain.disconnect();
        } catch(e) {}
    }

    _buildProg(fragKey) {
        if (!GLSL.modules[fragKey]) return null;
        const p = gl.createProgram();
        gl.attachShader(p, compile(gl.VERTEX_SHADER, GLSL.vert));
        gl.attachShader(p, compile(gl.FRAGMENT_SHADER, GLSL.modules[fragKey]));
        gl.linkProgram(p);
        return p;
    }

    _makeFBO() {
        const cvs = document.getElementById('c');
        const w = cvs ? cvs.width : window.innerWidth;
        const h = cvs ? cvs.height : window.innerHeight;
        const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return { fbo, tex };
    }

    _makeBlankTex() {
        const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,0]));
        return tex;
    }

    _drawQuad(prog) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
        const loc = gl.getAttribLocation(prog, "p");
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    _drawOverlay(r, g, b, a) {
        if (a <= 0.0) return;
        if (!this._overlayProg) {
            this._overlayProg = gl.createProgram();
            gl.attachShader(this._overlayProg, compile(gl.VERTEX_SHADER, GLSL.vert));
            gl.attachShader(this._overlayProg, compile(gl.FRAGMENT_SHADER,
                `precision mediump float; uniform vec4 u_col; void main(){ gl_FragColor = u_col; }`));
            gl.linkProgram(this._overlayProg);
        }
        gl.useProgram(this._overlayProg);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform4f(gl.getUniformLocation(this._overlayProg, "u_col"), r, g, b, a);
        this._drawQuad(this._overlayProg);
        gl.disable(gl.BLEND);
    }

    tickSlide(now) {
        if (this.slideState === 'idle') return;
        const elapsed = now - this.slideStart;
        if (this.slideState === 'out') {
            if (elapsed >= 180) { this.slideState = 'black'; this.slideStart = now; this.activePOV = this.pendingPOV; this.cx = 0; this.cy = 0; }
        } else if (this.slideState === 'black') {
            if (elapsed >= 50) { this.slideState = 'in'; this.slideStart = now; }
        } else if (this.slideState === 'in') {
            if (elapsed >= 180) { this.slideState = 'idle'; }
        }
    }

    checkPOVThreshold(now, currentMx) {
        if (this.slideState !== 'idle' || (now - this.povSwitchTime) < 600) return;
        
        if (this.centerPhase === 'cabin' && Math.abs(this.camZ - this.EXIT_ROW_Z) < 1.5) {
            if (this.cabinState !== 'door_look' && this.cabinState !== 'suction') {
                if (currentMx <= -0.5) { 

                    this.previousState = this.cabinState; 
                    this.cabinState = 'door_look'; 
                    this.yawTarget = (this.previousState === 'backward') ? 1.5 * Math.PI : Math.PI / 2; 
                    this.zoomTarget = 2.0; 
                    this.cx = 0; this.cy = 0; this.povSwitchTime = now; 
                    window.dispatchEvent(new Event('mouseup')); window.dispatchEvent(new Event('touchend'));
                } else if (currentMx >= 0.5) { 

                    this.previousState = this.cabinState; 
                    this.cabinState = 'door_look'; 
                    this.yawTarget = (this.previousState === 'backward') ? Math.PI / 2 : -Math.PI / 2; 
                    this.zoomTarget = 2.0; 
                    this.cx = 0; this.cy = 0; this.povSwitchTime = now; 
                    window.dispatchEvent(new Event('mouseup')); window.dispatchEvent(new Event('touchend'));
                }
            } else if (this.cabinState === 'door_look') {
                if (Math.abs(currentMx) >= 0.5) { 
                    this.cabinState = this.previousState || 'forward'; 
                    this.yawTarget = (this.cabinState === 'backward') ? Math.PI : 0.0; 
                    this.zoomTarget = 1.0; 
                    this.cx = 0; this.cy = 0; this.povSwitchTime = now; 
                    window.dispatchEvent(new Event('mouseup')); window.dispatchEvent(new Event('touchend'));
                }
            }
        }
        
        if (this.activePOV === 'left') {
            if (Math.abs(currentMx) >= 0.75) { this.pendingPOV = 'center'; this.slideState = 'out'; this.slideStart = now; }
        }
    }

    updateCenterState(now, timeScale) {
        if (this.centerPhase === 'cabin' && this.camZ < 3.5) {
            this.camZ = 3.5;
        }

        let isWalking = z3SpaceHeld || z3TouchHeld;
        let walkSpeed = 0.014 * timeScale;

        if (this.centerPhase === 'hallway') {
            if (isWalking) this.camZ += walkSpeed; 
            if (this.camZ >= this.HALL_END_Z) { this.centerPhase = 'cabin'; this.cabinState = 'forward'; this.cx = 0; this.cy = 0;}
        } else if (this.centerPhase === 'cabin') {
            switch (this.cabinState) {
                case 'walking_forward':
                case 'forward':
                    if (isWalking) this.camZ = Math.min(this.COCKPIT_Z - 1.5, this.camZ + walkSpeed); 
                    if (this.camZ >= this.COCKPIT_Z - 1.6) { this.cabinState = 'cockpit_turbulence'; this.turbulenceStart = now; this.cx=0; this.cy=0;}
                    break;
                case 'door_look':
                    break;
                case 'cockpit_turbulence':
                    let tElapsed = now - this.turbulenceStart;
                    this.suctionShake = Math.min(0.04, tElapsed / 30000.0);
                    this.flashVal = (tElapsed > 500 && Math.random() > 0.7) ? 0.8 : 0.0;
                    if (tElapsed > 3000) { this.cabinState = 'backward'; this.yawTarget = Math.PI; this.suctionShake = 0.0; this.flashVal = 0.0; this.cx=0; this.cy=0; this.fractalActive = 1.0; this.doorSwitched = 1.0; }
                    break;
                case 'backward':
                    if (isWalking) this.camZ = Math.max(this.EXIT_ROW_Z, this.camZ - walkSpeed);
                    if (this.camZ <= this.EXIT_ROW_Z + 0.2) { 
                        this.cabinState = 'suction'; 
                        this.doorOpen = 1.0;
                        this.zoomTarget = 1.5;
                        this.cx = 0; this.cy = 0;
                    }
                    break;
                case 'suction':
                    this.suctionShake = 0.015;
                    if (!this.suctionYawSnapped) {
                        // Phase 1: drift toward port door (-X)
                        this.camX += (-1.1 - this.camX) * Math.min(1.0, 0.004 * timeScale);
                        if (this.camX < -0.55) {
                            this.suctionYawSnapped = true;
                            this.yawTarget = Math.PI * 0.5; // from stern (PI), left turn faces port (-X)
                            this.zoomTarget = 1.8;
                        }
                    } else {
                        // Continue drifting out through door
                        this.camX += (-1.4 - this.camX) * Math.min(1.0, 0.006 * timeScale);
                        if (this.camX < -1.2) {
                            this.centerPhase = 'falling';
                            this.fallStart = now;
                            this.cx = 0; this.cy = 0;
                        }
                    }
                    break;
            }
            this.yawOffset += (this.yawTarget - this.yawOffset) * Math.min(1.0, 0.08 * timeScale);
            this.zoom += (this.zoomTarget - this.zoom) * Math.min(1.0, 0.08 * timeScale);
        } else if (this.centerPhase === 'falling') {
            let elapsedFall = now - this.fallStart;
            this.fallProgress = Math.min(1.0, elapsedFall / 10000.0);
            
            if (elapsedFall >= 10000 && !this.isResetting) {
                this.isResetting = true;
                
                let flashOverlay = document.createElement("div");
                flashOverlay.style.cssText = "position:fixed;inset:0;background:#ffffff;z-index:999999;pointer-events:none;";
                document.body.appendChild(flashOverlay);
                
                setTimeout(() => {
                    window.location.reload(true);
                }, 50);
            }
        }
    }

    render(now, currentMx, currentMy) {
        if (this.isResetting) return; 

        let dt = now - this.lastRenderTime;
        if (dt > 100 || dt <= 0) dt = 16.666;
        this.lastRenderTime = now;
        window.lastNow = now;
        
        let timeScale = dt / 16.666;

        if (typeof this.cx === 'undefined') { this.cx = currentMx; this.cy = currentMy; }
        
        if (this.centerPhase !== 'falling') {
            this.cx += (currentMx - this.cx) * Math.min(1.0, 0.12 * timeScale); 
            this.cy += (currentMy - this.cy) * Math.min(1.0, 0.12 * timeScale);
        } else {
            this.cx = currentMx;
            this.cy = currentMy;
        }

        const cvs = document.getElementById('c');
        const cWidth = cvs ? cvs.width : window.innerWidth;
        const cHeight = cvs ? cvs.height : window.innerHeight;

        this.tickSlide(now); 
        this.checkPOVThreshold(now, currentMx);
        
        if (now - this.lastBlinkTime > this.nextBlinkInterval) { 
            this.blinking = true; this.blinkStart = now; this.lastBlinkTime = now; this.nextBlinkInterval = 4000 + Math.random()*8000; 
        }
        
        this.rBlink = 0.0;
        if (this.blinking) {
            let el = now - this.blinkStart;
            if (el < 120) this.rBlink = el/120; 
            else if (el < 200) {
                this.rBlink = 1.0;
                // Randomize warp seed at blink peak
                if (!this.blinkSeeded) {
                    this.blinkSeeded = true;
                    this.z3ModeSeed = Math.random() * 100.0;
                    this.z3Trip     = 0.3 + Math.random() * 1.4;
                    this.z3IsOOB    = Math.random() > 0.4 ? 1.0 : 0.0;
                    this.z3ModeStart = now;
                    this.z3BlinkPeakTime = now;
                }
            }
            else if (el < 320) this.rBlink = 1.0-((el-200)/120); 
            else { this.rBlink = 0.0; this.blinking = false; this.blinkSeeded = false; }
        }
        
        this.z3ModeTime = (now - this.z3ModeStart) * 0.001;
        
        if (this.activePOV === 'center') this.updateCenterState(now, timeScale);
        this._updateAudio(now);

        // ── Composite neural intensity — exposed for brain monitor ──
        var stateBoost = 0;
        if (this.cabinState === 'cockpit_turbulence') stateBoost = 1.5;
        else if (this.cabinState === 'backward') stateBoost = 0.8;
        else if (this.cabinState === 'suction') stateBoost = 2.5;
        if (this.centerPhase === 'falling') stateBoost = 3.0;
        if (this.fractalActive > 0.5) stateBoost += 0.5;
        // Walk depth into cabin escalates
        var depthBoost = 0;
        if (this.centerPhase === 'cabin') {
            depthBoost = Math.max(0, (this.camZ - this.HALL_END_Z) / (this.COCKPIT_Z - this.HALL_END_Z)) * 0.6;
        }
        this.neuralIntensity = this.z3Trip + stateBoost + depthBoost + this.suctionShake * 10;

        gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);
        
        if (this.voidMode && this.voidFBO && this.centerPhase !== 'falling') {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.voidFBO.fbo); 
            gl.viewport(0, 0, cWidth, cHeight);
            gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);
            this.voidMode.render(now, 0, 0, 0, 0, 0, 0, 1.0, 0); 
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, cWidth, cHeight);
        }

        if (this.activePOV === 'left' && this.bathroomProg) {
            gl.useProgram(this.bathroomProg);
            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.texBathroomHole);
            gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.voidFBO.tex);
            gl.uniform1i(gl.getUniformLocation(this.bathroomProg, "u_texEnv1"), 0);
            gl.uniform1i(gl.getUniformLocation(this.bathroomProg, "u_voidTex"), 1);
            gl.uniform2f(gl.getUniformLocation(this.bathroomProg, "u_resolution"), cWidth, cHeight);
            gl.uniform1f(gl.getUniformLocation(this.bathroomProg, "u_time"), now*0.001);
            gl.uniform2f(gl.getUniformLocation(this.bathroomProg, "u_mouse"), this.cx, this.cy);
            gl.uniform1f(gl.getUniformLocation(this.bathroomProg, "u_blink"), this.rBlink);
            gl.uniform1f(gl.getUniformLocation(this.bathroomProg, "u_wake"), 1.0);
            this._drawQuad(this.bathroomProg);
            
        } else if (this.activePOV === 'center') {
            
            if (this.centerPhase === 'falling' && this.fallProg) {
                gl.useProgram(this.fallProg);
                gl.uniform2f(gl.getUniformLocation(this.fallProg, "u_resolution"), cWidth, cHeight);
                gl.uniform1f(gl.getUniformLocation(this.fallProg, "u_time"), now*0.001);
                gl.uniform2f(gl.getUniformLocation(this.fallProg, "u_mouse"), this.cx, this.cy);
                gl.uniform1f(gl.getUniformLocation(this.fallProg, "u_fallProgress"), this.fallProgress);
                gl.uniform1f(gl.getUniformLocation(this.fallProg, "u_blink"), this.rBlink);
                this._drawQuad(this.fallProg);
                
            } else if (this.centerProg) {
                gl.useProgram(this.centerProg);
                gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.voidFBO.tex);
                gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.texDoorClosed);
                gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.texDoorOpen);
                gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, this.texHallLeft);
                gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, this.texHallRight);
                gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, this.texHallTop);
                gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, this.texHallBottom);
                gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, this.texCockpit);
                
                gl.uniform1i(gl.getUniformLocation(this.centerProg, "u_voidTex"), 0);
                gl.uniform1i(gl.getUniformLocation(this.centerProg, "u_doorClosedTex"), 1);
                gl.uniform1i(gl.getUniformLocation(this.centerProg, "u_doorOpenTex"), 2);
                gl.uniform1i(gl.getUniformLocation(this.centerProg, "u_texLeft"), 3);
                gl.uniform1i(gl.getUniformLocation(this.centerProg, "u_texRight"), 4);
                gl.uniform1i(gl.getUniformLocation(this.centerProg, "u_texTop"), 5);
                gl.uniform1i(gl.getUniformLocation(this.centerProg, "u_texBottom"), 6);
                gl.uniform1i(gl.getUniformLocation(this.centerProg, "u_cockpitTex"), 7);
                
                gl.uniform2f(gl.getUniformLocation(this.centerProg, "u_resolution"), cWidth, cHeight);
                gl.uniform1f(gl.getUniformLocation(this.centerProg, "u_time"), now*0.001);
                
                gl.uniform2f(gl.getUniformLocation(this.centerProg, "u_mouse"), this.cx, this.cy);
                gl.uniform1f(gl.getUniformLocation(this.centerProg, "u_camZ"), this.camZ);
                gl.uniform1f(gl.getUniformLocation(this.centerProg, "u_camX"), this.camX);
                gl.uniform1f(gl.getUniformLocation(this.centerProg, "u_isWalking"), (z3SpaceHeld || z3TouchHeld) ? 1.0 : 0.0);
                gl.uniform1f(gl.getUniformLocation(this.centerProg, "u_blink"), this.rBlink);
                gl.uniform1f(gl.getUniformLocation(this.centerProg, "u_wake"), 1.0);
                gl.uniform1f(gl.getUniformLocation(this.centerProg, "u_shake"), this.suctionShake);
                gl.uniform1f(gl.getUniformLocation(this.centerProg, "u_flash"), this.flashVal);
                gl.uniform1f(gl.getUniformLocation(this.centerProg, "u_yawOffset"), this.yawOffset);
                gl.uniform1f(gl.getUniformLocation(this.centerProg, "u_doorOpen"), this.doorOpen);
                gl.uniform1f(gl.getUniformLocation(this.centerProg, "u_doorSwitched"), this.doorSwitched);
                gl.uniform1f(gl.getUniformLocation(this.centerProg, "u_zoom"), this.zoom);
                gl.uniform1f(gl.getUniformLocation(this.centerProg, "u_suctionFade"), this.suctionFade);
                gl.uniform1f(gl.getUniformLocation(this.centerProg, "u_trip"),     this.z3Trip);
                gl.uniform1f(gl.getUniformLocation(this.centerProg, "u_modeSeed"), this.z3ModeSeed);
                gl.uniform1f(gl.getUniformLocation(this.centerProg, "u_modeTime"), this.z3ModeTime);
                gl.uniform1f(gl.getUniformLocation(this.centerProg, "u_isOOB"),    this.z3IsOOB);
                gl.uniform1f(gl.getUniformLocation(this.centerProg, "u_fractalActive"), this.fractalActive);
                gl.uniform1f(gl.getUniformLocation(this.centerProg, "u_fractalSeed"), this.z3ModeSeed);
                gl.uniform1f(gl.getUniformLocation(this.centerProg, "u_blinkAge"), (now - (this.z3BlinkPeakTime || now)) * 0.001);
                
                this._drawQuad(this.centerProg);
            }
        }

        // Red continuation from engine2 crash — starts full red, slow fade out
        if (!this.z3RedDone) {
            let elapsed = now - this.z3RedStart;
            let redAlpha = 0.0;
            if (elapsed < 500) {
                redAlpha = 1.0;
            } else if (elapsed < 3000) {
                redAlpha = 1.0 - ((elapsed - 500) / 2500.0);
            } else {
                this.z3RedDone = true;
            }
            if (redAlpha > 0.001) this._drawOverlay(0.8, 0.0, 0.0, redAlpha);
        }

        // Hallucination overlay — trip climaxing by cabin
        if (typeof drawHallucinationOverlay === 'function' && this.centerPhase !== 'falling') {
            drawHallucinationOverlay(now, this.z3Trip, this.z3ModeSeed, (now - this.z3BlinkPeakTime) * 0.001);
        }
    }

    destroy() {
        this.isDead = true;
        this._destroyAudio();
        if (this.voidMode) this.voidMode.destroy();
        if (this.voidFBO) { gl.deleteTexture(this.voidFBO.tex); gl.deleteFramebuffer(this.voidFBO.fbo); }
        gl.deleteProgram(this.bathroomProg); gl.deleteProgram(this.centerProg); gl.deleteProgram(this.fallProg);
        gl.deleteTexture(this.texBathroomHole); gl.deleteTexture(this.texDoorClosed);
        gl.deleteTexture(this.texDoorOpen); gl.deleteTexture(this.texCockpit);
        gl.deleteTexture(this.texHallLeft); gl.deleteTexture(this.texHallRight);
        gl.deleteTexture(this.texHallTop); gl.deleteTexture(this.texHallBottom);
        gl.deleteBuffer(this.quadBuf);
    }
}

window.startZone3 = function() {
    window.currentZone3 = new Zone3Engine();

    const IS_MOBILE = /Mobi|Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && window.innerWidth < 1024);
    const TARGET_FPS = IS_MOBILE ? 20 : 30;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;
    let lastZ3Frame = 0;

    window.__zone3Governor = function(now) {
        requestAnimationFrame(window.__zone3Governor);
        if (now - lastZ3Frame < FRAME_INTERVAL) return;
        lastZ3Frame = now;
        if (window.currentZone3 && !window.currentZone3.isDead) {
            window.currentZone3.render(now, window.mx || 0, window.my || 0);
        }
    };
    requestAnimationFrame(window.__zone3Governor);
};// ═══════════════════════════════════════════════════════════════
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