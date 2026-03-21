
window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules.goreville = `


uniform sampler2D u_texEnv3;
uniform sampler2D u_texEnv4;
uniform sampler2D u_texEnv5;

vec3 sampleGoreBuilding(float id, vec2 texUV) {
  vec2 uv = abs(fract(texUV * 0.25) * 2.0 - 1.0);
  if (id < 2.5) return texture2D(u_texEnv2, uv).rgb;
  if (id < 4.5) return texture2D(u_texEnv3, uv).rgb;
  return texture2D(u_texEnv4, uv).rgb;
}

float goreRainLayer(vec2 uv, float t, float scale, float speed, float thickness, float density, float slant) {
  vec2 u = uv; u.x *= u_resolution.x / u_resolution.y; u *= scale; u += vec2(slant, 1.0) * t * speed;
  vec2 id = floor(u); vec2 f = fract(u); float n = hash2(id); float on = step(1.0 - density, n);
  float x = f.x - (0.5 + (n - 0.5) * 0.18); float streak = smoothstep(thickness, 0.0, abs(x));
  float seg = hash2(id + 31.41); float gate = smoothstep(0.15, 0.95, fract(f.y + seg));
  return on * streak * gate;
}

float goreRain(vec2 uv, float t) {
  float r = 0.0;
  r += goreRainLayer(uv, t, 14.0, 2.8, 0.006, 0.20, -0.10);
  r += goreRainLayer(uv, t, 24.0, 3.8, 0.005, 0.24, -0.14);
  r += goreRainLayer(uv, t, 40.0, 5.0, 0.003, 0.28, -0.18);
  r += goreRainLayer(uv, t, 60.0, 6.2, 0.002, 0.22, -0.08);
  return clamp(r, 0.0, 1.0);
}

void main() {
  vec3 ro, rd, clean_rd; setupCamera(ro, rd, clean_rd, 0.0);
  float t = 0.0; vec2 hit = vec2(0.0);
  for(int i = 0; i < 90; i++) { hit = mapScene(ro + rd * t, false); if(hit.x < 0.001 || t > 70.0) break; t += hit.x; }

  vec3 cBlood   = vec3(0.55, 0.0,  0.02);
  vec3 cCrimson = vec3(0.85, 0.04, 0.04);
  vec3 cDark    = vec3(0.02, 0.0,  0.005);

  vec3 skyTone = texture2D(u_texEnv1, fract(rd.xy * 0.5 + 0.5 + vec2(u_time * 0.0008, 0.0))).rgb;
  skyTone = mix(skyTone, cDark, 0.45);
  skyTone += cCrimson * smoothstep(0.1, -0.7, rd.y) * 0.35;

  vec3 col = vec3(0.0);

  if(t < 70.0) {
    vec3 p = ro + rd * t;

    if(hit.y > 19.5) {

      vec2 floorUV = p.xz * 0.04 + vec2(u_time * 0.005, 0.0);
      vec3 floorCol = texture2D(u_texEnv5, fract(floorUV)).rgb;
      vec2 wn = waterNormal(gl_FragCoord.xy / u_resolution) * 0.3;
      floorCol = mix(floorCol,
        texture2D(u_texEnv5, fract(floorUV + wn * 0.015)).rgb,
        clamp(texture2D(u_water, gl_FragCoord.xy / u_resolution).r * 5.0, 0.0, 0.6));
      floorCol = mix(floorCol, cBlood, 0.35);
      col = mix(floorCol, skyTone, 1.0 - exp(-0.008 * t * t));

    } else {
      vec3 n = normalize(vec3(
        mapScene(p + vec3(0.01,0,0), false).x - mapScene(p - vec3(0.01,0,0), false).x,
        mapScene(p + vec3(0,0.01,0), false).x - mapScene(p - vec3(0,0.01,0), false).x,
        mapScene(p + vec3(0,0,0.01), false).x - mapScene(p - vec3(0,0,0.01), false).x
      ));
      vec3 bTex = sampleGoreBuilding(hit.y, (abs(n.x) > abs(n.y)) ? p.zy : p.xy);
      bTex += bTex * smoothstep(0.5, 0.9, max(bTex.r, max(bTex.g, bTex.b))) * 2.5;

      vec2 texUV = (abs(n.x) > abs(n.y)) ? p.zy : p.xy;
      vec2 wg = floor(texUV * vec2(5.0, 10.0));
      float won = step(0.68, hash2(wg + hit.y * 17.0));
      float wflick = step(0.88, hash1(hash2(wg) + floor(u_time * 2.5)));
      float wpx = smoothstep(0.005, 0.0, abs(fract(texUV.x * 5.0) - 0.5) - 0.15)
                 * smoothstep(0.005, 0.0, abs(fract(texUV.y * 10.0) - 0.5) - 0.10);
      float wPulse = 0.7 + 0.3 * sin(u_time * 1.8 + hash2(wg) * 6.28);
      vec3 wCol = mix(vec3(0.9, 0.2, 0.05), vec3(1.0, 0.6, 0.2), hash2(wg + 7.0));
      bTex += wCol * won * (1.0 - wflick) * wpx * 1.4 * wPulse;

      col = mix(bTex * 0.22, skyTone, 1.0 - exp(-0.007 * t * t))
          + cBlood * (noise1(u_time * 0.25 + p.x * 0.1) * 0.4 + 0.6)
          * smoothstep(2.0, -20.0, p.y) * 0.38 * exp(-0.003 * t * t);
    }
  } else {
    col = skyTone;
  }


  vec2 rainUV = rd.xz / (abs(rd.y) + 0.1);
  float rain = goreRain(rainUV, u_time);
  col += cCrimson * rain * 1.1;


  float dWin = (-1.5 - ro.z) / clean_rd.z;
  if(dWin > 0.0) {
    vec3 pW = ro + clean_rd * dWin;
    vec2 wuv = vec2(pW.x * 0.25 + 0.5, 0.5 - pW.y * 0.25);
    vec2 edgeUV = clamp(wuv, 0.0, 1.0);
    vec4 txW = texture2D(u_texWindow, edgeUV);
    if(1.0 - clamp(txW.a, 0.0, 1.0) > 0.1)
      col = mix(col, vec3(0.45, 0.08, 0.06), hash2(edgeUV * 80.0) * 0.012);
    col = mix(col,
      txW.rgb * 0.5 + cCrimson * (noise1(u_time * 0.5) * 0.05 + smoothstep(0.8, 1.0, sin(u_time * 1.2)) * 0.05) * txW.a * 1.5,
      txW.a);
  }

  col = digitalGlitch(col, gl_FragCoord.xy / u_resolution.xy);
  gl_FragColor = vec4(col * (1.0 - u_blink) * 0.80 * smoothstep(0.0, 0.8, u_wake), 1.0);
}
`;
