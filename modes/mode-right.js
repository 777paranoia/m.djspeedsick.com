GLSL.modules['room_right'] = `
precision mediump float;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform sampler2D u_texEnv1; // right-mobile.png
uniform sampler2D u_texEnv2; // Video 0 — Tall Left
uniform sampler2D u_texEnv3; // Video 1 — Top Center
uniform sampler2D u_texEnv4; // Video 2 — Bottom Center
uniform sampler2D u_texEnv6; // Video 3 — Small Bottom-L
uniform sampler2D u_texEnv5; // Mirror — mode shader

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv.y = 1.0 - uv.y;
    float panRangeX = 300.0 / 1243.0;
    float panRangeY = 300.0 / 2000.0;
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

    vec4 room = texture2D(u_texEnv1, tuv);
    bool isGreen = room.g > 0.4 && room.r < 0.25 && room.b < 0.25;

    if (isGreen) {
        float px = tuv.x * 1243.0;
        float py = tuv.y * 2048.0; // Fixed resolution scale
        vec2 bMin, bMax;

        if (px < 330.0) {
            bMin = vec2(155.0/1243.0, 875.0/2000.0);
            bMax = vec2(300.0/1243.0, 1115.0/2000.0);
            gl_FragColor = texture2D(u_texEnv2, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
            return;
        } 
        else if (px > 720.0) {
            bMin = vec2(780.0/1243.0, 935.0/2000.0);
            bMax = vec2(1010.0/1243.0, 1055.0/2000.0);
            vec2 mirrorUV = clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0);
            mirrorUV.y = 1.0 - mirrorUV.y; // FLIP MIRROR CONTENT
            vec4 mirrorCol = texture2D(u_texEnv5, mirrorUV);
            gl_FragColor = vec4(mirrorCol.rgb * 3.0, 1.0);
            return;
        } 
        else {
            if (px < 460.0) {
                bMin = vec2(355.0/1243.0, 1010.0/2000.0);
                bMax = vec2(445.0/1243.0, 1120.0/2000.0);
                gl_FragColor = texture2D(u_texEnv6, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
                return;
            } else if (py < 980.0) {
                bMin = vec2(465.0/1243.0, 875.0/2000.0);
                bMax = vec2(655.0/1243.0, 975.0/2000.0);
                gl_FragColor = texture2D(u_texEnv3, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
                return;
            } else {
                bMin = vec2(485.0/1243.0, 990.0/2000.0);
                bMax = vec2(670.0/1243.0, 1095.0/2000.0);
                gl_FragColor = texture2D(u_texEnv4, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
                return;
            }
        }
    } else {
        gl_FragColor = room;
    }
}
`;