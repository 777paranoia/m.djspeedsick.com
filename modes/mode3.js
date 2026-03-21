



window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules.bh = `
void main() {
  vec3 ro, rd, clean_rd; setupCamera(ro, rd, clean_rd, 1.0);
  
  vec2 bhUV = rd.xy * 1.2 + vec2(0.5, 0.5); 
  float split = u_shake * 0.025;
  vec3 col = vec3(
    texture2D(u_texEnv1, clamp(bhUV + vec2(split, -split*0.5), 0.001, 0.999)).r, 
    texture2D(u_texEnv1, clamp(bhUV, 0.001, 0.999)).g, 
    texture2D(u_texEnv1, clamp(bhUV - vec2(split, -split*0.5), 0.001, 0.999)).b
  ) + vec3(0.8, 0.9, 1.0) * u_flash * smoothstep(0.3, 0.0, length(rd.xy)) * 1.5;

  float wr = worldRain(gl_FragCoord.xy/u_resolution.xy, u_time);
  col += vec3(0.62,0.72,0.85) * wr * 0.65;

  if (u_flash > 1.2) col = 1.0 - col;

  float dWin=(-1.5-ro.z)/clean_rd.z;
  if(dWin>0.0){
    vec3 pW=ro+clean_rd*dWin; vec2 wuv=vec2(pW.x*0.25+0.5,0.5-pW.y*0.25);
    vec2 edgeUV = clamp(wuv, 0.0, 1.0);
    vec4 txW = texture2D(u_texWindow, edgeUV);
    if(1.0-clamp(txW.a,0.0,1.0)>0.1){
      float waterH = texture2D(u_water, edgeUV).r; 
      vec2 wNorm = waterNormal(edgeUV);
      vec2 bhUVw = clamp(rd.xy * 1.2 + vec2(0.5, 0.5) + wNorm * (0.020 + u_shake * 0.02), 0.001, 0.999);
      
      vec3 refCol = vec3(
        texture2D(u_texEnv1, clamp(bhUVw + vec2(split, -split*0.5), 0.001, 0.999)).r, 
        texture2D(u_texEnv1, clamp(bhUVw, 0.001, 0.999)).g, 
        texture2D(u_texEnv1, clamp(bhUVw - vec2(split, -split*0.5), 0.001, 0.999)).b
      ) + vec3(0.8, 0.9, 1.0) * u_flash * smoothstep(0.3, 0.0, length(rd.xy)) * 1.5;
      
      refCol += vec3(0.62,0.72,0.85) * wr * 0.65;
      if (u_flash > 1.2) refCol = 1.0 - refCol;

      col = mix(col, refCol, clamp((waterH - 0.12) * 7.0, 0.0, 0.65));
      col = mix(col + vec3(0.62,0.78,1.0) * pow(clamp(dot(normalize(wNorm), normalize(vec2(0.25,0.85))), 0.0, 1.0), 7.0) * waterH * 1.6, col * 0.72, clamp(waterH * 2.6, 0.0, 0.38));
    }
    col=mix(col, txW.rgb * 0.50, txW.a);
  }
  
  col = digitalGlitch(col, gl_FragCoord.xy / u_resolution.xy);
  gl_FragColor=vec4(col*(1.0-u_blink)*smoothstep(0.0,0.8,u_wake), 1.0);
}
`;
