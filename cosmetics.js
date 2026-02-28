/* ===== COSMETIC RESTORE — ZERO-DISRUPTION ENGINE WRAPPER =====
   Load this AFTER your existing engine.js
   It does NOT replace your engine
   It hooks into the render loop automatically
================================================================ */

(function(){

let trail = 0.85;
let flash = 0;
let shake = 0;

let cx = 0, cy = 0;
let mx = 0, my = 0;

let analyser = null;
let gl = null;

window.addEventListener("mousemove", e => {
  mx = e.clientX / innerWidth * 2 - 1;
  my = e.clientY / innerHeight * 2 - 1;
});

function audioLevel(){
  if(!analyser) return 0;
  const d = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(d);
  let s = 0;
  for(let i=0;i<6;i++) s += d[i];
  return s / (6 * 255);
}

function fade(){
  if(!gl) return;
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0,0,0,1.0 - trail);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.disable(gl.BLEND);
}

function update(){
  const a = audioLevel();

  cx += (mx - cx) * (0.12 + a * 0.05);
  cy += (my - cy) * (0.12 + a * 0.05);

  if(Math.random() < 0.02)
    flash = 1.0 + Math.random() * 0.5;

  flash *= 0.9;
  shake = Math.max(flash, a * 0.4);

  cx += (Math.random() - 0.5) * shake * 0.02;
  cy += (Math.random() - 0.5) * shake * 0.02;
}

/* ---- AUTO-HOOK INTO EXISTING ENGINE ---- */

const origRAF = window.requestAnimationFrame;

window.requestAnimationFrame = function(cb){
  return origRAF(function(t){

    if(!gl){
      const c = document.querySelector("canvas");
      if(c) gl = c.getContext("webgl") || c.getContext("webgl2");
    }

    if(!analyser && window.analyser)
      analyser = window.analyser;

    fade();
    update();

    cb(t);
  });
};

window.__cosmeticMouse = () => ({ x: cx, y: cy });
window.__cosmeticShake = () => shake;

})();