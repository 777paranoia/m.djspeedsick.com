window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules['room_left'] = `
precision mediump float;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_texEnv1; 
uniform sampler2D u_texEnv2; 
uniform sampler2D u_texEnv3; 
uniform sampler2D u_texEnv4; 
uniform sampler2D u_texEnv6; 
uniform sampler2D u_texEnv5; 
uniform float u_trip;
uniform float u_modeSeed;
uniform float u_flash;

float hash2(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
float hash1(float x){ return fract(sin(x*127.1 + 1.9898)*43758.5); }

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

vec4 getScreenCol(vec2 tuv) {
    vec4 room = texture2D(u_texEnv1, tuv);
    bool isGreen = room.g > 0.4 && room.r < 0.25 && room.b < 0.25;
    if (!isGreen) return room;

    vec2 bMin, bMax; vec4 finalCol = room;

    if (tuv.x < 0.296) {
        if (tuv.y < 0.458) {

            bMin = vec2(0.0963, 0.4010); bMax = vec2(0.2694, 0.4526);
            finalCol = texture2D(u_texEnv2, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
        } else {

            bMin = vec2(0.1009, 0.4625); bMax = vec2(0.2694, 0.5125);
            finalCol = texture2D(u_texEnv3, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
        }
    } else if (tuv.x > 0.423) {

        bMin = vec2(0.4370, 0.3969); bMax = vec2(0.6102, 0.4453);
        finalCol = texture2D(u_texEnv4, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
    } else {

        bMin = vec2(0.3231, 0.4839); bMax = vec2(0.4093, 0.5125);
        finalCol = texture2D(u_texEnv6, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
    }
    return finalCol;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv.y = 1.0 - uv.y;
    

    float gTick = floor(u_time * 16.0);
    if (step(0.979, hash1(gTick * 133.77)) > 0.0) {
        uv.x += (hash1(floor(uv.y * 20.0) + gTick) - 0.5) * 0.21 * clamp(u_trip, 0.0, 1.0);
    }
    
    float panRangeX = 300.0 / 1437.0;
    float panRangeY = 300.0 / 2048.0;
    float screenAspect = u_resolution.x / u_resolution.y;
    float visibleAspect = 643.0 / 2000.0;
    vec2 tuv;
    if (screenAspect > visibleAspect) {
        float scale = visibleAspect / screenAspect;
        tuv = vec2(uv.x, (uv.y - 0.5) * scale + 0.5);
    } else {
        float scale = screenAspect / visibleAspect;
        tuv = vec2((uv.x - 0.5) * scale + 0.5, uv.y);
    }
    tuv.x = tuv.x * (1.0 - 2.0 * panRangeX) + panRangeX - u_mouse.x * panRangeX;
    tuv.y = tuv.y * (1.0 - 2.0 * panRangeY) + panRangeY - u_mouse.y * panRangeY;


    float t = u_time * 0.1;
    vec2 q = vec2(0.0);
    q.x = fbm(tuv * 5.0 + vec2(0.0, t));
    q.y = fbm(tuv * 5.0 + vec2(t, 0.0));
    vec2 r = vec2(0.0);
    r.x = fbm(tuv * 5.0 + 2.0 * q + vec2(1.7, 9.2) + 0.15 * t);
    r.y = fbm(tuv * 5.0 + 2.0 * q + vec2(8.3, 2.8) + 0.12 * t);
    

    float liqAmp = mix(0.012, 0.08, 0.0) * u_trip; 
    tuv += (r - 0.5) * liqAmp; 
    tuv = clamp(tuv, 0.0, 1.0);

    float burstSlot = floor(u_time * 12.0); 
    float isBurst = step(0.94, hash1(burstSlot * 13.7 + u_modeSeed)); 
    float flicker = step(0.5, hash1(floor(u_time * 60.0) * 9.1)); 
    float activeG = isBurst * flicker * clamp(u_trip, 0.0, 1.5);
    float rndG = hash1(burstSlot + u_modeSeed);
    float gridSize = (rndG < 0.33) ? 64.0 : ((rndG < 0.66) ? 128.0 : 256.0);
    vec2 blockUV = floor(tuv * gridSize) / gridSize;
    float blockRnd = hash2(blockUV + floor(u_time * 30.0)); 
    vec2 motionVector = (vec2(hash1(blockRnd), hash1(blockRnd * 2.0)) - 0.5) * 0.15;
    float doMosh = step(0.9, blockRnd) * activeG;
    vec2 moshUV = mix(tuv, fract(blockUV + motionVector * activeG), doMosh);

    vec3 col = getScreenCol(tuv).rgb;
    vec3 moshCol = getScreenCol(moshUV).rgb;
    col = mix(col, moshCol, doMosh);

    float doDegrade = step(0.92, hash2(blockUV + 9.3)) * activeG; 
    vec3 degradedCol = floor(col * 3.0) / 3.0;
    float tintRnd = hash1(blockRnd * 3.0);
    vec3 yuvTint = (tintRnd > 0.5) ? vec3(0.9, 0.1, 0.8) : vec3(0.1, 0.8, 0.3);
    col = mix(col, degradedCol * yuvTint, doDegrade);

    float miniGrid = gridSize * 2.0;
    vec2 miniBlockUV = floor(tuv * miniGrid) / miniGrid;
    float miniRnd = hash2(miniBlockUV + floor(u_time * 60.0));
    float doMini = step(0.95, miniRnd) * activeG; 
    col = mix(col, vec3(col.b, col.r, col.g), doMini); 


    col += vec3(u_flash);

    gl_FragColor = vec4(col, 1.0);
}
`;
