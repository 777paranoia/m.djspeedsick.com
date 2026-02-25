window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules.fly = `
void main() {
  vec2 flyUV = gl_FragCoord.xy / u_resolution.xy;
  
  // FLIP Y-AXIS FOR VIDEO
  flyUV.y = 1.0 - flyUV.y; 
  
  float sx=(hash2(vec2(floor(u_time*40.0),1.7))-0.5)*0.020*u_shake;
  float sy=(hash2(vec2(floor(u_time*40.0),8.3))-0.5)*0.016*u_shake;
  if (u_shake > 0.7 && hash1(u_time * 20.0) > 0.5) { sx += (hash1(u_time * 12.0) - 0.5) * 0.08; sy += (hash1(u_time * 22.0) - 0.5) * 0.08; }
  
  gl_FragColor = vec4(texture2D(u_texEnv1, clamp(flyUV + vec2(sx, sy), 0.0, 1.0)).rgb * (1.0 - u_blink), 1.0);
}
`;