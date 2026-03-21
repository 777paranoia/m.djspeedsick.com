


window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules.mirror = `
uniform sampler2D u_texEnv3;
void main() {
  vec3 ro, rd, clean_rd; setupCamera(ro, rd, clean_rd, 0.0);


  vec2 roomUV = clamp(vec2(0.5) + vec2(-rd.x, rd.y) * 1.5, 0.0, 1.0);
  vec2 texUV = 1.0 - roomUV;
  vec4 roomSample = texture2D(u_texEnv1, texUV);
  vec3 col = roomSample.rgb;
  col = mix(col, vec3(0.05, 0.05, 0.06), 0.3 + hash2(gl_FragCoord.xy/u_resolution.xy * 50.0 + u_time * 2.0) * 0.15) * mix(0.1, 1.0, sin(u_time * 0.5) * 0.5 + 0.5);


  const vec2 tvMin = vec2(0.3637, 0.5370);
  const vec2 tvMax = vec2(0.5416, 0.6638);
  bool inCluster = texUV.x >= tvMin.x && texUV.x <= tvMax.x &&
                   texUV.y >= tvMin.y && texUV.y <= tvMax.y;
  if (inCluster) {
    bool isGreen = roomSample.g > 0.4 && roomSample.r < 0.25 && roomSample.b < 0.25;
    if (isGreen) {
      vec2 bcUV = (texUV - tvMin) / (tvMax - tvMin);
      col = texture2D(u_texEnv2, clamp(bcUV, 0.0, 1.0)).rgb;
    }
  }


  vec4 overlay = texture2D(u_texEnv3, texUV);


  const vec2 faceMin = vec2(0.4451, 0.3006);
  const vec2 faceMax = vec2(0.5592, 0.4886);
  bool inFace = texUV.x >= faceMin.x && texUV.x <= faceMax.x &&
                texUV.y >= faceMin.y && texUV.y <= faceMax.y;
  if (inFace) {
    bool isGreen = overlay.g > 0.35 && overlay.r < 0.3 && overlay.b < 0.3;
    if (isGreen) {
      vec2 faceUV = (texUV - faceMin) / (faceMax - faceMin);
      vec2 reflUV = clamp(vec2(0.5) + vec2(-rd.x, rd.y) * 1.5 + rd.xy * 0.3, 0.0, 1.0);
      vec3 mirrorCol = texture2D(u_texEnv1, 1.0 - reflUV).rgb;
      vec3 bcCol = texture2D(u_texEnv2, clamp(faceUV + rd.xy * 0.3, 0.0, 1.0)).rgb;
      float bcBright = max(bcCol.r, max(bcCol.g, bcCol.b));
      overlay.rgb = mix(mirrorCol, bcCol, smoothstep(0.02, 0.1, bcBright));
      col = overlay.rgb;
    }
  }


  col = min(col, overlay.rgb);

  float dWin=(-1.5-ro.z)/clean_rd.z;
  if(dWin>0.0){
    vec3 pW=ro+clean_rd*dWin; vec2 wuv=vec2(pW.x*0.25+0.5,0.5-pW.y*0.25);
    vec2 edgeUV = clamp(wuv, 0.0, 1.0);
    vec4 txW = texture2D(u_texWindow, edgeUV);
    if(1.0-clamp(txW.a,0.0,1.0)>0.1) col=mix(col,vec3(0.6,0.7,0.8),hash2(edgeUV*80.0)*0.012);
    col=mix(col, txW.rgb * 0.5, txW.a);
  }
  
  col = digitalGlitch(col, gl_FragCoord.xy / u_resolution.xy);
  gl_FragColor=vec4(col*(1.0-u_blink)*0.60*smoothstep(0.0,0.8,u_wake), 1.0);
}
`;
