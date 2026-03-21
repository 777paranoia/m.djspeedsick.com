
window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules.fractal = `
void main() {
  vec3 ro, rd, clean_rd; setupCamera(ro, rd, clean_rd, 0.0);
  float t=0.0; vec2 hit=vec2(0.0);
  for(int i=0;i<90;i++){ hit=mapScene(ro+rd*t, true); if(hit.x<0.001||t>70.0) break; t+=hit.x; }
  
  vec3 cGreen = vec3(0.15, 0.9, 0.4); vec3 cRed = vec3(0.9, 0.05, 0.15); vec3 cAmber = vec3(1.0, 0.5, 0.0); 
  float traffic = smoothstep(0.7, 1.0, sin(rd.x * 6.0 + u_time * 1.5)) * 0.4;
  vec3 skyTone = mix(vec3(0.005, 0.01, 0.015), vec3(0.05, 0.08, 0.06), exp(-max(rd.y,0.0)*4.0)) + mix(mix(cGreen, cRed, sin(rd.x * 4.0 + u_time * 0.5) * 0.5 + 0.5), cAmber, traffic) * (noise1(u_time * 0.2 - rd.x * 3.0) * 0.5 + 0.5 + traffic) * smoothstep(0.0, -0.8, rd.y) * 0.6 * 0.8;
  vec3 col = vec3(0.0);
  
  if(t<70.0){
    vec3 p=ro+rd*t;
    if(hit.y >= 10.0){
      col = mix(colorPickover(p), skyTone * 0.15, 1.0 - exp(-0.015 * max(length(p) - 0.8, 0.0) * max(length(p) - 0.8, 0.0)));
    } else {
      vec3 n=normalize(vec3(mapScene(p+vec3(0.01,0,0),true).x-mapScene(p-vec3(0.01,0,0),true).x, mapScene(p+vec3(0,0.01,0),true).x-mapScene(p-vec3(0,0.01,0),true).x, mapScene(p+vec3(0,0,0.01),true).x-mapScene(p-vec3(0,0,0.01),true).x));
      vec3 bTex = sampleBuilding(hit.y, (abs(n.x)>abs(n.y))?p.zy:p.xy); bTex += bTex * smoothstep(0.5, 0.9, max(bTex.r, max(bTex.g, bTex.b))) * 2.5;
      col=mix(bTex*0.25, skyTone, 1.0-exp(-0.015*t*t)) + mix(cGreen, cRed, sin(p.x * 0.4) * 0.5 + 0.5) * (noise1(u_time * 0.3 + p.x * 0.1) * 0.4 + 0.6 + smoothstep(0.8, 1.0, sin(p.z * 0.8 + u_time * 2.0)) * 0.2) * smoothstep(2.0, -20.0, p.y) * 0.4 * exp(-0.005 * t * t);
      vec2 texUV = (abs(n.x)>abs(n.y))?p.zy:p.xy;
      vec2 wg = floor(texUV * vec2(5.0, 10.0));
      float won    = step(0.82, hash2(wg + hit.y * 17.0));
      float wflick = step(0.96, hash1(hash2(wg) + floor(u_time * 1.5)));
      float wpx    = smoothstep(0.005, 0.0, abs(fract(texUV.x*5.0)-0.5)-0.15)
                   * smoothstep(0.005, 0.0, abs(fract(texUV.y*10.0)-0.5)-0.10);
      col += vec3(1.0, 0.75, 0.35) * won * (1.0-wflick) * wpx * 1.2;
    }
  } else col=texture2D(u_texEnv1,fract(rd.xy*0.5+0.5+vec2(u_time*0.002,0.0))).rgb*0.3+skyTone*0.5;

  col += snow(vec2(atan(rd.z,rd.x)*2.0, rd.y*2.0), 15.0, 0.3, 0.3);
  float dWin=(-1.5-ro.z)/clean_rd.z;
  if(dWin>0.0){
    vec3 pW=ro+clean_rd*dWin; vec2 wuv=vec2(pW.x*0.25+0.5,0.5-pW.y*0.25);
    vec2 edgeUV = clamp(wuv, 0.0, 1.0); 
    vec4 txW = texture2D(u_texWindow, edgeUV);
    if(1.0-clamp(txW.a,0.0,1.0)>0.1) col=mix(col,vec3(0.6,0.7,0.8),hash2(edgeUV*80.0)*0.012);
    col=mix(col, txW.rgb * 0.5 + mix(cGreen, cRed, sin(u_time * 0.6) * 0.5 + 0.5) * (noise1(u_time * 0.5) * 0.05 + smoothstep(0.8, 1.0, sin(u_time * 1.2)) * 0.04) * txW.a * 1.5, txW.a);
  }
  
  col = digitalGlitch(col, gl_FragCoord.xy / u_resolution.xy);
  gl_FragColor=vec4(col*(1.0-u_blink)*0.60*smoothstep(0.0,0.8,u_wake), 1.0);
}
`;
