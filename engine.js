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

requestAnimationFrame(__frameGovernor);