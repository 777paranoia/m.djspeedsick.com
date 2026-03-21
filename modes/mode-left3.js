
window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules['z3_bathroom'] = `
precision mediump float;

uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_time;
uniform float u_blink;
uniform float u_wake;

uniform sampler2D u_texEnv1;      
uniform sampler2D u_voidTex;      

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv.y = 1.0 - uv.y;

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
    tuv = clamp(tuv, 0.0, 1.0);

    vec4 room = texture2D(u_texEnv1, tuv);

    
    vec3 col = room.rgb;

    if (room.a < 0.15) {
        
        float fboAspect = u_resolution.x / u_resolution.y;

        
        float hxMin = 0.25;
        float hxMax = 0.75;
        float hyMin = 0.20;
        float hyMax = 0.80;

        vec2 holeUV = vec2(
            (tuv.x - hxMin) / (hxMax - hxMin),
            1.0 - ((tuv.y - hyMin) / (hyMax - hyMin))
        );

        float holeAspect = (hxMax - hxMin) * 1437.0 / ((hyMax - hyMin) * 2048.0);
        vec2 centered = holeUV - 0.5;
        if (fboAspect < holeAspect) {
            centered.y *= fboAspect / holeAspect;
        } else {
            centered.x *= holeAspect / fboAspect;
        }
        holeUV = centered + 0.5;

        vec3 voidCol = texture2D(u_voidTex, clamp(holeUV, 0.0, 1.0)).rgb;

        
        float edgeBlend = smoothstep(0.0, 0.15, room.a);
        col = mix(voidCol, room.rgb, edgeBlend);

        
        float dustNoise = fract(sin(dot(tuv * 200.0, vec2(12.9898, 78.233)) + u_time * 0.3) * 43758.5453);
        float dustMask = smoothstep(0.0, 0.2, room.a) * (1.0 - smoothstep(0.2, 0.35, room.a));
        col += vec3(0.15, 0.10, 0.06) * dustNoise * dustMask * 0.3;
    }

    
    vec2 vuv = gl_FragCoord.xy / u_resolution;
    float dmgVig = 1.0 - 0.3 * pow(length((vuv - 0.5) * vec2(1.4, 1.0)), 1.6);
    col *= dmgVig;


    float fogMix = 0.12 + 0.04 * sin(u_time * 0.2);
    col = mix(col, vec3(0.06, 0.07, 0.09), fogMix);

    col *= (1.0 - u_blink) * smoothstep(0.0, 0.8, u_wake);

    gl_FragColor = vec4(col, 1.0);
}
`;
