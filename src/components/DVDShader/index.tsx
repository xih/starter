"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";

/* ─────────────────────────── Vertex shader ─────────────────────────── */
const vertexShader = /* glsl */ `
precision highp float;
void main() {
  gl_Position = vec4(position, 1.0);
}`;

/* ───────────────────────── Fragment shader ─────────────────────────── */
/*  (identical to your previous fragmentShader)                          */
// ───────────────────────────────────────────────── Fragment shader (verbatim)
//  * All #ifdef / #endif lines are kept on their own lines (required by GLSL)
//  * Replaced mistaken `sinf` → `sin` (WebGL built‑in is `sin`)
//  * No minification – easier to read & avoids pre‑processor issues
// --------------------------------------------------------------------------
// ───────────────────────────────────────────────── Fragment shader (verbatim)
//  * All #ifdef / #endif lines are kept on their own lines (required by GLSL)
//  * Replaced mistaken `sinf` → `sin` (WebGL built‑in is `sin`)
//  * No minification – easier to read & avoids pre‑processor issues
// --------------------------------------------------------------------------
const fragmentShader = /* glsl */ `
precision highp float;

uniform vec3      iResolution;
uniform float     iTime;
uniform sampler2D iChannel0;
uniform vec3      iChannelResolution[1];

#define PI 3.14159265359
//#define DEBUG

float vmin(vec2 v){return min(v.x,v.y);} float vmax(vec2 v){return max(v.x,v.y);} 
float ellip(vec2 p,vec2 s){float m=vmin(s);return (length(p/s)*m)-m;} 
float halfEllip(vec2 p,vec2 s){p.x=max(0.,p.x);float m=vmin(s);return (length(p/s)*m)-m;}
float fBox(vec2 p,vec2 b){return vmax(abs(p)-b);} 

float dvd_d(vec2 p){float d=halfEllip(p,vec2(.8,.5));d=max(d,-p.x-.5);float d2=halfEllip(p,vec2(.45,.3));d2=max(d2,min(-p.y+.2,-p.x-.15));d=max(d,-d2);return d;}
float dvd_v(vec2 p){vec2 pp=p;p.y+=.7;p.x=abs(p.x);vec2 a=normalize(vec2(1.,-.55));float d=dot(p,a);float d2=d+.3;p=pp;d=min(d,-p.y+.3);d2=min(d2,-p.y+.5);d=max(d,-d2);d=max(d,abs(p.x+.3)-1.1);return d;}
float dvd_c(vec2 p){p.y+=.95;float d=ellip(p,vec2(1.8,.25));float d2=ellip(p,vec2(.45,.09));d=max(d,-d2);return d;}
float dvd(vec2 p){p.y-=.345;p.x-=.035;p*=mat2(1.,-0.2,0.,1.);float d=dvd_v(p);d=min(d,dvd_c(p));p.x+=1.3;d=min(d,dvd_d(p));p.x-=2.4;d=min(d,dvd_d(p));return d;}

float range(float a,float b,float v){return (v-a)/(b-a);} float rangec(float a,float b,float t){return clamp(range(a,b,t),0.,1.);} 
vec3 pal(float t,vec3 a,vec3 b,vec3 c,vec3 d){return a+b*cos(6.28318*(c*t+d));}
vec3 spectrum(float n){return pal(n,vec3(0.5),vec3(0.5),vec3(1.0),vec3(0.0,0.33,0.67));}

void drawHit(inout vec4 col,vec2 p,vec2 h,float hd){
  float d=length(p-h);
#ifdef DEBUG
  col=mix(col,vec4(0.,1.,1.,0.),step(d,.1));
  return;
#endif
  float w=d-hd*1.5; float f=2.; vec3 spec=(1.-spectrum(-w*f+hd*f)); float ripple=sin((w*f)*PI*2.-PI/2.);
  float blend=smoothstep(3.,0.,hd); blend*=smoothstep(.2,-.5,w); blend*=rangec(-4.,0.,w);
  col.rgb*=mix(vec3(1.),spec,pow(blend,4.)); float hgt=(ripple*blend); col.a-=hgt*1.9/f;
}

vec2 ref(vec2 p,vec2 n,float o){float t=dot(p,n)+o;return p-2.*t*n;}
void drawReflectedHit(inout vec4 col,vec2 p,vec2 h,float hd,vec2 s){
  col.a+=length(p)*.0001;
  drawHit(col,p,ref(h,vec2(0.,1.),1.),hd);
  drawHit(col,p,ref(h,vec2(0.,-1.),1.),hd);
  drawHit(col,p,ref(h,vec2(1.,0.),s.x/s.y),hd);
  drawHit(col,p,ref(h,vec2(-1.,0.),s.x/s.y),hd);
}

void flip(inout vec2 pos){vec2 f=mod(floor(pos),2.);pos=abs(f-mod(pos,1.));}
float stepSign(float a){return step(0.,a)*2.-1.;}
vec2 compassDir(vec2 p){vec2 a=vec2(stepSign(p.x),0.);vec2 b=vec2(0.,stepSign(p.y));float s=stepSign(p.x-p.y)*stepSign(-p.x-p.y);return mix(a,b,s*.5+.5);} 
vec2 calcHitPos(vec2 m,vec2 d,vec2 sz){vec2 h=mod(m,1.);vec2 x=h-h.x/(sz/sz.x)*(d/d.x);vec2 y=h-h.y/(sz/sz.y)*(d/d.y);h=max(x,y);h+=floor(m);return h;}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
  vec2 p=(-iResolution.xy+2.*fragCoord)/iResolution.y;
  vec2 screen=vec2(iResolution.x/iResolution.y,1.)*2.;
  float t=iTime;
  vec2 dir=normalize(vec2(9.,16.)*screen);
  vec2 move=dir*t/1.5;
  float logoScale=.1;
  vec2 logoSize=vec2(2.,.85)*logoScale;
  vec2 sz=screen-logoSize*2.;
  move=move/sz+.5;
  vec2 last=calcHitPos(move,dir,sz);
  vec4 col=vec4(1.),colFx=vec4(1.),colFy=vec4(1.);
  vec2 e=vec2(.8,0.)/iResolution.y;
  const int limit=5;
  for(int i=0;i<limit;i++){
    vec2 hit=last;
    if(i>0) hit=calcHitPos(hit-.00001/sz,dir,sz);
    last=hit;
    float hd=distance(hit,move);
    flip(hit);
    hit=(hit-.5)*sz;
    hit+=logoSize*compassDir(hit/sz);
    drawReflectedHit(col ,p      ,hit,hd,screen);
    drawReflectedHit(colFx,p+e   ,hit,hd,screen);
    drawReflectedHit(colFy,p+e.yx,hit,hd,screen);
  }
  flip(move);
  move=(move-.5)*sz;
  float fx=(col.a-colFx.a)*2.; float fy=(col.a-colFy.a)*2.; vec3 nor=normalize(vec3(fx,fy,0.1));
  col.rgb=clamp(1.-col.rgb,vec3(0.),vec3(1.))/3.;
  vec3 light=normalize(vec3(1.,2.,2.)); vec3 rd=normalize(vec3(p,-10.)); vec3 hal=normalize(light-rd);
  float dif=clamp(dot(light,nor),0.,1.);
  float spe=pow(clamp(dot(nor,hal),0.,1.),16.)*dif*(0.04+0.96*pow(clamp(1.+dot(hal,rd),0.,1.),5.));
  vec3 lin=vec3(.2)+5.*dif; col.rgb*=lin; col.rgb+=5.*spe;
  float d=dvd((p-move)/logoScale); d/=fwidth(d); d=1.-clamp(d,0.,1.); col.rgb=mix(col.rgb,vec3(1.),d);
  col+= (texture2D(iChannel0,fragCoord/iChannelResolution[0].xy)*2.-1.)*.005;
  col.rgb=pow(col.rgb,vec3(1./1.5)); col.a=col.a*.5+.5; col.a*=.3; fragColor=col;
}

void main(){
  vec4 col; mainImage(col,gl_FragCoord.xy); gl_FragColor=col;
}`;

