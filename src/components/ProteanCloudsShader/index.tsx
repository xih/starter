/* --------------------------------------------------------------------------
   ProteanClouds.tsx  – fixed version
   ‣ Removes duplicate `attribute vec3 position;` in the vertex shader
   ‣ No more "redefinition" / VALIDATE_STATUS errors
   ----------------------------------------------------------------------- */
"use client";

import { Canvas, useThree, useFrame, extend } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";
import { Suspense, useRef, useEffect, useMemo } from "react";

// Add proteanCloudMaterial to JSX.IntrinsicElements for TSX support
declare global {
  interface IntrinsicElements {
    proteanCloudMaterial: React.PropsWithChildren<{
      ref?: React.Ref<THREE.ShaderMaterial>;
    }>;
  }
}

/* ─────────────────── runtime knobs (same as before) ─────────────────── */
const dprCap =
  typeof window !== "undefined" ? Math.min(window.devicePixelRatio, 1.5) : 1;
const isMobile =
  typeof navigator !== "undefined" &&
  /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
const MARCH_STEPS = isMobile ? 72 : dprCap < 1.4 ? 96 : 110;

// ─────────────────────────── GLSL sources ────────────────────────────
const VERT = /* glsl */ `
   precision highp float;
   
   /*  NOTE:
       Three.js already injects:
         attribute vec3 position;
       so we **do not** redeclare it here. */
   void main() {
     gl_Position = vec4(position, 1.0);
   }
   `;

const FRAG = /* glsl */ `
   precision highp float;
   
   uniform vec2  iResolution;
   uniform float iTime;
   uniform vec4  iMouse;
   
   /*  ––––– Nimitz "Protean clouds" fragment shader –––––
       (unchanged, just wrapped for WebGL)                */
   mat2 rot(in float a){float c = cos(a), s = sin(a);return mat2(c,s,-s,c);}
   const mat3 m3 = mat3(0.33338, 0.56034, -0.71817, -0.87887, 0.32651, -0.15323, 0.15162, 0.69596, 0.61339)*1.93;
   float mag2(vec2 p){return dot(p,p);}
   float linstep(in float mn, in float mx, in float x){ return clamp((x - mn)/(mx - mn), 0., 1.); }
   float prm1 = 0.;
   vec2 bsMo = vec2(0);
   
   vec2 disp(float t){ return vec2(sin(t*0.22)*1., cos(t*0.175)*1.)*2.; }
   
   vec2 map(vec3 p)
   {
       vec3 p2 = p;
       p2.xy -= disp(p.z).xy;
       p.xy *= rot(sin(p.z+iTime)*(0.1 + prm1*0.05) + iTime*0.09);
       float cl = mag2(p2.xy);
       float d = 0.;
       p *= .61;
       float z = 1.;
       float trk = 1.;
       float dspAmp = 0.1 + prm1*0.2;
       for(int i = 0; i < 5; i++)
       {
           p += sin(p.zxy*0.75*trk + iTime*trk*.8)*dspAmp;
           d -= abs(dot(cos(p), sin(p.yzx))*z);
           z *= 0.57;
           trk *= 1.4;
           p = p*m3;
       }
       d = abs(d + prm1*3.)+ prm1*.3 - 2.5 + bsMo.y;
       return vec2(d + cl*.2 + 0.25, cl);
   }
   
   vec4 render( in vec3 ro, in vec3 rd, float time )
   {
       vec4 rez = vec4(0);
       const float ldst = 8.;
       vec3 lpos = vec3(disp(time + ldst)*0.5, time + ldst);
       float t = 1.5;
       float fogT = 0.;
       for(int i=0; i<130; i++)
       {
           if(rez.a > 0.99)break;
   
           vec3 pos = ro + t*rd;
           vec2 mpv = map(pos);
           float den = clamp(mpv.x-0.3,0.,1.)*1.12;
           float dn = clamp((mpv.x + 2.),0.,3.);
           
           vec4 col = vec4(0);
           if (mpv.x > 0.6)
           {
               col = vec4(sin(vec3(5.,0.4,0.2) + mpv.y*0.1 +sin(pos.z*0.4)*0.5 + 1.8)*0.5 + 0.5,0.08);
               col *= den*den*den;
               col.rgb *= linstep(4.,-2.5, mpv.x)*2.3;
               float dif =  clamp((den - map(pos+.8).x)/9., 0.001, 1. );
               dif += clamp((den - map(pos+.35).x)/2.5, 0.001, 1. );
               col.xyz *= den*(vec3(0.005,.045,.075) + 1.5*vec3(0.033,0.07,0.03)*dif);
           }
   
           float fogC = exp(t*0.2 - 2.2);
           col.rgba += vec4(0.06,0.11,0.11, 0.1)*clamp(fogC-fogT, 0., 1.);
           fogT = fogC;
           rez = rez + col*(1. - rez.a);
           t += clamp(0.5 - dn*dn*.05, 0.09, 0.3);
       }
       return clamp(rez, 0.0, 1.0);
   }
   
   float getsat(vec3 c)
   {
       float mi = min(min(c.x, c.y), c.z);
       float ma = max(max(c.x, c.y), c.z);
       return (ma - mi)/(ma+ 1e-7);
   }
   
   vec3 iLerp(in vec3 a, in vec3 b, in float x)
   {
       vec3 ic = mix(a, b, x) + vec3(1e-6,0.,0.);
       float sd = abs(getsat(ic) - mix(getsat(a), getsat(b), x));
       vec3 dir = normalize(vec3(2.*ic.x - ic.y - ic.z, 2.*ic.y - ic.x - ic.z, 2.*ic.z - ic.y - ic.x));
       float lgt = dot(vec3(1.0), ic);
       float ff = dot(dir, normalize(ic));
       ic += 1.5*dir*sd*ff*lgt;
       return clamp(ic,0.,1.);
   }
   
   void mainImage( out vec4 fragColor, in vec2 fragCoord )
   {   
       vec2 q = fragCoord.xy/iResolution.xy;
       vec2 p = (fragCoord - 0.5*iResolution.xy)/iResolution.y;
       bsMo = (iMouse.xy - 0.5*iResolution.xy)/iResolution.y;
       
       float time = iTime*3.;
       vec3 ro = vec3(0,0,time);
       
       ro += vec3(sin(iTime)*0.5,sin(iTime*1.)*0.,0);
           
       float dspAmp = .85;
       ro.xy += disp(ro.z)*dspAmp;
       float tgtDst = 3.5;
       
       vec3 target = normalize(ro - vec3(disp(time + tgtDst)*dspAmp, time + tgtDst));
       ro.x -= bsMo.x*2.;
       vec3 rightdir = normalize(cross(target, vec3(0,1,0)));
       vec3 updir = normalize(cross(rightdir, target));
       rightdir = normalize(cross(updir, target));
       vec3 rd=normalize((p.x*rightdir + p.y*updir)*1. - target);
       rd.xy *= rot(-disp(time + 3.5).x*0.2 + bsMo.x);
       prm1 = smoothstep(-0.4, 0.4,sin(iTime*0.3));
       vec4 scn = render(ro, rd, time);
           
       vec3 col = scn.rgb;
       col = iLerp(col.bgr, col.rgb, clamp(1.-prm1,0.05,1.));
       
       col = pow(col, vec3(.55,0.65,0.6))*vec3(1.,.97,.9);
   
       col *= pow( 16.0*q.x*q.y*(1.0-q.x)*(1.0-q.y), 0.12)*0.7+0.3; //Vign
       
       fragColor = vec4( col, 1.0 );
   }
   
   // ────────── wrap Shadertoy entry ──────────
   void main() {
     vec4 col;
     mainImage(col, gl_FragCoord.xy);
     gl_FragColor = col;
   }
   `;

