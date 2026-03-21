window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules['z3_cabin'] = `
precision highp float;

uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_time;
uniform float u_blink;
uniform float u_wake;
uniform float u_progress;
uniform float u_yawOffset;
uniform float u_doorOpen;
uniform float u_exitPOV;
uniform float u_shake;
uniform float u_flash;
uniform float u_suctionFade;
uniform float u_camX;
uniform float u_zoom;
uniform float u_postCockpit;

uniform sampler2D u_voidTex;

const int   MAX_STEPS = 200;
const float MAX_DIST  = 25.0;
const float SURF_DIST = 0.006;

const float HALF_LEN    = 11.0;
const float FUSE_R      = 1.72;
const float FLOOR_Y     = -0.82;
const float AISLE_W     = 0.32;
const float SEAT_PITCH  = 0.79;
const float ROW_START   = -11.0 + 1.8;
const float EXIT_ROW_Z  = -11.0 + 1.8 + 13.0 * 0.79;

mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }
float hash(float n){ return fract(sin(n)*43758.5453); }
float hash2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }

float sdBox(vec3 p, vec3 b){
    vec3 q = abs(p)-b;
    return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}
float sdRBox(vec3 p, vec3 b, float r){ return sdBox(p,b-r)-r; }

float sdFractal(vec3 p) {
    vec3 z = p - vec3(0.0, FLOOR_Y + 1.2, -10.5);
    z.xy *= rot(u_time * 0.15);
    z.yz *= rot(u_time * 0.25);
    float scale = 1.0;
    for (int i=0; i<6; i++) {
        z = abs(z);
        if (z.x < z.y) z.xy = z.yx;
        if (z.x < z.z) z.xz = z.zx;
        if (z.y < z.z) z.yz = z.zy;
        z = z*2.0 - vec3(0.8);
        scale *= 2.0;
    }
    return (length(z) - 0.1) / scale;
}

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
    float rowEnd = ROW_START + 26.0 * SEAT_PITCH;
    if(p.z < ROW_START - 0.5 || p.z > rowEnd + 0.5) return 8.0;
    if(abs(p.z - EXIT_ROW_Z) < SEAT_PITCH * 2.2) return 8.0;
    float cellZ = mod(p.z - ROW_START, SEAT_PITCH) - SEAT_PITCH*0.5;
    vec3 lp = vec3(p.x, p.y, cellZ);
    float d = sdSeat(lp - vec3(-AISLE_W-0.25, 0, 0));
    d = min(d, sdSeat(lp - vec3(-AISLE_W-0.69, 0, 0)));
    d = min(d, sdSeat(lp - vec3( AISLE_W+0.25, 0, 0)));
    d = min(d, sdSeat(lp - vec3( AISLE_W+0.69, 0, 0)));
    return d;
}

float overheadBins(vec3 p){
    if(abs(p.z - EXIT_ROW_Z) < SEAT_PITCH * 2.0) return 8.0;
    float bz = HALF_LEN - 2.0;
    float binL = sdBox(p-vec3(-1.08, 0.72, 0.0), vec3(0.32, 0.14, bz));
    float binR = sdBox(p-vec3( 1.08, 0.72, 0.0), vec3(0.32, 0.14, bz));
    return min(binL, binR);
}

float cockpitWall(vec3 p){
    float wallZ = HALF_LEN - 0.6;
    float wall = sdBox(p-vec3(0, 0.25, wallZ), vec3(FUSE_R, FUSE_R, 0.04));
    wall = max(wall, length(p.xy)-FUSE_R);
    wall = max(wall, -(p.y-FLOOR_Y));
    float door = sdBox(p-vec3(0.05, FLOOR_Y+0.62, wallZ), vec3(0.28, 0.56, 0.09));
    wall = max(wall, -door);
    return wall;
}

float exitDoor(vec3 p) {
    float doorH = 1.3;
    float doorD = 0.65;
    vec3 doorPos = vec3(-FUSE_R - 0.02, FLOOR_Y + doorH * 0.5 + 0.1, EXIT_ROW_Z);
    if(u_doorOpen > 0.5) return 8.0; 
    float door = sdBox(p - doorPos, vec3(0.1, doorH * 0.5, doorD * 0.5));
    float recess = sdBox(p - (doorPos + vec3(0.05, 0.0, 0.0)), vec3(0.1, doorH * 0.42, doorD * 0.42));
    door = max(door, -recess);
    vec3 handlePos = doorPos + vec3(0.08, 0.0, doorD * 0.3);
    float handle = sdBox(p - handlePos, vec3(0.05, 0.15, 0.02));
    float ribL = sdBox(p - (doorPos + vec3(0.06, 0.0, -doorD * 0.45)), vec3(0.04, doorH * 0.48, 0.03));
    float ribR = sdBox(p - (doorPos + vec3(0.06, 0.0,  doorD * 0.45)), vec3(0.04, doorH * 0.48, 0.03));
    return min(min(door, handle), min(ribL, ribR));
}

bool inExitHole(vec3 p){
    if(u_doorOpen < 0.5) return false;
    return abs(p.z - EXIT_ROW_Z) < 0.28 &&
           p.y > FLOOR_Y + 0.05 && p.y < FLOOR_Y + 0.90 &&
           p.x < -FUSE_R + 0.15 &&
           abs(length(p.xy) - FUSE_R) < 0.12;
}

bool isWindowHit(vec3 p){
    float distToShell = abs(length(p.xy) - FUSE_R);
    if(distToShell > 0.08) return false;
    float rowEnd = ROW_START + 26.0 * SEAT_PITCH;
    if(p.z < ROW_START || p.z > rowEnd) return false;
    float localZ = mod(p.z - ROW_START, SEAT_PITCH);
    float winCenter = SEAT_PITCH * 0.5;
    float winH = abs(p.y - 0.18);
    return abs(localZ - winCenter) < 0.07 && winH < 0.11;
}

vec2 scene(vec3 p){
    float toWall  = FUSE_R - length(p.xy);
    float toFloor = p.y - FLOOR_Y;
    float toBack  = p.z + HALF_LEN;
    float toFront = HALF_LEN - p.z;
    float d  = min(min(toWall, toFloor), toBack);
    float id = (d == toFloor) ? 2.0 : 1.0;
    if(toFront < d){ d = toFront; id = 8.0; }
    float doorH = 1.35;
    float doorD = 0.7;
    float frame = sdBox(p - vec3(-FUSE_R, FLOOR_Y + doorH*0.5 + 0.1, EXIT_ROW_Z), vec3(0.2, doorH*0.5, doorD*0.5));
    d = max(d, -frame); 
    if(inExitHole(p)){ d = max(d, 0.01); }
    float s = seatRows(p);
    if(s<d){ d=s; id=3.0; }
    float b = overheadBins(p);
    if(b<d){ d=b; id=4.0; }
    float c = cockpitWall(p);
    if(c<d){ d=c; id=5.0; }
    float ed = exitDoor(p);
    if(ed<d){ d=ed; id=9.0; }
    
    float frac = sdFractal(p);
    if(frac < d) { d = frac; id = 11.0; }
    
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
    float seg = smoothstep(0.15, 0.0, abs(mod(p.z*1.7, 1.0)-0.5));
    float pulse = 0.55 + 0.45*sin(u_time*1.3 + p.z*0.4);
    return vec3(0.95, 0.12, 0.04) * onStrip * seg * pulse * 4.0;
}

vec3 exitSign(vec3 p){
    float g = smoothstep(0.5, 0.0, length(vec2(p.z-EXIT_ROW_Z, p.y-0.95)));
    float f1 = step(0.3, fract(sin(u_time*7.1)*0.5+0.5));
    float f2 = 0.15 + 0.1*sin(u_time*11.0);
    float exitPulse = u_doorOpen > 0.5 ? (0.5 + 0.5*sin(u_time*6.0)) : 1.0;
    return vec3(0.1, 0.9, 0.15) * g * (f1 + f2) * 1.5 * exitPulse;
}

void main(){
    vec2 uv = (gl_FragCoord.xy - 0.5*u_resolution) / u_resolution.y;

    float prog = clamp(u_progress, 0.0, 1.0);
    float walkZ = mix(-HALF_LEN + 2.2, HALF_LEN - 1.8, prog);
    // Lateral pull toward door during suction
    vec3 ro = vec3(u_camX * FUSE_R * 0.6, FLOOR_Y + 1.10, walkZ);

    float yaw   = (-u_mouse.x * 0.42) + u_yawOffset;
    float pitch =  u_mouse.y * 0.26;

    vec3 fwd   = normalize(vec3(sin(yaw), pitch, cos(yaw)));
    vec3 right = normalize(cross(fwd, vec3(0,1,0)));
    vec3 up    = cross(right, fwd);

    // Shake applied to ray
    float shakeX = sin(u_time * 37.0) * u_shake * 0.04;
    float shakeY = cos(u_time * 29.0) * u_shake * 0.04;

    // FOV zoom
    float fovScale = mix(1.0, 0.6, clamp(u_zoom - 1.0, 0.0, 1.0));
    vec3 rd = normalize(fwd + (uv.x * fovScale + shakeX) * right + (uv.y * fovScale + shakeY) * up);

    if(u_exitPOV > 0.5){
        ro  = vec3(0.45, FLOOR_Y + 1.10, EXIT_ROW_Z + 0.35);
        fwd = normalize(vec3(-1.0, -0.08, -0.18));
        right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
        up    = cross(right, fwd);
        rd    = normalize(fwd + uv.x * right * 0.7 + uv.y * up * 0.7);
    }

    if (u_doorOpen > 0.5) {
        rd.x += sin(u_time*2.3) * 0.015 * max(u_shake, 0.3);
        rd = normalize(rd);
    }

    float t = 0.0; float mid = 0.0; bool hit = false;
    for(int i=0; i<MAX_STEPS; i++){
        vec3 p = ro + rd*t;
        vec2 res = scene(p);
        if(res.x < SURF_DIST){ mid = res.y; hit = true; break; }
        if(t > MAX_DIST) break;
        t += res.x * 0.7;
    }

    vec3 col = vec3(0.01, 0.012, 0.025);

    if(!hit && u_doorOpen > 0.5){
        vec2 vuv = gl_FragCoord.xy / u_resolution;
        col = texture2D(u_voidTex, vuv).rgb * 1.2;
    }

    if(hit){
        vec3 p = ro + rd*t;

        if(mid > 7.5 && mid < 8.5) {
            vec3 n = calcNormal(p);
            vec3 matCol = vec3(0.12, 0.14, 0.16); 
            float diff = max(dot(n, vec3(0,0,-1)), 0.0) * 0.4 + 0.15;
            col = matCol * diff;
            float fog = 1.0 - exp(-t * 0.035);
            col = mix(col, vec3(0.025, 0.028, 0.045), fog);

        } else if(mid > 8.5 && mid < 9.5) {
            vec3 n = calcNormal(p);
            vec3 matCol = vec3(0.3, 0.3, 0.32);
            float diff = max(dot(n, vec3(0,0,-1)), 0.0) * 0.4 + 0.15;
            col = matCol * diff;
            float labelGlow = smoothstep(0.15, 0.0, abs(p.y - (FLOOR_Y + 0.55)));
            col += vec3(0.8, 0.1, 0.05) * labelGlow * 0.3;
            col = mix(col, vec3(0.025, 0.028, 0.045), 1.0 - exp(-t * 0.035));

        } else if(mid > 10.5 && mid < 11.5) {
            vec3 n = calcNormal(p);
            float pulse = 0.5 + 0.5 * sin(u_time * 3.0 + length(p)*2.0);
            vec3 fracCol = mix(vec3(0.1, 0.1, 0.3), vec3(0.8, 0.1, 0.2), pulse);
            col = fracCol * (max(dot(n, normalize(vec3(1,1,1))), 0.0) * 0.8 + 0.2);
            col = mix(col, vec3(0.025, 0.028, 0.045), 1.0 - exp(-t * 0.035));

        } else if(mid < 1.5 && isWindowHit(p)) {
            vec2 vuv = gl_FragCoord.xy / u_resolution;
            vec3 voidCol = texture2D(u_voidTex, vuv).rgb;
            float fog = 1.0 - exp(-t * 0.035);
            col = mix(voidCol * 0.7, vec3(0.025, 0.028, 0.045), fog);

        } else {
            vec3 n = calcNormal(p);
            vec3 matCol;
            if(mid < 1.5)      matCol = vec3(0.45, 0.47, 0.50);
            else if(mid < 2.5) matCol = vec3(0.14, 0.14, 0.16) + hash2(floor(p.xz*18.0))*0.04;
            else if(mid < 3.5) matCol = vec3(0.15, 0.17, 0.32);
            else if(mid < 4.5) matCol = vec3(0.48, 0.48, 0.52);
            else if(mid < 5.5) matCol = vec3(0.22, 0.22, 0.25);
            else               matCol = vec3(0.25, 0.18, 0.12);

            float flicker = 0.7 + 0.3 * sin(u_time*3.9) * sin(u_time*5.7+1.4);
            vec3 ambient = vec3(0.22, 0.24, 0.28) * flicker;
            vec3 eStrip = emergencyStrip(p);

            float cockpitZ = HALF_LEN - 0.6;
            vec3 cockpitLit = vec3(0.15, 0.22, 0.28)
                * max(dot(n, normalize(vec3(0,0,1))), 0.0)
                * smoothstep(cockpitZ, cockpitZ-10.0, p.z) * 2.5;

            vec3 exitLit = exitSign(p);

            float exitDoorLight = 0.0;
            if(u_doorOpen > 0.5){
                float distToExit = length(vec2(p.z - EXIT_ROW_Z, p.x + FUSE_R));
                exitDoorLight = smoothstep(4.0, 0.0, distToExit) * 0.6;
            }

            vec3 lighting = ambient + eStrip + cockpitLit + exitLit;
            lighting += vec3(0.3, 0.4, 0.8) * exitDoorLight;

            col = matCol * lighting;
            col = mix(col, vec3(0.025, 0.028, 0.045), 1.0 - exp(-t * 0.035));
        }
    }

    col *= 1.0 - 0.3 * length((gl_FragCoord.xy/u_resolution - 0.5)*vec2(1.0, u_resolution.y/u_resolution.x));
    // Turbulence flash
    col += vec3(u_flash * 0.6);
    // Darkened lighting after cockpit visit
    col *= mix(1.0, 0.45, u_postCockpit);
    // Suction fade to white before falling
    col = mix(col, vec3(1.0), u_suctionFade);
    gl_FragColor = vec4(col * (1.0 - u_blink) * smoothstep(0.0, 0.8, u_wake), 1.0);
}
`;