/* ───────────────────────── Scene component ─────────────────────────── */
function DVDShaderScene() {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);
  const { size } = useThree();

  /* ---------- stable uniforms object – created once ---------- */
  const uniforms = useMemo(
    () => ({
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector3() },
      iChannel0: { value: makeNoiseTexture() },
      iChannelResolution: { value: [new THREE.Vector3()] },
    }),
    [],
  );

  /* ---------- update per‑frame values ---------- */
  useFrame(({ clock }) => {
    uniforms.iTime.value = clock.getElapsedTime();
  });

  /* ---------- update on viewport resize only ---------- */
  useEffect(() => {
    uniforms.iResolution.value.set(size.width, size.height, 1);
    uniforms.iChannelResolution.value[0].set(size.width, size.height, 1);
  }, [size, uniforms]);

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  );
}

/* ───────────────────────── Helper: 256×256 noise texture ───────────── */
function makeNoiseTexture() {
  const w = 256,
    h = 256,
    data = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const v = Math.random() * 255;
    data[i * 3] = data[i * 3 + 1] = data[i * 3 + 2] = v;
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBFormat);
  tex.needsUpdate = true;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/* ───────────────────────── Wrapper component ───────────────────────── */
export default function DVDShader() {
  return (
    <div className="relative h-screen w-full">
      <Canvas
        gl={{ powerPreference: "high-performance" }}
        dpr={Math.min(2, window.devicePixelRatio || 1)} // keep renderer instance
      >
        <DVDShaderScene />
      </Canvas>

      <div className="pointer-events-none absolute bottom-4 right-4 text-sm text-white opacity-80">
        <a
          href="https://www.shadertoy.com/view/DsXyRy"
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto hover:underline"
        >
          Shader by P_Malin (ported to R3F)
        </a>
      </div>
    </div>
  );
}
