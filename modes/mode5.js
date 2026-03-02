window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules.ocean = `
void main() {
  vec3 ro, rd, clean_rd; setupCamera(ro, rd, clean_rd, 0.0);
  
  vec2 envUV = vec2(0.5) + vec2(rd.x, -rd.y) * 1.2;
  float t_w = u_time * 0.5; 
  vec2 waveOffset = vec2(sin(envUV.y * 10.0 + t_w) * 0.02 + sin(envUV.y * 25.0 - t_w * 1.5) * 0.01, cos(envUV.x * 8.0 + t_w * 0.8) * 0.015 + cos(envUV.x * 30.0 + t_w * 2.0) * 0.008);
  
  // The Fix: smoothstep(0.45, 0.7, envUV.y) isolates the bottom half of the screen
  vec2 distUV = clamp(envUV + waveOffset * smoothstep(0.45, 0.7, envUV.y), 0.0, 1.0);
  distUV.y = 1.0 - distUV.y; 
  
  vec3 skyTone = texture2D(u_texEnv1, distUV).rgb;
  skyTone = mix(skyTone, vec3(0.01, 0.05, 0.1), 0.2 + hash2(gl_FragCoord.xy/u_resolution.xy * 50.0 + u_time * 2.0) * 0.15) * mix(0.5, 1.1, sin(u_time * 0.3) * 0.5 + 0.5);
  
  float t=0.0; vec2 hit=vec2(0.0);
  for(int i=0;i<90;i++){ hit=mapScene(ro+rd*t, true); if(hit.x<0.001||t>70.0) break; t+=hit.x; }
  
  vec3 col = skyTone;
  if(t<70.0 && hit.y > 9.0){
    vec3 p=ro+rd*t;
    col = mix(colorPickover(p), skyTone, 1.0 - exp(-0.015 * max(length(p) - 0.8, 0.0) * max(length(p) - 0.8, 0.0)));
  }

  float dWin=(-1.5-ro.z)/clean_rd.z;
  if(dWin>0.0){
    vec3 pW=ro+clean_rd*dWin; vec2 wuv=vec2(pW.x*0.25+0.5,0.5-pW.y*0.25);
    vec4 txW = texture2D(u_texWindow, 1.0 - abs(fract(wuv * 0.5) * 2.0 - 1.0));
    if(wuv.x<0.0||wuv.x>1.0||wuv.y<0.0||wuv.y>1.0){ txW.a=1.0; txW.rgb=mix(vec3(0.01),txW.rgb,0.3); }
    if(1.0-clamp(txW.a,0.0,1.0)>0.1) col=mix(col,vec3(0.6,0.7,0.8),hash2(wuv*80.0)*0.012);
    col=mix(col, txW.rgb * 0.5 + vec3(0.05, 0.2, 0.4) * (noise1(u_time * 0.5) * 0.1) * txW.a, txW.a);
  }
  
  col = digitalGlitch(col, gl_FragCoord.xy / u_resolution.xy);
  gl_FragColor=vec4(col*(1.0-u_blink)*0.85*smoothstep(0.0,0.8,u_wake), 1.0);
}
`;