// ───────────────────── shader material setup ─────────────────────
const ProteanCloudMaterial = shaderMaterial(
  {
    iTime: 0,
    iResolution: new THREE.Vector2(),
    iMouse: new THREE.Vector4(),
  },
  VERT,
  FRAG,
);
extend({ ProteanCloudMaterial });

// ─────────────────────────── full‑screen mesh ──────────────────────────
const CloudsMesh = () => {
  // NOTE: start with null, then narrow everywhere
  const matRef = useRef<THREE.ShaderMaterial | null>(null);
  const { size, pointer, clock } = useThree();
  const lastT = useRef(0);

  // --- safe resize handler ------------------------------------------------
  useEffect(() => {
    if (!matRef.current) return; // 🚫 mat could still be null during first render
    const uniforms = matRef.current.uniforms;
    if (
      uniforms?.iResolution?.value &&
      typeof uniforms.iResolution.value.set === "function"
    ) {
      (uniforms.iResolution.value as THREE.Vector2).set(
        size.width * dprCap,
        size.height * dprCap,
      );
    }
  }, [size]);

  // --- per‑frame update ---------------------------------------------------
  useFrame(() => {
    const m = matRef.current;
    if (!m) return; // ⛑ guard for TS + runtime
    if (
      typeof document !== "undefined" &&
      document.visibilityState !== "visible"
    )
      return;

    const now = clock.elapsedTime;
    if (now - lastT.current < 1 / 60) return;
    lastT.current = now;

    const uniforms = m.uniforms;
    if (uniforms?.iTime?.value !== undefined) uniforms.iTime.value = now;
    if (
      uniforms?.iMouse?.value &&
      typeof uniforms.iMouse.value.set === "function"
    ) {
      (uniforms.iMouse.value as THREE.Vector4).set(
        (pointer.x + 1) * 0.5 * size.width * dprCap,
        (1 - (pointer.y + 1) * 0.5) * size.height * dprCap,
        0,
        0,
      );
    }
  });

  // static clip‑space quad
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
        3,
      ),
    );
    return geo;
  }, []);

  return (
    <mesh geometry={geometry}>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <proteanCloudMaterial ref={matRef} />
    </mesh>
  );
};

// ───────────────────────────── export ─────────────────────────────
export default function ProteanClouds() {
  return (
    <div className="relative h-screen w-full">
      <Canvas
        dpr={dprCap}
        orthographic
        camera={{ position: [0, 0, 1], zoom: 1 }}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
      >
        <Suspense fallback={null}>
          <CloudsMesh />
        </Suspense>
      </Canvas>
    </div>
  );
}
