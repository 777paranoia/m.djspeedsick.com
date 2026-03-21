window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.vert = `attribute vec2 p; void main(){ gl_Position=vec4(p,0,1); }`;

GLSL.sim = `
precision highp float;
uniform sampler2D u_prev; uniform sampler2D u_window;
uniform vec2 u_resolution; uniform float u_time;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float hash1(float x){ return fract(sin(x*127.1)*43758.5); }
void main(){
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec4 win = texture2D(u_window, uv);
  float isGlass = 1.0 - clamp(win.a, 0.0, 1.0);
  if(isGlass < 0.1){ gl_FragColor = vec4(0.0); return; }
  vec2 texel = 1.0 / u_resolution;
  float h = texture2D(u_prev, uv).r;
  float band = floor(uv.x * 12.0); float depthRd = hash1(band * 9.17);
  float speedMul = mix(0.55, 1.55, depthRd); float thickMul = mix(0.65, 1.85, depthRd);
  float cols = 36.0 + depthRd * 56.0; float colId = floor(uv.x * cols);
  float colRnd = hash1(colId * 3.7 + 1.3); float colRnd2 = hash1(colId * 7.1 + 5.9);
  float spawnT1 = step(0.935, fract(u_time * (0.12 + colRnd * 0.16) * speedMul + colRnd2 * 13.7));
  float spawnT2 = step(0.965, fract(u_time * (0.08 + colRnd2 * 0.11) * speedMul + colRnd * 7.3));
  float spawnRnd = hash(uv * vec2(1.0, 2.2) + vec2(floor(u_time * (1.7 + colRnd * 1.9)), band * 11.0));
  float newDrop = (spawnT1 + spawnT2) * step(0.62, spawnRnd) * step(0.5, isGlass) * (0.85 + 1.35 * depthRd);
  float flowIn = texture2D(u_prev, uv - vec2(0.0, texel.y * (2.0 + depthRd * 2.0))).r * (0.22 + 0.38 * depthRd);
  float breakup = mix(0.985, 0.965, hash(vec2(colId, floor(u_time*1.2 + depthRd*9.0))));
  float dryPulse = mix(0.00, 0.08, step(0.992, hash(vec2(colId*2.3, floor(u_time*0.8)))));
  h = clamp(h * (0.92 * breakup) + flowIn + newDrop * (0.045 * thickMul), 0.0, 1.0) * (0.989 - dryPulse*0.25);
  h = clamp(h - smoothstep(0.18, 0.88, h) * (0.20 + 0.22 * depthRd), 0.0, 1.0) * isGlass;
  gl_FragColor = vec4(h, 0.0, depthRd, 1.0);
}
`;

