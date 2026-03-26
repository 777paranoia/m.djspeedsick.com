window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules['z3_bedroom'] = `
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

    float screenAspect = u_resolution.x / u_resolution.y;
    float imgAspect = 1080.0 / 1920.0;
    float visibleAspect = mix(imgAspect, 1.0, smoothstep(0.7, 1.4, screenAspect));
    float panRangeX = mix(0.06, 0.10, smoothstep(0.7, 1.4, screenAspect));
    float panRangeY = mix(0.06, 0.28, smoothstep(0.7, 1.4, screenAspect));
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

    if (room.a < 0.1) {
        float fboAspect = u_resolution.x / u_resolution.y;
        float wxMin = 480.0 / 1243.0;
        float wxMax = 820.0 / 1243.0;
        float wyMin = 680.0 / 2048.0;
        float wyMax = 1350.0 / 2048.0;
        vec2 winUV = vec2(
            (tuv.x - wxMin) / (wxMax - wxMin),
            1.0 - ((tuv.y - wyMin) / (wyMax - wyMin))
        );
        float winAspect = (wxMax - wxMin) * 1243.0 / ((wyMax - wyMin) * 2048.0);
        vec2 centered = winUV - 0.5;
        if (fboAspect < winAspect) centered.y *= fboAspect / winAspect;
        else centered.x *= winAspect / fboAspect;
        winUV = centered + 0.5;
        col = texture2D(u_voidTex, clamp(winUV, 0.0, 1.0)).rgb;
    }

    bool isGreen = room.g > 0.4 && room.r < 0.25 && room.b < 0.25;
    if (isGreen) {
        col = texture2D(u_voidTex, tuv).rgb;
    }

    float fogMix = 0.10 + 0.03 * sin(u_time * 0.2);
    col = mix(col, vec3(0.04, 0.05, 0.08), fogMix);
    col *= (1.0 - u_blink) * smoothstep(0.0, 0.8, u_wake);

    gl_FragColor = vec4(col, 1.0);
}
`;
