window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules.deadcity = `
void main() {
  vec3 ro, rd, clean_rd; setupCamera(ro, rd, clean_rd, 0.0); 
  vec2 bhUV = rd.xy * 1.2 + vec2(0.5, 0.5);
  vec3 col = texture2D(u_texEnv1, clamp(bhUV, 0.001, 0.999)).rgb;
  
  vec4 cTex = texture2D(u_texEnv2, vec2(fract(bhUV.x), 1.0 - clamp(bhUV.y * 1.0 + 0.05, 0.0, 1.0)));
  col = mix(col, cTex.rgb, cTex.a);

  // Flash lives in the world only, applied before window composite
  col += vec3(0.55,0.78,1.0) * u_flash * 0.35;
  
  float dWin=(-1.5-ro.z)/clean_rd.z;
  if(dWin>0.0){
    vec3 pW=ro+clean_rd*dWin; vec2 wuv=vec2(pW.x*0.25+0.5,0.5-pW.y*0.25);
    vec2 edgeUV = clamp(wuv, 0.0, 1.0);
    vec4 txW = texture2D(u_texWindow, edgeUV);
    
    if(1.0-clamp(txW.a,0.0,1.0)>0.1){
      float waterH = texture2D(u_water, edgeUV).r; vec2 wNorm = waterNormal(edgeUV) * 0.4;
      vec2 bhUVw = clamp(rd.xy * 1.2 + vec2(0.5, 0.5) + wNorm * 0.020, 0.001, 0.999);
      vec3 bgCol = texture2D(u_texEnv1, bhUVw).rgb;
      
      vec4 cTexW = texture2D(u_texEnv2, vec2(fract(bhUVw.x), 1.0 - clamp(bhUVw.y * 1.0 + 0.05, 0.0, 1.0)));
      bgCol = mix(bgCol, cTexW.rgb, cTexW.a);
      
      col = mix(col, bgCol, clamp((waterH - 0.12) * 7.0, 0.0, 0.65));
      col = mix(col + vec3(0.62,0.78,1.0) * pow(clamp(dot(normalize(wNorm), normalize(vec2(0.25,0.85))), 0.0, 1.0), 7.0) * waterH * 1.6, col * 0.72, clamp(waterH * 2.6, 0.0, 0.38));
    }
    // No flash on the window frame — it sits in front of the world
    col=mix(col, txW.rgb * 0.50, txW.a);
  }
  
  col = digitalGlitch(col, gl_FragCoord.xy / u_resolution.xy);
  gl_FragColor=vec4(col*(1.0-u_blink)*smoothstep(0.0,0.8,u_wake), 1.0);
}
`;