window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules['z3_hallway'] = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_camZ;
uniform float u_blink;
uniform float u_shake;
uniform float u_isWalking;

uniform sampler2D u_texLeft;
uniform sampler2D u_texRight;
uniform sampler2D u_texTop;
uniform sampler2D u_texBottom;
uniform sampler2D u_cabinTex;

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

float rectMask(vec2 uv, vec2 mn, vec2 mx, float feather) {
    vec2 a = smoothstep(mn, mn + vec2(feather), uv);
    vec2 b = 1.0 - smoothstep(mx - vec2(feather), mx, uv);
    return a.x * a.y * b.x * b.y;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

    float liquidX = sin(uv.y * 12.0 + u_time * 0.4) * 0.004 + cos(uv.x * 10.0 - u_time * 0.3) * 0.003;
    float liquidY = cos(uv.x * 14.0 + u_time * 0.3) * 0.004 + sin(uv.y * 11.0 - u_time * 0.4) * 0.003;
    liquidX += sin(u_time * 30.0) * 0.01 * u_shake;
    liquidY += cos(u_time * 25.0) * 0.01 * u_shake;

    vec3 box = vec3(0.5625, 1.0, 3.5);

    float bobX = sin(u_time * 2.5) * 0.006 * u_isWalking;
    float bobY = cos(u_time * 5.0) * 0.008 * u_isWalking;
    vec3 ro = vec3(bobX, bobY, u_camZ);

    vec3 rd = normalize(vec3(uv.x + liquidX, uv.y + liquidY, 1.0));

    vec2 m = u_mouse * 0.35;
    rd.yz *= rot(m.y * 0.8);
    rd.xz *= rot(m.x);

    vec3 tPos = (box * sign(rd) - ro) / rd;
    float t = min(min(tPos.x, tPos.y), tPos.z);
    vec3 pos = ro + rd * t;
    vec3 nPos = pos / box;
    vec3 absPos = abs(nPos);

    vec4 hallTex = vec4(0.0);
    vec2 tileUV = vec2(0.0);
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
            wallID = 2;
        } else {
            wallID = 3;
        }
    }

    vec3 finalCol = hallTex.rgb;

    if (wallID == 2) {
        vec2 wallUV = vec2(nPos.x, -nPos.y) * 0.5 + 0.5;
        vec2 doorMin = vec2(0.28, 0.12);
        vec2 doorMax = vec2(0.72, 0.90);
        float doorMask = rectMask(wallUV, doorMin, doorMax, 0.02);

        vec2 doorUV = (wallUV - doorMin) / (doorMax - doorMin);
        doorUV = clamp(doorUV, 0.0, 1.0);

        vec2 screenUV = gl_FragCoord.xy / u_resolution.xy;
        vec3 cabinDoorCol = texture2D(u_cabinTex, doorUV).rgb;
        vec3 cabinFullCol = texture2D(u_cabinTex, screenUV).rgb;

        float distToDoor = max(0.0, box.z - ro.z);
        float takeover = 1.0 - smoothstep(1.1, 0.18, distToDoor);

        vec3 doorFrameCol = vec3(0.01, 0.005, 0.005);
        vec3 frontBase = mix(vec3(0.0), cabinDoorCol, doorMask);
        frontBase = max(frontBase, doorFrameCol * (1.0 - doorMask));

        finalCol = mix(frontBase, cabinFullCol, takeover);
    } else if (wallID == 3) {
        finalCol = vec3(0.0);
    } else {
        bool isCutout = hallTex.a < 0.1 || (hallTex.g > 0.4 && hallTex.r < 0.25 && hallTex.b < 0.25);
        if (isCutout) finalCol = vec3(0.0);
    }

    float fogThickness = 0.5;
    float fogFactor = exp(-t * fogThickness);
    vec3 fogColor = vec3(0.03, 0.01, 0.01);
    finalCol = mix(fogColor, finalCol, fogFactor);

    float distToDoorGlobal = max(0.0, box.z - ro.z);
    float globalTakeover = 1.0 - smoothstep(0.72, 0.06, distToDoorGlobal);
    vec2 finalScreenUV = gl_FragCoord.xy / u_resolution.xy;
    vec3 finalCabinCol = texture2D(u_cabinTex, finalScreenUV).rgb;
    finalCol = mix(finalCol, finalCabinCol, globalTakeover);

    float lum = dot(finalCol, vec3(0.299, 0.587, 0.114));
    vec3 eerieTint = vec3(lum * 0.85, lum * 0.7, lum * 0.7);
    finalCol = mix(finalCol, eerieTint, 0.4);

    float vignette = smoothstep(1.3, 0.2, length(uv));
    finalCol *= vignette;
    finalCol *= 0.65;

    gl_FragColor = vec4(finalCol * (1.0 - u_blink), 1.0);
}
`;