/* mode-blackhole.js
   Registers z3_alt_blackhole_walk, z3_bedroom, z3_bathroom
   Used by Zone3Engine when route === 'z3b' and for z3 side rooms.
*/

window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules['z3_bedroom'] = `
precision mediump float;

uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_time;
uniform float u_blink;
uniform float u_wake;

uniform sampler2D u_texEnv1;
uniform sampler2D u_voidTex;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv.y = 1.0 - uv.y;

    float screenAspect = u_resolution.x / u_resolution.y;
    float imgAspect = 1080.0 / 1920.0;
    float visibleAspect = mix(imgAspect, 1.0, smoothstep(0.7, 1.4, screenAspect));
    float panRangeX = mix(0.06, 0.10, smoothstep(0.7, 1.4, screenAspect));
    float panRangeY = mix(0.06, 0.28, smoothstep(0.7, 1.4, screenAspect));
    vec2 tuv;
    if (screenAspect > visibleAspect) {
        float scale = visibleAspect / screenAspect;
        tuv = vec2(uv.x, (uv.y - 0.5) * scale + 0.5);
    } else {
        float scale = screenAspect / visibleAspect;
        tuv = vec2((uv.x - 0.5) * scale + 0.5, uv.y);
    }
    tuv.x = tuv.x * (1.0 - 2.0 * panRangeX) + panRangeX - u_mouse.x * panRangeX;
    tuv.y = tuv.y * (1.0 - 2.0 * panRangeY) + panRangeY - u_mouse.y * panRangeY;
    tuv = clamp(tuv, 0.0, 1.0);

    vec4 room = texture2D(u_texEnv1, tuv);
    vec3 col = room.rgb;

    if (room.a < 0.1) {
        float fboAspect = u_resolution.x / u_resolution.y;
        float wxMin = 480.0 / 1243.0;
        float wxMax = 820.0 / 1243.0;
        float wyMin = 680.0 / 2048.0;
        float wyMax = 1350.0 / 2048.0;
        vec2 winUV = vec2(
            (tuv.x - wxMin) / (wxMax - wxMin),
            1.0 - ((tuv.y - wyMin) / (wyMax - wyMin))
        );
        float winAspect = (wxMax - wxMin) * 1243.0 / ((wyMax - wyMin) * 2048.0);
        vec2 centered = winUV - 0.5;
        if (fboAspect < winAspect) centered.y *= fboAspect / winAspect;
        else centered.x *= winAspect / fboAspect;
        winUV = centered + 0.5;
        col = texture2D(u_voidTex, clamp(winUV, 0.0, 1.0)).rgb;
    }

    bool isGreen = room.g > 0.4 && room.r < 0.25 && room.b < 0.25;
    if (isGreen) {
        col = texture2D(u_voidTex, tuv).rgb;
    }

    float fogMix = 0.10 + 0.03 * sin(u_time * 0.2);
    col = mix(col, vec3(0.04, 0.05, 0.08), fogMix);
    col *= (1.0 - u_blink) * smoothstep(0.0, 0.8, u_wake);

    gl_FragColor = vec4(col, 1.0);
}
`;
window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

