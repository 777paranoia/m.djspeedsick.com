window.GLSL = window.GLSL || {};
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
};