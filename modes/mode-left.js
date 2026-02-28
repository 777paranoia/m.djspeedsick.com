GLSL.modules['room_left'] = `
precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform sampler2D u_texEnv1; // left-mobile.png
uniform sampler2D u_texEnv2; // Gallery 0 (TEXTURE9)
uniform sampler2D u_texEnv3; // Gallery 1 (TEXTURE10)
uniform sampler2D u_texEnv4; // Gallery 2 (TEXTURE11)
uniform sampler2D u_texEnv6; // Gallery 3 (TEXTURE12)

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv.y = 1.0 - uv.y;

    float panRangeX = 300.0 / 1437.0;
    float panRangeY = 300.0 / 2048.0;
    float screenAspect = u_resolution.x / u_resolution.y;
    float visibleAspect = 643.0 / 2000.0;

    // Camera aspect scaling
    vec2 tuv;
    if (screenAspect > visibleAspect) {
        float scale = visibleAspect / screenAspect;
        tuv = vec2(uv.x, (uv.y - 0.5) * scale + 0.5);
    } else {
        float scale = screenAspect / visibleAspect;
        tuv = vec2((uv.x - 0.5) * scale + 0.5, uv.y);
    }

    // Apply mouse panning
    tuv.x = tuv.x * (1.0 - 2.0 * panRangeX) + panRangeX - u_mouse.x * panRangeX;
    tuv.y = tuv.y * (1.0 - 2.0 * panRangeY) + panRangeY - u_mouse.y * panRangeY;

    tuv = clamp(tuv, 0.0, 1.0);

    vec4 room = texture2D(u_texEnv1, tuv);
    
    // Chroma key mask
    bool isGreen = room.g > 0.4 && room.r < 0.25 && room.b < 0.25;

    if (isGreen) {
        float px = tuv.x * 1437.0;
        float py = tuv.y * 2048.0;
        vec2 bMin, bMax;

        // Expanded bounds so WebGL stops smearing the edges
        if (px < 465.0) {
            if (py < 935.0) {
                // TOP LEFT
                bMin = vec2(110.0/1437.0, 800.0/2048.0);
                bMax = vec2(455.0/1437.0, 935.0/2048.0);
                gl_FragColor = texture2D(u_texEnv2, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
            } else {
                // BOTTOM LEFT
                bMin = vec2(110.0/1437.0, 935.0/2048.0);
                bMax = vec2(460.0/1437.0, 1075.0/2048.0);
                gl_FragColor = texture2D(u_texEnv3, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
            }
        } else {
            if (px > 650.0) {
                // RIGHT MONITOR
                bMin = vec2(670.0/1437.0, 790.0/2048.0);
                bMax = vec2(1050.0/1437.0, 945.0/2048.0);
                gl_FragColor = texture2D(u_texEnv4, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
            } else {
                // LAPTOP
                bMin = vec2(465.0/1437.0, 970.0/2048.0);
                bMax = vec2(630.0/1437.0, 1085.0/2048.0);
                gl_FragColor = texture2D(u_texEnv6, clamp((tuv - bMin) / (bMax - bMin), 0.0, 1.0));
            }
        }
    } else {
        gl_FragColor = room;
    }
}
`;