if (!GLSL.modules['z3_alt_blackhole_walk']) {
    GLSL.modules['z3_alt_blackhole_walk'] = `
precision highp float;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_yaw;
uniform float u_pitch;
uniform vec3  u_camPos;
uniform float u_movePhase;
uniform float u_speed;
uniform float u_seed;
uniform float u_audio;
uniform float u_trip;
uniform float u_noGround;
uniform sampler2D u_texGround;

const int   MARCH_STEPS = 96;
const int   BEND_STEPS  = 26;
const float FAR_CLIP    = 14000.0;
const float EPS         = 0.045;

const vec3  BH_CENTER   = vec3(0.0, 0.0, -3200.0);
const float BH_RADIUS   = 520.0;

mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }
float hash1(float p){ return fract(sin(p*127.1)*43758.5453123); }
float hash2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }
float hash3(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,191.999)))*43758.5453123); }

float noise3(vec3 p){
  vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
  float n000=hash3(i); float n100=hash3(i+vec3(1,0,0));
  float n010=hash3(i+vec3(0,1,0)); float n110=hash3(i+vec3(1,1,0));
  float n001=hash3(i+vec3(0,0,1)); float n101=hash3(i+vec3(1,0,1));
  float n011=hash3(i+vec3(0,1,1)); float n111=hash3(i+vec3(1,1,1));
  return mix(mix(mix(n000,n100,f.x),mix(n010,n110,f.x),f.y),
             mix(mix(n001,n101,f.x),mix(n011,n111,f.x),f.y),f.z);
}

vec3 camForward(float yaw, float pitch){
  vec3 f=vec3(0,0,-1); f.xz*=rot(yaw); f.yz*=rot(pitch); return normalize(f);
}
vec3 camRight(vec3 fwd){ return normalize(cross(fwd,vec3(0,1,0))); }
vec3 camUp(vec3 fwd, vec3 right){ return normalize(cross(right,fwd)); }

float pathCenterX(float z){
  float k = clamp((-z-50.0)/2800.0, 0.0, 1.0);
  return sin(z*0.00165+0.7)*22.0*k + sin(z*0.006+1.8)*3.5;
}
float pathCenterY(float z){
  return -1.25 + smoothstep(-2400.0, -3100.0, z) * 30.0;
}
float pathHalfWidth(float z){
  float t = clamp((-z-20.0)/3300.0, 0.0, 1.0);
  return mix(1.3, 18.0, t*t);
}

vec3 groundColor(vec3 hp, vec3 ro){
  float flowZ = hp.z + u_movePhase * mix(28.0, 64.0, clamp(u_speed,0.0,1.5));
  vec2 guv = vec2(hp.x*0.12+0.5, fract(flowZ*0.035));
  vec3 tex = texture2D(u_texGround, guv).rgb;
  float dist = length(hp-ro);
  tex *= exp(-dist*0.004) * 0.50;
  float cx = pathCenterX(hp.z);
  float hw = pathHalfWidth(hp.z);
  float edge = abs(hp.x-cx)/max(hw,0.001);
  tex *= 1.0 - smoothstep(0.80, 1.02, edge);
  float seg = 1.0-smoothstep(0.0,0.18,abs(fract((flowZ+1000.0)*0.060)-0.5));
  tex += vec3(0.10,0.11,0.16)*seg*(1.0-smoothstep(0.0,0.10,abs(hp.x-cx)))*u_speed*0.5;
  tex += vec3(0.07,0.04,0.02)*smoothstep(-600.0,-2800.0,hp.z)*exp(-dist*0.004)*0.3;
  tex += vec3(0.06,0.07,0.12)*smoothstep(-2800.0,-3200.0,hp.z)*0.24;
  return tex;
}

vec3 cosmos(vec3 rd, vec3 ro){
  vec3 d=normalize(rd); vec3 col=vec3(0.0);
  vec3 p1=normalize(d*900.0+ro*0.012);
  vec3 p2=normalize(d*1600.0+ro*0.020+vec3(17.3,-9.1,5.7));
  col += vec3(0.80,0.86,0.96)*smoothstep(0.9982,1.0,hash3(floor(p1*320.0)+u_seed*0.01))*(0.65+u_audio*0.30);
  col += vec3(0.72,0.76,0.92)*smoothstep(0.9993,1.0,hash3(floor(p2*520.0)+u_seed*0.007))*0.35;
  vec3 neb=d*7.0+ro*vec3(0.0007,0.0003,0.0009);
  float band=smoothstep(0.42,0.0,abs(d.y+sin(d.x*2.4+ro.z*0.0002)*0.16));
  col += vec3(0.10,0.13,0.22)*noise3(neb+vec3(0,u_time*0.005,0))*band*0.90;
  col += vec3(0.08,0.10,0.18)*noise3(neb*1.9+vec3(4.2,-2.3,7.7))*band*0.70;
  col += vec3(0.04,0.06,0.12)*noise3(neb*0.8+vec3(-3.4,2.0,-6.1))*band*0.55;
  col += vec3(0.05,0.07,0.12)*smoothstep(0.85,-0.10,d.y)*0.50;
  return col;
}

vec3 neonPalette(float t){
  return vec3(0.5)+vec3(0.5)*cos(6.28318*(vec3(1.0)*t+vec3(0.00,0.33,0.67)));
}

float sdVoidFractal(vec3 p, float power, float rotA, float rotB){
  vec3 z=p; z.xz*=rot(u_time*rotA); z.yz*=rot(u_time*rotB);
  float scale=1.0;
  vec3 foldOffset=vec3(0.6)+(vec3(0.15)*sin(u_time*0.15+power))+u_audio*0.2;
  for(int i=0;i<8;i++){
    z=abs(z); if(z.x<z.y) z.xy=z.yx; if(z.x<z.z) z.xz=z.zx; if(z.y<z.z) z.yz=z.zy;
    z=z*2.0-foldOffset; scale*=2.0;
  }
  return (length(z)-0.2)/scale;
}

vec3 colorPickoverVoid(vec3 p){
  vec2 c=vec2(p.x*0.4+sin(u_time*0.07)*0.3, p.y*0.4+cos(u_time*0.05)*0.3);
  vec2 z=vec2(0.0); float minDist=1e10; float escapeI=0.0;
  for(int i=0;i<80;i++){
    z=clamp(vec2(z.x*z.x-z.y*z.y,2.0*z.x*z.y)+c,-1000.0,1000.0);
    float d=min(abs(z.x),abs(z.y)); if(d<minDist) minDist=d;
    if(dot(z,z)>100.0){escapeI=float(i); break;}
  }
  return neonPalette(fract(clamp(minDist*8.0,0.0,1.0)*2.0+u_time*0.15+escapeI*0.01))
       *(0.4+0.6*(1.0-clamp(minDist*8.0,0.0,1.0)));
}

vec3 marchVoidFractal(vec3 ro, vec3 rd, vec3 fracPos, float fracScale, float power, float rotA, float rotB){
  vec3 lro=(ro-fracPos)/fracScale;
  vec3 lrd=rd;
  float boundR=1.8;
  vec3 oc=lro;
  float b=dot(oc,lrd); float c_=dot(oc,oc)-boundR*boundR;
  float disc=b*b-c_;
  if(disc<0.0) return vec3(0.0);
  float t=max(0.0,-b-sqrt(disc));
  for(int i=0;i<50;i++){
    vec3 p=lro+lrd*t;
    if(length(p)>boundR+0.5) break;
    float d=sdVoidFractal(p,power,rotA,rotB);
    if(d<0.003){
      vec3 e=vec3(0.003,0.0,0.0);
      vec3 n=normalize(vec3(
        sdVoidFractal(p+e.xyy,power,rotA,rotB)-sdVoidFractal(p-e.xyy,power,rotA,rotB),
        sdVoidFractal(p+e.yxy,power,rotA,rotB)-sdVoidFractal(p-e.yxy,power,rotA,rotB),
        sdVoidFractal(p+e.yyx,power,rotA,rotB)-sdVoidFractal(p-e.yyx,power,rotA,rotB)
      ));
      vec3 matCol=colorPickoverVoid(p);
      float diff=max(dot(n,normalize(vec3(0.2,1.0,0.5))),0.0)*0.7+0.15;
      float fres=pow(1.0-max(dot(-lrd,n),0.0),3.0);
      vec3 col=matCol*diff+neonPalette(fract(u_time*0.08+p.y*0.5))*fres*0.3;
      col*=exp(-t*fracScale*0.003);
      return col;
    }
    t+=d*0.7;
    if(t>boundR*3.0) break;
  }
  return vec3(0.0);
}

vec3 accretionGlow(vec3 p, float closestR){
  vec3 rel=p-BH_CENTER; float r=length(rel); float plane=abs(rel.y); float ringR=length(rel.xz);
  float disk=exp(-plane*0.085)*smoothstep(BH_RADIUS*2.6,BH_RADIUS*1.08,ringR)*smoothstep(BH_RADIUS*1.02,BH_RADIUS*1.30,ringR);
  float swirl=0.55+0.45*sin(atan(rel.z,rel.x)*7.0-u_time*0.8+ringR*0.008);
  float turb=noise3(rel*vec3(0.006,0.03,0.006)+vec3(0,u_time*0.03,0));
  vec3 glow=mix(vec3(1.02,0.42,0.12),vec3(1.05,0.63,0.26),smoothstep(BH_RADIUS*1.15,BH_RADIUS*2.2,ringR))*disk*(0.72+0.48*swirl+0.30*turb);
  glow+=vec3(0.34,0.40,0.76)*exp(-abs(r-BH_RADIUS*1.55)*0.022)*smoothstep(0.7,0.0,plane*0.05)*(0.22+u_audio*0.12);
  glow+=vec3(0.10,0.12,0.24)*disk*smoothstep(BH_RADIUS*4.2,BH_RADIUS*1.0,closestR)*0.08;
  return glow*(0.013+u_audio*0.006+u_trip*0.003);
}

void main(){
  vec2 uv=(gl_FragCoord.xy-0.5*u_resolution.xy)/u_resolution.y;

  float liqAmp = 0.10 * u_trip;
  if(liqAmp > 0.001){
    float tw=u_time*0.15;
    vec2 q=vec2(noise3(vec3(uv*2.0, tw)), noise3(vec3(uv*2.0+vec2(tw,0.0), tw)));
    float n3=noise3(vec3(uv*2.0+2.0*q+vec2(1.7,9.2), tw*0.6));
    float n4=noise3(vec3(uv*2.0+2.0*q+vec2(8.3,2.8), tw*0.5));
    uv += (vec2(n3,n4)-0.5) * liqAmp;
  }

  float mt=u_time;
  float w1=sin(mt*0.4+u_seed); float w2=sin(mt*0.9+u_seed*2.0); float w3=sin(mt*1.5+u_seed*3.0);
  float surge=smoothstep(0.8,1.0,(w1+w2+w3)/3.0);
  float snap=pow(surge,2.0)*12.0;
  uv*=1.0+mt*0.003+snap*0.015;

  float gTick=floor(u_time*16.0);
  if(step(0.979,hash1(gTick*133.77+u_seed))>0.0)
    uv.x+=(hash1(floor(uv.y*mix(10.0,30.0,hash1(gTick*2.1)))+gTick)-0.5)*0.18*clamp(u_trip,0.0,1.5);

  vec3 ro=u_camPos;
  vec3 fwd=camForward(u_yaw,u_pitch); vec3 right=camRight(fwd); vec3 up=camUp(fwd,right);
  vec3 rd=normalize(fwd+right*uv.x+up*uv.y);
  vec3 col=vec3(0.0);

  float fracAngle=hash1(u_seed*7.7)*6.28;
  vec3 fracPos=vec3(sin(fracAngle)*45.0, pathCenterY(u_camPos.z-300.0)+10.0, u_camPos.z-300.0);
  float fracPow=mix(6.0,10.0,hash1(u_seed*5.3))+sin(u_time*0.05)*1.5;
  float fracRotA=mix(0.05,0.15,hash1(u_seed*9.7))*(hash1(u_seed*4.1)>0.5?1.0:-1.0);
  float fracRotB=mix(0.04,0.12,hash1(u_seed*6.3))*(hash1(u_seed*8.9)>0.5?1.0:-1.0);
  vec3 fracResult=marchVoidFractal(ro, rd, fracPos, 10.0, fracPow, fracRotA, fracRotB);
  bool hitFractal=length(fracResult)>0.001;

  bool hitGround=false;
  if(u_noGround < 0.5 && !hitFractal && rd.y<0.05){
    for(int gi=0;gi<40;gi++){
      float gt=float(gi)*8.0+1.0;
      vec3 gp=ro+rd*gt;
      if(gp.y<pathCenterY(gp.z)+0.09){
        float gtP=gt-8.0;
        for(int ri=0;ri<6;ri++){float mid=(gtP+gt)*0.5; vec3 mp=ro+rd*mid; if(mp.y<pathCenterY(mp.z)+0.09) gt=mid; else gtP=mid;}
        vec3 hp=ro+rd*gt;
        float cx=pathCenterX(hp.z); float hw=pathHalfWidth(hp.z);
        if(abs(hp.x-cx)<hw && hp.z<ro.z+10.0 && gt>0.5){col=groundColor(hp,ro); hitGround=true;}
        break;
      }
    }
  }

  if(!hitGround && !hitFractal){
    vec3 p=ro; float traveled=0.0; float closestR=1e9; bool hitBH=false;
    for(int i=0;i<MARCH_STEPS;i++){
      vec3 toBH=BH_CENTER-p; float r=length(toBH); closestR=min(closestR,r);
      if(r<BH_RADIUS){col=vec3(0); hitBH=true; break;}
      float grav=clamp((BH_RADIUS*(16.0+u_trip*2.0))/(r*r),0.0,0.040);
      rd=normalize(mix(rd,normalize(toBH),grav));
      if(r<BH_RADIUS*4.8 && mod(float(i),2.0)<0.5) col+=accretionGlow(p,closestR);
      float stepLen=clamp(r*0.03,0.75,78.0); stepLen*=1.0+smoothstep(BH_RADIUS*5.5,FAR_CLIP,r)*1.55;
      p+=rd*stepLen; traveled+=stepLen;
      if(traveled>FAR_CLIP) break;
    }
    if(!hitBH){
      vec3 bent=rd; vec3 rp=ro; float bendClosest=1e9;
      for(int i=0;i<BEND_STEPS;i++){
        vec3 toBH=BH_CENTER-rp; float r=length(toBH); bendClosest=min(bendClosest,r);
        if(r<BH_RADIUS*1.03) break;
        bent=normalize(mix(bent,normalize(toBH),clamp((BH_RADIUS*14.0)/(r*r),0.0,0.032)));
        rp+=bent*clamp(r*0.15,34.0,180.0);
        if(length(rp-ro)>FAR_CLIP) break;
      }
      vec3 bg=cosmos(bent,ro);
      bg+=vec3(0.16,0.20,0.34)*exp(-abs(bendClosest-BH_RADIUS*1.68)*0.018)*0.34;
      bg*=1.0-smoothstep(BH_RADIUS*1.30,BH_RADIUS*0.96,bendClosest);
      col+=bg;
    }
  }

  if(hitFractal) col=fracResult;

  col=mix(col,vec3(0.008,0.010,0.016), hitGround ? 0.12 : 0.20);

  float lum=dot(col,vec3(0.299,0.587,0.114));
  col=mix(col,vec3(lum*0.88,lum*0.90,lum*1.04),0.15);

  col*=0.78+0.22*(1.0-smoothstep(0.75,1.5,length(uv)));

  col=1.0-exp(-col*1.08);

  gl_FragColor=vec4(col,1.0);
}
`;

window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules['z3_bathroom'] = `
precision mediump float;

uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_time;
uniform float u_blink;
uniform float u_wake;

uniform sampler2D u_texEnv1;      
uniform sampler2D u_voidTex;      

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv.y = 1.0 - uv.y;

    float panRangeX = 300.0 / 1437.0;
    float panRangeY = 300.0 / 2048.0;
    float screenAspect = u_resolution.x / u_resolution.y;
    float visibleAspect = 643.0 / 2000.0;
    vec2 tuv;

    if (screenAspect > visibleAspect) {
        float scale = visibleAspect / screenAspect;
        tuv = vec2(uv.x, (uv.y - 0.5) * scale + 0.5);
    } else {
        float scale = screenAspect / visibleAspect;
        tuv = vec2((uv.x - 0.5) * scale + 0.5, uv.y);
    }

    tuv.x = tuv.x * (1.0 - 2.0 * panRangeX) + panRangeX - u_mouse.x * panRangeX;
    tuv.y = tuv.y * (1.0 - 2.0 * panRangeY) + panRangeY - u_mouse.y * panRangeY;
    tuv = clamp(tuv, 0.0, 1.0);

    vec4 room = texture2D(u_texEnv1, tuv);

    
    vec3 col = room.rgb;

    if (room.a < 0.15) {
        
        float fboAspect = u_resolution.x / u_resolution.y;

        
        float hxMin = 0.25;
        float hxMax = 0.75;
        float hyMin = 0.20;
        float hyMax = 0.80;

        vec2 holeUV = vec2(
            (tuv.x - hxMin) / (hxMax - hxMin),
            1.0 - ((tuv.y - hyMin) / (hyMax - hyMin))
        );

        float holeAspect = (hxMax - hxMin) * 1437.0 / ((hyMax - hyMin) * 2048.0);
        vec2 centered = holeUV - 0.5;
        if (fboAspect < holeAspect) {
            centered.y *= fboAspect / holeAspect;
        } else {
            centered.x *= holeAspect / fboAspect;
        }
        holeUV = centered + 0.5;

        vec3 voidCol = texture2D(u_voidTex, clamp(holeUV, 0.0, 1.0)).rgb;

        
        float edgeBlend = smoothstep(0.0, 0.15, room.a);
        col = mix(voidCol, room.rgb, edgeBlend);

        
        float dustNoise = fract(sin(dot(tuv * 200.0, vec2(12.9898, 78.233)) + u_time * 0.3) * 43758.5453);
        float dustMask = smoothstep(0.0, 0.2, room.a) * (1.0 - smoothstep(0.2, 0.35, room.a));
        col += vec3(0.15, 0.10, 0.06) * dustNoise * dustMask * 0.3;
    }

    
    vec2 vuv = gl_FragCoord.xy / u_resolution;
    float dmgVig = 1.0 - 0.3 * pow(length((vuv - 0.5) * vec2(1.4, 1.0)), 1.6);
    col *= dmgVig;


    float fogMix = 0.12 + 0.04 * sin(u_time * 0.2);
    col = mix(col, vec3(0.06, 0.07, 0.09), fogMix);

    col *= (1.0 - u_blink) * smoothstep(0.0, 0.8, u_wake);

    gl_FragColor = vec4(col, 1.0);
}
`;
}