GLSL.core = `
precision highp float;
uniform float u_audio; uniform vec2 u_resolution; uniform float u_time;
uniform vec2 u_mouse; uniform float u_blink; uniform float u_flash;
uniform float u_shake; uniform float u_wake; uniform float u_modeSeed;
uniform int u_mode;
uniform float u_isOOB;
uniform float u_modeTime;
uniform float u_trip;
uniform float u_fractalSeed;
uniform float u_blinkAge;

uniform sampler2D u_texB1, u_texB2, u_texB3, u_texB4, u_texB5, u_texB6;
uniform sampler2D u_water; uniform sampler2D u_texWindow; 
uniform sampler2D u_texEnv1; uniform sampler2D u_texEnv2;

#define PI 3.14159265359
float hash2(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
float hash1(float x){ return fract(sin(x*127.1 + 1.9898)*43758.5); }
float noise1(float t){ float i=floor(t); float f=fract(t); f=f*f*(3.0-2.0*f); return mix(hash1(i),hash1(i+1.0),f); }

float noise2(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash2(i + vec2(0.0,0.0)), hash2(i + vec2(1.0,0.0)), u.x),
               mix(hash2(i + vec2(0.0,1.0)), hash2(i + vec2(1.0,1.0)), u.x), u.y);
}

float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 4; ++i) {
        v += a * noise2(p);
        p = rot * p * 2.0 + vec2(100.0);
        a *= 0.5;
    }
    return v;
}

mat2 rot(float a){ float s=sin(a),c=cos(a); return mat2(c,-s,s,c); }
float sdBox(vec3 p,vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0); }
vec3 neonPalette(float t) { return vec3(0.5) + vec3(0.5) * cos(6.28318 * (vec3(1.0) * t + vec3(0.00, 0.33, 0.67))); }

float sdFractal(vec3 p, float power, float rotA, float rotB){
  vec3 z = p; z.xz *= rot(u_time * rotA); z.yz *= rot(u_time * rotB);
  float scale = 1.0; vec3 foldOffset = vec3(0.6) + (vec3(0.15) * sin(u_time * 0.15 + power)) + u_audio * 0.2;
  for(int i=0; i<8; i++){
    z=abs(z); if(z.x<z.y) z.xy=z.yx; if(z.x<z.z) z.xz=z.zx; if(z.y<z.z) z.yz=z.zy;
    z=z*2.0-foldOffset; scale*=2.0;
  }
  return (length(z) - 0.2) / scale;
}

vec3 colorPickover(vec3 p) {
  vec2 c = vec2(p.x * 0.4 + sin(u_time * 0.07) * 0.3, p.y * 0.4 + cos(u_time * 0.05) * 0.3);
  vec2 z = vec2(0.0); float minDist = 1e10; float escapeI = 0.0;
  for(int i = 0; i < 80; i++) {
    z = clamp(vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c, -1000.0, 1000.0);
    float d = min(abs(z.x), abs(z.y)); if(d < minDist) minDist = d;
    if(dot(z,z) > 100.0){ escapeI = float(i); break; }
  }
  return neonPalette(fract(clamp(minDist * 8.0, 0.0, 1.0) * 2.0 + u_time * 0.15 + escapeI * 0.01)) * (0.4 + 0.6 * (1.0 - clamp(minDist * 8.0, 0.0, 1.0)));
}

vec3 colorClifford(vec3 p) {
  float a  =  1.5 + sin(u_time * 0.11) * 0.4; float b  = -1.8 + cos(u_time * 0.07) * 0.3;
  float c2 = -1.9 + sin(u_time * 0.09) * 0.3; float d  =  0.4 + cos(u_time * 0.13) * 0.4;
  float x = p.x * 0.5 + p.z * 0.2; float y = p.y * 0.5 + p.z * 0.1;
  float density = 0.0; float hueAcc = 0.0;
  for(int i = 0; i < 48; i++){
    float nx = sin(a * y) + c2 * cos(a * x); float ny = sin(b * x) + d  * cos(b * y);
    x = nx; y = ny; density += exp(-length(vec2(x, y)) * 0.5); hueAcc  += atan(y, x);
  }
  return neonPalette(fract(hueAcc * 0.05 + u_time * 0.12)) * (0.3 + 0.7 * clamp(density * 0.06, 0.0, 1.0));
}

vec3 fractalAnchor(float id){
  float x = mix(-1.4,  1.4,  hash1(id * 3.1 + 0.13)); 
  float y = mix( 0.0,  1.6,  hash1(id * 7.3 + 0.27)); 
  float z = mix( 0.0,  3.5,  hash1(id * 11.7 + 0.41)); 
  return vec3(x, y, z);
}
float fractalPower(float id){ return mix(6.0, 10.0, hash1(id * 5.3)) + sin(u_time * mix(0.03, 0.08, hash1(id * 2.1))) * 1.5; }
float fractalRotA(float id){ return mix(0.05, 0.18, hash1(id * 9.7))  * (hash1(id * 4.1) > 0.5 ? 1.0 : -1.0); }
float fractalRotB(float id){ return mix(0.04, 0.14, hash1(id * 6.3))  * (hash1(id * 8.9) > 0.5 ? 1.0 : -1.0); }
float fractalScale(float id){ return mix(0.7, 1.2, hash1(id * 13.1)); }
float fractalFogDensity(float id){ return mix(0.006, 0.03, hash1(id * 17.3)); }

float snow(vec2 uv,float size,float speed,float opacity){
  vec2 grid=uv*size; vec2 id=floor(grid); vec2 f=fract(grid)-0.5;
  f.y+=fract(u_time*speed+hash2(id)*15.0)-0.5; f.x+=sin(u_time*0.5+hash2(id)*6.2831)*0.2;
  return smoothstep(.05,0.0,length(f))*hash2(id)*opacity;
}

float worldRainLayer(vec2 uv, float t, float scale, float speed, float thickness, float density, float slant){
  vec2 u = uv; u.x *= u_resolution.x / u_resolution.y; u *= scale; u += vec2(slant, 1.0) * t * speed;
  vec2 id = floor(u); vec2 f  = fract(u); float n = hash2(id); float on = step(1.0 - density, n);
  float x = f.x - (0.5 + (n - 0.5) * 0.18); float streak = smoothstep(thickness, 0.0, abs(x));
  float seg = hash2(id + 19.17); float gate = smoothstep(0.15, 0.95, fract(f.y + seg));
  return on * streak * gate;
}

float worldRain(vec2 uv, float t){
  float r = 0.0;
  r += worldRainLayer(uv, t, 18.0, 1.8, 0.003, 0.10, 0.06);
  r += worldRainLayer(uv, t, 28.0, 2.4, 0.002, 0.13, 0.08);
  r += worldRainLayer(uv, t, 44.0, 3.2, 0.001, 0.16, 0.10);
  return clamp(r, 0.0, 1.0);
}

vec2 mapScene(vec3 p, bool renderFractals){
  vec2 res=vec2(1000.0,-1.0);
  if(u_mode==8){
    float d1=sdBox(p-vec3(-4.5,0.0, 6.0),vec3(1.6,20.0,2.0)); if(d1<res.x) res=vec2(d1,1.0);
    float d2=sdBox(p-vec3(-6.5,0.0,16.0),vec3(2.0,24.0,2.5)); if(d2<res.x) res=vec2(d2,2.0);
    float d3=sdBox(p-vec3(-8.5,0.0,28.0),vec3(2.6,28.0,3.2)); if(d3<res.x) res=vec2(d3,3.0);
    float d4=sdBox(p-vec3( 4.5,0.0, 7.0),vec3(1.6,20.0,2.0)); if(d4<res.x) res=vec2(d4,4.0);
    float d5=sdBox(p-vec3( 6.5,0.0,17.0),vec3(2.0,24.0,2.5)); if(d5<res.x) res=vec2(d5,5.0);
    float d6=sdBox(p-vec3( 8.5,0.0,29.0),vec3(2.6,28.0,3.2)); if(d6<res.x) res=vec2(d6,6.0);
    float floorD=p.y+9.5; if(floorD<res.x) res=vec2(floorD,20.0);

  }
  if (u_mode != 6 && u_mode != 7 && u_mode != 8) {
      float d1=sdBox(p-vec3(-3.0,0.0,2.0), vec3(1.2,12.0,1.5)); if(d1<res.x) res=vec2(d1,1.0);
      float d2=sdBox(p-vec3(-4.2,0.0,7.0), vec3(1.2,12.0,1.5)); if(d2<res.x) res=vec2(d2,2.0);
      float d3=sdBox(p-vec3(-5.4,0.0,12.0),vec3(1.2,12.0,1.5)); if(d3<res.x) res=vec2(d3,3.0);
      float d4=sdBox(p-vec3( 3.0,0.0,2.5), vec3(1.2,12.0,1.5)); if(d4<res.x) res=vec2(d4,4.0);
      float d5=sdBox(p-vec3( 4.2,0.0,7.5), vec3(1.2,12.0,1.5)); if(d5<res.x) res=vec2(d5,5.0);
      float d6=sdBox(p-vec3( 5.4,0.0,12.5),vec3(1.2,12.0,1.5)); if(d6<res.x) res=vec2(d6,6.0);
  }
  if(renderFractals){
    float seed = u_modeSeed; float num = floor(hash1(seed * 31.1) * 1.5) + 1.0; 
    for(float i=0.0; i<2.0; i++){ 
      if(i >= num) break;
      float id = seed * 7.0 + i; 
      float sc = mix(0.3, 0.6, hash1(id * 13.1)) * 0.7; 
      vec3 a = vec3(mix(-1.4,1.4,hash1(id*3.1+0.13)), mix(0.0,1.6,hash1(id*7.3+0.27)), mix(0.0,3.5,hash1(id*11.7+0.41)));
      vec3 fp = p - a; float bound = length(fp) - (sc * 1.5); float df = bound;
      
      if(bound < 0.2) df = max(bound, sdFractal(fp/sc, mix(6.0,10.0,hash1(id*5.3))+sin(u_time*mix(0.03,0.08,hash1(id*2.1)))*1.5, mix(0.05,0.18,hash1(id*9.7))*(hash1(id*4.1)>0.5?1.0:-1.0), mix(0.04,0.14,hash1(id*6.3))*(hash1(id*8.9)>0.5?1.0:-1.0)) * sc);
      if(df < res.x) res = vec2(df, 10.0);
    }
  }  
  return res;
}

vec3 sampleBuilding(float id,vec2 texUV){
  vec2 uv=abs(fract(texUV*0.25)*2.0-1.0);
  if(u_mode==8){
    if(id<2.5) return texture2D(u_texB1,uv).rgb;
    if(id<4.5) return texture2D(u_texB2,uv).rgb;
    return texture2D(u_texB3,uv).rgb;
  }
  if(id<1.5) return texture2D(u_texB1,uv).rgb; if(id<2.5) return texture2D(u_texB2,uv).rgb;
  if(id<3.5) return texture2D(u_texB3,uv).rgb; if(id<4.5) return texture2D(u_texB4,uv).rgb;
  if(id<5.5) return texture2D(u_texB5,uv).rgb; return texture2D(u_texB6,uv).rgb;
}

vec2 waterNormal(vec2 uv){
  vec2 texel = 1.0 / u_resolution;
  float hL = texture2D(u_water, uv - vec2(texel.x, 0.0)).r; float hR = texture2D(u_water, uv + vec2(texel.x, 0.0)).r;
  float hD = texture2D(u_water, uv - vec2(0.0, texel.y)).r; float hU = texture2D(u_water, uv + vec2(0.0, texel.y)).r;
  return vec2(hL - hR, hD - hU) * 7.0;
}


vec3 digitalGlitch(vec3 col, vec2 uv) {
  float burstSlot = floor(u_time * 12.0); 
  float isBurst = step(0.94, hash1(burstSlot * 13.7 + u_modeSeed)); 
  float flicker = step(0.5, hash1(floor(u_time * 60.0) * 9.1)); 
  float activeG = isBurst * flicker * clamp(u_trip, 0.0, 1.5);
  
  if (activeG < 0.01) return col;

  float rndG = hash1(burstSlot + u_modeSeed);
  float gridSize = (rndG < 0.33) ? 64.0 : ((rndG < 0.66) ? 128.0 : 256.0);
  
  vec2 blockUV = floor(uv * gridSize) / gridSize;
  float blockRnd = hash2(blockUV + floor(u_time * 30.0)); 
  
  vec2 motionVector = (vec2(hash1(blockRnd), hash1(blockRnd * 2.0)) - 0.5) * 0.15;
  vec2 moshUV = fract(blockUV + motionVector * activeG);
  
  vec3 moshCol = texture2D(u_texEnv1, moshUV).rgb;
  
  float doMosh = step(0.9, blockRnd) * activeG;
  col = mix(col, moshCol, doMosh);
  
  float doDegrade = step(0.92, hash2(blockUV + 9.3)) * activeG; 
  vec3 degradedCol = floor(col * 3.0) / 3.0;
  
  float tintRnd = hash1(blockRnd * 3.0);
  vec3 yuvTint = (tintRnd > 0.5) ? vec3(0.9, 0.1, 0.8) : vec3(0.1, 0.8, 0.3);
  col = mix(col, degradedCol * yuvTint, doDegrade);

  float miniGrid = gridSize * 2.0;
  vec2 miniBlockUV = floor(uv * miniGrid) / miniGrid;
  float miniRnd = hash2(miniBlockUV + floor(u_time * 60.0));
  float doMini = step(0.95, miniRnd) * activeG; 
  
  col = mix(col, vec3(col.b, col.r, col.g), doMini); 

  return col;
}

void setupCamera(out vec3 ro, out vec3 rd, out vec3 clean_rd, float intensity) {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
  
  float t = u_time * 0.15;
  vec2 q = vec2(0.0);
  q.x = fbm(uv * 2.0 + vec2(0.0, t));
  q.y = fbm(uv * 2.0 + vec2(t, 0.0));

  vec2 r = vec2(0.0);
  r.x = fbm(uv * 2.0 + 2.0 * q + vec2(1.7, 9.2) + 0.15 * t);
  r.y = fbm(uv * 2.0 + 2.0 * q + vec2(8.3, 2.8) + 0.12 * t);

  float liqAmp = mix(0.06, 0.16, u_isOOB) * u_trip;
  uv += (r - 0.5) * liqAmp; 

  float mt = u_modeTime * u_isOOB;
  

  float w1 = sin(mt * 0.4 + u_modeSeed);
  float w2 = sin(mt * 0.9 + u_modeSeed * 2.0);
  float w3 = sin(mt * 1.5 + u_modeSeed * 3.0);
  float surge = smoothstep(0.8, 1.0, (w1 + w2 + w3) / 3.0);
  float snap = pow(surge, 2.0) * 12.0 * u_isOOB;


  uv *= 1.0 + mt * 0.005 + (snap * 0.02); 

  float gTick = floor(u_time * 16.0); 
  if (step(0.979, hash1(gTick * 133.77)) > 0.0) uv.x += (hash1(floor(uv.y * mix(10.0, 30.0, hash1(gTick * 2.1))) + gTick) - 0.5) * 0.21; 
  
  vec2 m = u_mouse * 0.35; 
  ro = vec3(0.0, 0.0, -4.5); 
  
  ro.y += mt * 0.03 + snap * 0.15;
  ro.z -= mt * 0.08 + snap;
  
  rd = normalize(vec3(uv, 1.4));
  
  rd.xy *= rot((sin(mt * 0.05) * 0.08 + snap * 0.005) * u_isOOB);
  
  float groggy = 1.0 - u_wake; ro.y -= groggy * 1.2;
  rd.yz *= rot(groggy * 0.4); rd.xz *= rot(groggy * -0.3); rd.xy *= rot(groggy * 0.2);
  rd.yz *= rot(m.y * 0.8); rd.xz *= rot(m.x * 1.0);
  
  if (intensity > 0.0) {
      float sx=(hash2(vec2(floor(u_time*40.0),1.7))-0.5)*0.020*u_shake*intensity;
      float sy=(hash2(vec2(floor(u_time*40.0),8.3))-0.5)*0.016*u_shake*intensity;
      if (u_shake > 0.7 && hash1(u_time * 20.0) > 0.5) { sx += (hash1(u_time * 12.0) - 0.5) * 0.08 * intensity; sy += (hash1(u_time * 22.0) - 0.5) * 0.08 * intensity; }
      rd.xz*=rot(sx); rd.yz*=rot(sy);
  }
  
  clean_rd = rd;
  
  if (intensity > 0.0) {
      float warp = (0.06 + hash1(u_time * 50.0) * u_shake * 0.08 * intensity) / (length(rd.xy) + 0.05) * intensity; 
      rd.xy *= rot(warp * (1.5 + u_shake * 0.5)); rd.xy -= normalize(rd.xy) * (warp * (0.4 + u_shake * 0.3)); rd = normalize(rd); 
  }
}
`;

