window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules.master = `
void main() {
  vec3 ro, rd, clean_rd; 
  setupCamera(ro, rd, clean_rd, (u_mode == 3) ? 1.0 : 0.0);

  // 1. PHYSICAL U-BOX PROJECTION
  float tHit = 1e10; vec2 wuv = vec2(-1.0); int wall = 0; 
  float tF = (0.0 - ro.z) / clean_rd.z;
  if(tF > 0.0) {
      vec3 p = ro + clean_rd * tF;
      if(abs(p.x) < 1.5) { tHit = tF; wall = 2; wuv = vec2(p.x/3.0 + 0.5, 0.5 - p.y*0.25); }
  }
  float tL = (-1.5 - ro.x) / clean_rd.x;
  if(tL > 0.0 && tL < tHit) {
      vec3 p = ro + clean_rd * tL;
      if(p.z > 0.0 && p.z < 3.0) { tHit = tL; wall = 1; wuv = vec2(1.0 - p.z/3.0, 0.5 - p.y*0.25); }
  }
  float tR = (1.5 - ro.x) / clean_rd.x;
  if(tR > 0.0 && tR < tHit) {
      vec3 p = ro + clean_rd * tR;
      if(p.z > 0.0 && p.z < 3.0) { tHit = tR; wall = 3; wuv = vec2(p.z/3.0, 0.5 - p.y*0.25); }
  }

  vec4 txW = vec4(0.0);
  if(wall > 0) {
      vec2 panoUV = vec2(wuv.x * 0.333 + (float(wall-1) * 0.333), wuv.y);
      txW = texture2D(u_texWindow, clamp(panoUV, 0.0, 1.0));
      if(txW.a > 0.95) {
          gl_FragColor = vec4(txW.rgb * (1.0 - u_blink) * smoothstep(0.0, 0.8, u_wake), 1.0);
          return; // STOP HEAVY CALCULATIONS
      }
  }

  // 2. SCENE BRANCHING
  vec3 col = vec3(0.0);
  if (u_mode == 8 || u_mode == 9) {
      vec2 flyUV = gl_FragCoord.xy / u_resolution.xy; flyUV.y = 1.0 - flyUV.y;
      col = texture2D(u_texEnv1, flyUV).rgb;
  } else {
      float t=0.0; vec2 hit=vec2(0.0);
      bool isFrac = (u_mode == 1 || u_mode == 2 || u_mode == 5);
      for(int i=0;i<90;i++){ hit=mapScene(ro+rd*t, isFrac); if(hit.x<0.001||t>70.0) break; t+=hit.x; }
      vec3 skyTone = mix(vec3(0.005, 0.01, 0.015), vec3(0.05, 0.08, 0.06), exp(-max(rd.y,0.0)*4.0));
      if(t<70.0){
          vec3 p=ro+rd*t;
          if(hit.y <= 9.0) {
              vec3 n=normalize(vec3(mapScene(p+vec3(0.01,0,0),isFrac).x-mapScene(p-vec3(0.01,0,0),isFrac).x, mapScene(p+vec3(0,0.01,0),isFrac).x-mapScene(p-vec3(0,0.01,0),isFrac).x, mapScene(p+vec3(0,0,0.01),isFrac).x-mapScene(p-vec3(0,0,0.01),isFrac).x));
              vec3 bTex = sampleBuilding(hit.y, (abs(n.x)>abs(n.y))?p.zy:p.xy);
              col=mix(bTex*0.25, skyTone, 1.0-exp(-0.015*t*t));
          } else { col = mix(colorPickover(p), skyTone * 0.12, 1.0 - exp(-0.015 * length(p))); }
      } else col = skyTone;
  }

  // 3. COMPOSITE
  if(wall == 2) {
      if(1.0-clamp(txW.a,0.0,1.0)>0.1) col=mix(col,vec3(0.6,0.7,0.8),hash2(wuv*80.0)*0.012);
      col = mix(col, txW.rgb * 0.5 + txW.a * 0.2, txW.a);
  }
  
  col = applyRoomBlend(col, gl_FragCoord.xy / u_resolution.xy);
  if (u_flash > 1.2) col = 1.0 - col;
  gl_FragColor = vec4(col * (1.0 - u_blink) * smoothstep(0.0, 0.8, u_wake), 1.0);
}
`;