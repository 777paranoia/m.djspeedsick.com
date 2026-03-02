window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules['room_right'] = `
precision mediump float;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_texEnv1; // right-mobile.png
uniform sampler2D u_texEnv2; // Video 0 — Tall Left
uniform sampler2D u_texEnv3; // Video 1 — Top Center
uniform sampler2D u_texEnv4; // Video 2 — Bottom Center
uniform sampler2D u_texEnv6; // Video 3 — Small Bottom-L
uniform sampler2D u_texEnv5; // Mirror — mode shader
uniform float u_trip;
uniform float u_modeSeed; // NEW

float hash2(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
float hash1(float x){ return fract(sin(x*127.1 + 1.9898)*43758.5); } // NEW

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

// DATAMOSH GLITCH ADDED TO RIGHT ROOM
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

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv.y = 1.0 - uv.y;
    float panRangeX = 300.0 / 1243.0;
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
    
    // RESTORED CORRECT WAVE AMPLITUDE
    tuv += (r - 0.5) * 0.012 * u_trip; 
    
    tuv = clamp(tuv, 0.0, 1.0);

    vec4 room = texture2D(u_texEnv1, tuv);
    bool isGreen = room.g > 0.4 && room.r < 0.25 && room.b < 0.25;

    vec4 finalCol = room;

    if (isGreen) {
        float px = tuv.x * 1243.0;
        float py = tuv.y * 2048.0; 
        vec2 bMin, bMax;

        if (px < 330.0) {
            bMin = vec2(155.0/1243.0, 875.0/2048.0);
            bMax = vec2(300.0/1243.0, 1115.0/2048.0);
            finalCol = texture2D(u_texEnv2, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
        } 
        else if (px > 720.0) {
            bMin = vec2(780.0/1243.0, 935.0/2048.0);
            bMax = vec2(1010.0/1243.0, 1055.0/2048.0);
            vec2 mirrorUV = clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0);
            mirrorUV.y = 1.0 - mirrorUV.y; 
            vec4 mirrorCol = texture2D(u_texEnv5, mirrorUV);
            finalCol = vec4(mirrorCol.rgb * 3.0, 1.0);
        } 
        else {
            if (px < 460.0) {
                bMin = vec2(355.0/1243.0, 1010.0/2048.0);
                bMax = vec2(445.0/1243.0, 1120.0/2048.0);
                finalCol = texture2D(u_texEnv6, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
            } else if (py < 980.0) {
                bMin = vec2(465.0/1243.0, 875.0/2048.0);
                bMax = vec2(655.0/1243.0, 975.0/2048.0);
                finalCol = texture2D(u_texEnv3, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
            } else {
                bMin = vec2(485.0/1243.0, 990.0/2048.0);
                bMax = vec2(670.0/1243.0, 1095.0/2048.0);
                finalCol = texture2D(u_texEnv4, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
            }
        }
    }
    
    finalCol.rgb = digitalGlitch(finalCol.rgb, gl_FragCoord.xy / u_resolution.xy);
    gl_FragColor = finalCol;
}
`;