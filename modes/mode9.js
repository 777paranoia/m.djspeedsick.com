
window.GLSL = window.GLSL || {};
window.GLSL.modules = window.GLSL.modules || {};

GLSL.modules['plane'] = `

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 ab=b-a, ap=p-a;
  return length(ap-ab*clamp(dot(ap,ab)/dot(ab,ab),0.0,1.0))-r;
}
float sdEllipsoid(vec3 p, vec3 r) {
  float k0=length(p/r), k1=length(p/(r*r)); return k0*(k0-1.0)/k1;
}
float smin(float a, float b, float k) {
  float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0); return mix(b,a,h)-k*h*(1.0-h);
}

vec2 sdJet(vec3 p) {
  vec2 res=vec2(1e10,-1.0);
  float fuse=sdCapsule(p,vec3(0,0,-5.6),vec3(0,0,3.0),0.40);
  float nose=sdEllipsoid(p-vec3(0,0.02,3.0),vec3(0.24,0.28,1.6));
  float tailc=sdEllipsoid(p-vec3(0,0.06,-5.6),vec3(0.28,0.25,1.2));
  float body=min(fuse,min(nose,tailc));
  if(body<res.x) res=vec2(body,1.0);
  float dih=0.11;
  vec3 pw=vec3(abs(p.x),p.y-abs(p.x)*dih,p.z);
  vec3 wA=pw-vec3(0.50,-0.03,0.25); wA.xz*=rot(-0.06);
  vec3 wB=pw-vec3(1.90,-0.05,-0.25); wB.xz*=rot(-0.16);
  vec3 wC=pw-vec3(4.00,-0.07,-1.05); wC.xz*=rot(-0.25);
  float wing=min(sdBox(wA,vec3(0.40,0.052,0.78)),min(sdBox(wB,vec3(1.18,0.038,0.60)),sdBox(wC,vec3(0.98,0.024,0.40))));
  wing=smin(wing,body,0.16);
  if(wing<res.x) res=vec2(wing,2.0);
  vec3 wl=vec3(abs(p.x)-5.0,p.y-5.0*dih+0.16,p.z+1.3); wl.xy*=rot(0.20);
  float winglet=sdBox(wl,vec3(0.028,0.26,0.20));
  if(winglet<res.x) res=vec2(winglet,2.0);
  float eY=-0.36-1.90*dih;
  vec3 pe=vec3(abs(p.x)-1.90,p.y-eY,p.z);
  float eng=min(sdCapsule(pe,vec3(0,0,0.80),vec3(0,0,0.28),0.26),min(sdCapsule(pe,vec3(0,0,0.28),vec3(0,0,-0.52),0.20),sdEllipsoid(pe-vec3(0,0,0.85),vec3(0.29,0.29,0.09))));
  if(eng<res.x) res=vec2(eng,3.0);
  float pY=-0.19-1.90*dih;
  float pylon=sdBox(vec3(abs(p.x)-1.90,p.y-pY,p.z+0.12),vec3(0.052,0.16,0.50));
  if(pylon<res.x) res=vec2(pylon,2.0);
  vec3 vt=p-vec3(0,0.54,-4.5); vt.yz*=rot(-0.09);
  float vFin=sdBox(vt,vec3(0.034,0.70,0.80));
  if(vFin<res.x) res=vec2(vFin,4.0);
  vec3 hs=vec3(abs(p.x),p.y,p.z)-vec3(0.88,0.13,-5.0); hs.xz*=rot(-0.13);
  float hFin=sdBox(hs,vec3(0.76,0.028,0.34));
  if(hFin<res.x) res=vec2(hFin,4.0);
  return res;
}

vec3 jetNormal(vec3 p) {
  const float e=0.004;
  return normalize(vec3(
    sdJet(p+vec3(e,0,0)).x-sdJet(p-vec3(e,0,0)).x,
    sdJet(p+vec3(0,e,0)).x-sdJet(p-vec3(0,e,0)).x,
    sdJet(p+vec3(0,0,e)).x-sdJet(p-vec3(0,0,e)).x));
}

void main() {
  vec3 ro, rd, clean_rd; setupCamera(ro, rd, clean_rd, 0.0);


  float t=0.0; vec2 hit=vec2(0.0);
  for(int i=0;i<90;i++){ 
    hit=mapScene(ro+rd*t, false); 
    if(hit.x<0.001||t>70.0) break; 
    t+=hit.x; 
  }

  float cityDepth = (t < 70.0) ? t : 9999.0;


  vec3 cGreen = vec3(0.15, 0.9, 0.4); vec3 cRed = vec3(0.9, 0.05, 0.15); vec3 cAmber = vec3(1.0, 0.5, 0.0); 
  float traffic = smoothstep(0.7, 1.0, sin(rd.x * 6.0 + u_time * 1.5)) * 0.4;
  vec3 skyTone = mix(vec3(0.005, 0.01, 0.015), vec3(0.05, 0.08, 0.06), exp(-max(rd.y,0.0)*4.0)) + mix(mix(cGreen, cRed, sin(rd.x * 4.0 + u_time * 0.5) * 0.5 + 0.5), cAmber, traffic) * (noise1(u_time * 0.2 - rd.x * 3.0) * 0.5 + 0.5 + traffic) * smoothstep(0.0, -0.8, rd.y) * 0.6 * 0.8;
  vec3 col = vec3(0.0);
  
  if(t<70.0){
    vec3 p=ro+rd*t;
    vec3 n=normalize(vec3(mapScene(p+vec3(0.01,0,0),false).x-mapScene(p-vec3(0.01,0,0),false).x, mapScene(p+vec3(0,0.01,0),false).x-mapScene(p-vec3(0,0.01,0),false).x, mapScene(p+vec3(0,0,0.01),false).x-mapScene(p-vec3(0,0,0.01),false).x));
    vec3 bTex = sampleBuilding(hit.y, (abs(n.x)>abs(n.y))?p.zy:p.xy); bTex += bTex * smoothstep(0.5, 0.9, max(bTex.r, max(bTex.g, bTex.b))) * 2.5;
    col=mix(bTex*0.25, skyTone, 1.0-exp(-0.015*t*t)) + mix(cGreen, cRed, sin(p.x * 0.4) * 0.5 + 0.5) * (noise1(u_time * 0.3 + p.x * 0.1) * 0.4 + 0.6 + smoothstep(0.8, 1.0, sin(p.z * 0.8 + u_time * 2.0)) * 0.2) * smoothstep(2.0, -20.0, p.y) * 0.4 * exp(-0.005 * t * t);
    vec2 texUV = (abs(n.x)>abs(n.y))?p.zy:p.xy;
    vec2 wg = floor(texUV * vec2(5.0, 10.0));
    float won    = step(0.82, hash2(wg + hit.y * 17.0));
    float wflick = step(0.96, hash1(hash2(wg) + floor(u_time * 1.5)));
    float wpx    = smoothstep(0.005, 0.0, abs(fract(texUV.x*5.0)-0.5)-0.15)
                 * smoothstep(0.005, 0.0, abs(fract(texUV.y*10.0)-0.5)-0.10);
    col += vec3(1.0, 0.75, 0.35) * won * (1.0-wflick) * wpx * 1.2;
  } else col=texture2D(u_texEnv1,fract(rd.xy*0.5+0.5+vec2(u_time*0.002,0.0))).rgb*0.3+skyTone*0.5;

  col += snow(vec2(atan(rd.z,rd.x)*2.0, rd.y*2.0), 15.0, 0.3, 0.3);


  float rawA = clamp(u_modeTime / 4.5, 0.0, 1.0);
  float approach = pow(rawA, 1.5);
  float close = smoothstep(0.8, 1.0, approach);
  

  float planeZ = mix(90.0, 3.5, approach);
  vec3 planePos = vec3(0.0, -1.1, planeZ);

  vec3 oc2=ro-planePos;
  float bB2=dot(rd,oc2), bC2=dot(oc2,oc2)-81.0, disc2=bB2*bB2-bC2;
  bool planeHit=false; float pd=0.01; vec2 pi=vec2(0.0);
  
  if(disc2>=0.0){
    pd=max(-bB2-sqrt(disc2),0.01);
    if (pd < cityDepth) {
      for(int i=0;i<140;i++){
        vec3 lp=(ro+rd*pd-planePos)/1.4;
        vec2 pr=sdJet(lp); pr.x*=1.4;
        if(pr.x<0.003){planeHit=true;pi=pr;break;}
        if(pd > cityDepth || pd > 280.0) break;
        pd+=pr.x*0.78;
      }
    }
  }

  if(planeHit){
    vec3 hp=(ro+rd*pd-planePos)/1.4;
    vec3 n2=jetNormal(hp);
    float partId=pi.y;
    float dih=0.11;

    vec3 cityDir=normalize(vec3(0.1,1.0,0.3));
    vec3 rimDir=normalize(vec3(0.7,0.3,0.5));
    float kCity=max(dot(n2,-cityDir),0.0)*0.7;
    float kTop=max(dot(n2,vec3(0,1,0)),0.0)*0.12;
    float kRim=pow(max(dot(n2,rimDir),0.0),2.5)*0.4;
    float spec=pow(max(dot(reflect(-cityDir,n2),-rd),0.0),60.0)*0.6;

    vec3 baseCol=vec3(0.80,0.82,0.87);
    float belly=smoothstep(0.1,-0.5,hp.y);
    baseCol=mix(baseCol,vec3(0.68,0.55,0.38),belly*0.4);
    float top2=smoothstep(-0.1,0.6,n2.y);
    baseCol=mix(baseCol,vec3(0.65,0.70,0.85),top2*0.10);
    if(partId>2.5&&partId<3.5) baseCol=vec3(0.60,0.62,0.68);
    if(partId>3.5) baseCol=vec3(0.70,0.72,0.78);

    if(partId<1.5){
      float wY=smoothstep(0.055,0.018,abs(hp.y-0.06));
      float wX=step(0.50,fract(hp.z*2.6+0.12));
      float onS=smoothstep(0.09,0.0,abs(abs(hp.x)-0.38));
      float notNose=smoothstep(2.8,2.0,hp.z);
      float isWin=wY*wX*onS*notNose;
      baseCol=mix(baseCol,vec3(0.06,0.06,0.10),isWin*0.7);
      baseCol=mix(baseCol,vec3(0.9,0.78,0.45),isWin*0.3);
      float ckY=smoothstep(0.045,0.0,abs(hp.y-0.20));
      float ckX=step(0.44,fract(hp.z*0.43+0.24))*step(abs(hp.x),0.28);
      float isNose2=smoothstep(2.4,3.4,hp.z);
      baseCol=mix(baseCol,vec3(0.05,0.08,0.06),ckY*ckX*isNose2*0.9);
      float stripe=smoothstep(0.014,0.004,abs(hp.y-0.01))*step(abs(hp.x),0.40)*notNose;
      baseCol=mix(baseCol,vec3(0.10,0.18,0.42),stripe*0.5);
    }
    if(partId>2.5&&partId<3.5){
      float eY2=-0.36-1.90*dih;
      vec3 ep=vec3(abs(hp.x)-1.90,hp.y-eY2,hp.z);
      float rD=length(ep.xy);
      baseCol=mix(baseCol,vec3(0.03,0.03,0.05),smoothstep(0.27,0.15,rD));
      float blades=abs(sin(atan(ep.y,ep.x)*9.0+u_time*8.0))*0.5+0.5;
      baseCol=mix(baseCol,vec3(0.14,0.14,0.17)*blades,smoothstep(0.14,0.04,rD)*step(0.04,rD)*0.7);
      baseCol=mix(baseCol,vec3(0.7,0.35,0.08),smoothstep(0.06,0.0,rD)*0.5);
    }

    vec3 cityCol=mix(cGreen,cRed,sin(hp.x*0.4+u_time*0.3)*0.5+0.5)*0.6+vec3(0.2,0.1,0.0);
    vec3 lit=baseCol*(kCity*cityCol+kTop*vec3(0.2,0.3,0.5)+0.05)+vec3(0.8,0.85,1.0)*(kRim+spec);

    float fog=exp(-pd*0.003);
    col=mix(col,lit,fog);

    float projS=1.0/max((planeZ-ro.z)*1.4,0.5);
    vec2 fUV=(gl_FragCoord.xy-0.5*u_resolution.xy)/u_resolution.y;
    float nGlare=exp(-dot(fUV,fUV)*mix(8000.0,20.0,approach*approach));
    col+=vec3(0.9,0.88,0.80)*nGlare*smoothstep(0.1,0.8,approach)*mix(0.2,2.0,close);
    
    float eY3=-0.6 + (-0.36-1.90*dih);
    vec2 eL=fUV-vec2(-1.90*projS,eY3*projS);
    vec2 eR=fUV-vec2( 1.90*projS,eY3*projS);
    float eGlow=exp(-dot(eL,eL)*mix(5000.0,50.0,approach*approach))+exp(-dot(eR,eR)*mix(5000.0,50.0,approach*approach));
    col+=vec3(0.3,0.5,1.0)*eGlow*smoothstep(0.05,0.7,approach)*0.7;
    
    float strobe=step(0.92,fract(u_time*1.4))*smoothstep(0.1,0.5,approach);
    vec2 sPos=fUV-vec2(0.0,(-0.6 + 0.42)*projS); 
    col+=vec3(1.0,0.2,0.1)*exp(-dot(sPos,sPos)*mix(20000.0,500.0,approach*approach))*strobe*0.7;
  }


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