// Shared hallucination overlay — inject into any shader that declares the required uniforms.
// Required uniforms: u_fractalSeed, u_blinkAge, u_trip, u_time, u_resolution
// Call: col = applyHallucination(col, screenUV, u_fractalSeed, u_blinkAge, u_trip, u_time);
GLSL.hallucinationFn = `
// ═══ INLINE HALLUCINATION HELPERS ═══
// WebGL1-safe (no break). Available to any shader that includes GLSL.core.
float _hh2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float _hh1(float x){ return fract(sin(x*127.1)*43758.5453); }

// Burning Ship fractal — melting cityscape structures
float burningShip(vec2 c){
    vec2 z=vec2(0.0); float si=0.0;
    for(int n=0;n<48;n++){
        z=vec2(abs(z.x),abs(z.y));
        z=vec2(z.x*z.x-z.y*z.y,2.0*z.x*z.y)+c;
        si+=(1.0-step(4.0,dot(z,z)));
    }
    return si/48.0;
}

// Julia set — organic tendrils
float juliaSet(vec2 z, vec2 c){
    float si=0.0;
    for(int n=0;n<36;n++){
        z=vec2(z.x*z.x-z.y*z.y,2.0*z.x*z.y)+c;
        si+=(1.0-step(4.0,dot(z,z)));
    }
    return si/36.0;
}

// Clifford attractor density
float clifford(vec2 p, float seed) {
    float a =  1.5 + sin(seed * 1.3) * 0.5;
    float b = -1.8 + cos(seed * 0.7) * 0.4;
    float c = -1.9 + sin(seed * 2.1) * 0.4;
    float d =  0.4 + cos(seed * 1.7) * 0.4;
    float x = p.x * 0.6; float y = p.y * 0.6;
    float density = 0.0;
    for(int i=0; i<32; i++){
        float nx = sin(a*y) + c*cos(a*x);
        float ny = sin(b*x) + d*cos(b*y);
        x=nx; y=ny;
        density += exp(-length(vec2(x,y)-p*0.6)*2.0);
    }
    return clamp(density * 0.08, 0.0, 1.0);
}

vec3 sickNeonPal(float t, float seed){
    vec3 a = vec3(0.5, 0.4, 0.45);
    vec3 b = vec3(0.5, 0.35, 0.5);
    vec3 c = vec3(1.0, 0.8, 1.0);
    vec3 d = vec3(_hh1(seed)*0.5, _hh1(seed+1.0)*0.3+0.1, _hh1(seed+2.0)*0.4+0.3);
    return a + b * cos(6.28318*(c*t+d));
}

// Apply hallucination inline — call from any shader's final output
// Returns modified baseCol with fractal bleeding, grain, and horror tint
vec3 applyHallucination(vec3 baseCol, vec2 screenUV, float fractalSeed, float blinkAge, float trip, float time){
    if(trip < 0.05) return baseCol;
    float r = length(screenUV);
    float periph = smoothstep(0.25, 0.9, r);

    // Base + surge envelope
    float surge = smoothstep(6.0, 0.0, blinkAge) * 0.35;
    float strength = (trip * 0.15 + surge) * periph;
    if(strength < 0.005) return baseCol;

    // Fractal type selection
    float typeRoll = _hh1(fractalSeed * 3.7);
    float zoom = mix(0.6, 3.0, _hh1(fractalSeed * 1.3));
    vec2 drift = vec2(sin(time*0.03+fractalSeed)*0.2, cos(time*0.02+fractalSeed*1.7)*0.2);
    vec2 sUV = screenUV / zoom + drift;
    float val = 0.0;

    if(typeRoll < 0.4) {
        vec2 region = vec2(-1.76, -0.028) + vec2(_hh1(fractalSeed*5.1)-0.5, _hh1(fractalSeed*7.3)-0.5)*0.3;
        val = burningShip(sUV * 0.5 + region);
    } else if(typeRoll < 0.7) {
        vec2 jc = vec2(-0.8+sin(time*0.015+fractalSeed)*0.15, 0.156+cos(time*0.012)*0.1);
        val = juliaSet(sUV * 0.8, jc);
    } else {
        val = clifford(sUV * 1.5, fractalSeed);
    }

    val = fract(val * 3.5 + time * 0.04);
    vec3 fracCol = sickNeonPal(val, fractalSeed * 11.3);
    fracCol *= smoothstep(0.0, 0.12, val) * smoothstep(1.0, 0.7, val);
    float pulse = 0.55 + 0.45 * sin(time * 0.9 + fractalSeed);

    // Film grain
    float grain = (_hh2(screenUV * 400.0 + floor(time * 24.0) * 7.3) - 0.5) * trip * 0.08;

    // Horror vignette darken
    float vignette = smoothstep(0.3, 1.1, r) * trip * 0.12 * (0.5 + 0.5 * sin(time * 0.7));

    vec3 result = baseCol;
    result += fracCol * strength * pulse;         // fractal glow
    result += vec3(grain);                         // grain
    result = mix(result, result * vec3(0.85, 0.7, 0.75), vignette); // horror darken
    return result;
}
`;