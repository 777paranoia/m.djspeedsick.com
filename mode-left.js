GLSL.modules['room_left'] = `
precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform sampler2D u_texEnv1;
uniform sampler2D u_texEnv2;
uniform vec2 u_texSize;

void main() {

    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv.y = 1.0 - uv.y;

    float panRangeX = 300.0 / u_texSize.x;
    float panRangeY = 300.0 / u_texSize.y;

    float screenAspect = u_resolution.x / u_resolution.y;
    float visibleAspect = (u_texSize.x - 600.0) / u_texSize.y;

    vec2 tuv;
    if (screenAspect > visibleAspect) {
        float scale = visibleAspect / screenAspect;
        tuv = vec2(uv.x, (uv.y - 0.5) * scale + 0.5);
    } else {
        float scale = screenAspect / visibleAspect;
        tuv = vec2((uv.x - 0.5) * scale + 0.5, uv.y);
    }

    tuv.x = tuv.x * (1.0 - 2.0 * panRangeX) + panRangeX;
    tuv.y = tuv.y * (1.0 - 2.0 * panRangeY) + panRangeY;
    tuv.x += u_mouse.x * panRangeX;
    tuv.y -= u_mouse.y * panRangeY;

    vec4 room = texture2D(u_texEnv1, tuv);

    // Replace green box (X: 280-522, Y: 792-1179 in 1243x2000 image) with hands.png
    vec2 boxUV0 = vec2(280.0 / u_texSize.x, 792.0 / u_texSize.y);
    vec2 boxUV1 = vec2(522.0 / u_texSize.x, 1179.0 / u_texSize.y);

    bool inBox = tuv.x >= boxUV0.x && tuv.x <= boxUV1.x &&
                 tuv.y >= boxUV0.y && tuv.y <= boxUV1.y;

    if (inBox) {
        vec2 handsUV = vec2(
            (tuv.x - boxUV0.x) / (boxUV1.x - boxUV0.x),
            (tuv.y - boxUV0.y) / (boxUV1.y - boxUV0.y)
        );
        gl_FragColor = texture2D(u_texEnv2, handsUV);
    } else {
        gl_FragColor = room;
    }
}
`;
