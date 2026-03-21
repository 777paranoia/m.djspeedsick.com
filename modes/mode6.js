


window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules.earth = `
void main() {
  vec3 ro, rd, clean_rd; setupCamera(ro, rd, clean_rd, 0.0);

  float t = 0.0; vec2 hit = vec2(0.0);
  for(int i = 0; i < 90; i++) { hit = mapScene(ro + rd * t, true); if(hit.x < 0.001 || t > 70.0) break; t += hit.x; }

  vec3 envCol = mix(
    texture2D(u_texEnv1, clamp(vec2(0.5) + vec2(rd.x, -rd.y) * 1.5, 0.0, 1.0)).rgb,
    vec3(0.0),
    0.1 + hash2(gl_FragCoord.xy/u_resolution.xy * 50.0 + u_time * 2.0) * 0.15
  );

  vec3 col = envCol;

  if(t < 70.0) {
    vec3 p = ro + rd * t;
    if(hit.y >= 10.0) {
      col = mix(colorPickover(p), envCol * 0.12, 1.0 - exp(-0.015 * max(length(p) - 0.8, 0.0) * max(length(p) - 0.8, 0.0)));
    }
  }

  float dWin=(-1.5-ro.z)/clean_rd.z;
  if(dWin>0.0){
    vec3 pW=ro+clean_rd*dWin; vec2 wuv=vec2(pW.x*0.25+0.5,0.5-pW.y*0.25);
    vec2 edgeUV = clamp(wuv, 0.0, 1.0);
    vec4 txW = texture2D(u_texWindow, edgeUV);
    if(1.0-clamp(txW.a,0.0,1.0)>0.1) col=mix(col,vec3(0.6,0.7,0.8),hash2(edgeUV*80.0)*0.012);
    col=mix(col, txW.rgb * 0.5 + vec3(0.2, 0.3, 0.4) * (noise1(u_time * 0.5) * 0.1) * txW.a, txW.a);
  }
  
  col = digitalGlitch(col, gl_FragCoord.xy / u_resolution.xy);
  gl_FragColor=vec4(col*(1.0-u_blink)*0.85*smoothstep(0.0,0.8,u_wake), 1.0);
}
`;
