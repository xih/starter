"use client";

import { useRef, useEffect } from "react";

const SeascapeGLSLVisualization = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // WebGL2 context ---------------------------------------------------------
    const gl = canvas.getContext("webgl2");
    if (!gl) {
      console.error("WebGL2 not supported");
      return;
    }

    // ---------- resize helpers --------------------------------------------
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // ---------- shader sources --------------------------------------------
    const vertexShaderSource = `#version 300 es
      in vec4 a_position;
      void main() {
        gl_Position = a_position;
      }
    `;

    const fragmentShaderSource = `#version 300 es
      precision highp float;
      out vec4 outColor;

      uniform vec2  u_resolution;
      uniform float u_time;
      uniform vec2  u_mouse;

      // ==== original seascape uniforms/constants ===========================
      #define NUM_STEPS 32
      #define PI 3.141592
      #define EPSILON 1e-3
      #define EPSILON_NRM (0.1 / u_resolution.x)

      #define ITER_GEOMETRY 3
      #define ITER_FRAGMENT 5
      #define SEA_HEIGHT 0.6
      #define SEA_CHOPPY 4.0
      #define SEA_SPEED 0.8
      #define SEA_FREQ 0.16
      const vec3 SEA_BASE = vec3(0.0,0.09,0.18);
      const vec3 SEA_WATER_COLOR = vec3(0.8,0.9,0.6)*0.6;
      #define SEA_TIME (1.0 + u_time * SEA_SPEED)
      const mat2 octave_m = mat2(1.6,1.2,-1.2,1.6);

      // ==== math helpers ===================================================
      mat3 fromEuler(vec3 ang){
        vec2 a1 = vec2(sin(ang.x),cos(ang.x));
        vec2 a2 = vec2(sin(ang.y),cos(ang.y));
        vec2 a3 = vec2(sin(ang.z),cos(ang.z));
        mat3 m;
        m[0] = vec3(a1.y*a3.y+a1.x*a2.x*a3.x,
                    a1.y*a2.x*a3.x+a3.y*a1.x,
                   -a2.y*a3.x);
        m[1] = vec3(-a2.y*a1.x,
                     a1.y*a2.y,
                     a2.x);
        m[2] = vec3(a3.y*a1.x*a2.x+a1.y*a3.x,
                     a1.x*a3.x-a1.y*a3.y*a2.x,
                     a2.y*a3.y);
        return m;
      }

      float hash(vec2 p){
        float h = dot(p, vec2(127.1,311.7));	
        return fract(sin(h)*43758.5453123);
      }

      float noise(vec2 p){
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f*f*(3.0-2.0*f);
        return -1.0 + 2.0 * mix(mix(hash(i + vec2(0.0,0.0)),
                                     hash(i + vec2(1.0,0.0)), u.x),
                                mix(hash(i + vec2(0.0,1.0)),
                                     hash(i + vec2(1.0,1.0)), u.x), u.y);
      }

      // ==== lighting helpers ==============================================
      float diffuse(vec3 n, vec3 l, float p){
        return pow(dot(n,l)*0.4+0.6,p);
      }
      float specular(vec3 n, vec3 l, vec3 e, float s){
        float nrm = (s+8.0)/(PI*8.0);
        return pow(max(dot(reflect(e,n),l),0.0),s)*nrm;
      }

      // ==== sky ============================================================
      vec3 getSkyColor(vec3 e){
        e.y = (max(e.y,0.0)*0.8+0.2)*0.8;
        return vec3(pow(1.0-e.y,2.0), 1.0-e.y, 0.6+(1.0-e.y)*0.4)*1.1;
      }

      // ==== sea heightfield ===============================================
      float sea_octave(vec2 uv, float choppy){
        uv += noise(uv);
        vec2 wv = 1.0 - abs(sin(uv));
        vec2 swv = abs(cos(uv));
        wv = mix(wv, swv, wv);
        return pow(1.0 - pow(wv.x*wv.y, 0.65), choppy);
      }

      float map(vec3 p){
        float freq = SEA_FREQ;
        float amp  = SEA_HEIGHT;
        float choppy = SEA_CHOPPY;
        vec2 uv = p.xz; uv.x *= 0.75;
        float h = 0.0;
        for(int i=0; i<ITER_GEOMETRY; i++){
          float d = sea_octave((uv+SEA_TIME)*freq, choppy);
          d +=       sea_octave((uv-SEA_TIME)*freq, choppy);
          h += d * amp;
          uv *= octave_m; freq *= 1.9; amp *= 0.22;
          choppy = mix(choppy, 1.0, 0.2);
        }
        return p.y - h;
      }

      float map_detailed(vec3 p){
        float freq = SEA_FREQ;
        float amp  = SEA_HEIGHT;
        float choppy = SEA_CHOPPY;
        vec2 uv = p.xz; uv.x *= 0.75;
        float h = 0.0;
        for(int i=0; i<ITER_FRAGMENT; i++){
          float d = sea_octave((uv+SEA_TIME)*freq, choppy);
          d +=       sea_octave((uv-SEA_TIME)*freq, choppy);
          h += d * amp;
          uv *= octave_m; freq *= 1.9; amp *= 0.22;
          choppy = mix(choppy, 1.0, 0.2);
        }
        return p.y - h;
      }

      vec3 getNormal(vec3 p, float eps){
        vec3 n;
        n.y = map_detailed(p);
        n.x = map_detailed(vec3(p.x+eps, p.y, p.z)) - n.y;
        n.z = map_detailed(vec3(p.x, p.y, p.z+eps)) - n.y;
        n.y = eps;
        return normalize(n);
      }

      float heightMapTracing(vec3 ori, vec3 dir, out vec3 p){
        float tm = 0.0;
        float tx = 1000.0;
        float hx = map(ori + dir*tx);
        if(hx > 0.0){
          p = ori + dir*tx;
          return tx;
        }
        float hm = map(ori);
        for(int i=0; i<NUM_STEPS; i++){
          float tmid = mix(tm, tx, hm/(hm-hx));
          p = ori + dir*tmid;
          float hmid = map(p);
          if(hmid < 0.0){
            tx = tmid; hx = hmid;
          } else {
            tm = tmid; hm = hmid;
          }
          if(abs(hmid) < EPSILON) break;
        }
        return mix(tm, tx, hm/(hm-hx));
      }

      vec3 getSeaColor(vec3 p, vec3 n, vec3 l, vec3 eye, vec3 dist){
        float fresnel = clamp(1.0 - dot(n, -eye), 0.0, 1.0);
        fresnel = min(pow(fresnel,3.0), 0.5);
        vec3 reflected = getSkyColor(reflect(eye, n));
        vec3 refracted = SEA_BASE + diffuse(n,l,80.0)*SEA_WATER_COLOR*0.12;
        vec3 color = mix(refracted, reflected, fresnel);
        float atten = max(1.0 - dot(dist,dist)*0.001, 0.0);
        color += SEA_WATER_COLOR * (p.y-SEA_HEIGHT) * 0.18 * atten;
        color += specular(n,l,eye,60.0);
        return color;
      }

      // ==== main pixel =====================================================
      vec3 render(in vec2 fragCoord){
        vec2 uv = fragCoord / u_resolution.xy;
        uv = uv*2.0 - 1.0;
        uv.x *= u_resolution.x / u_resolution.y;

        vec3 ang = vec3(sin(u_time*3.0)*0.1,
                        sin(u_time)*0.2 + 0.3,
                        u_time);
        vec3 ori = vec3(0.0, 3.5, u_time*5.0);
        vec3 dir = normalize(vec3(uv.xy, -2.0));
        dir.z += length(uv)*0.14;
        dir = normalize(dir * fromEuler(ang));

        vec3 p;
        heightMapTracing(ori, dir, p);
        vec3 dist = p - ori;
        vec3 n = getNormal(p, dot(dist,dist) * EPSILON_NRM);
        vec3 light = normalize(vec3(0.0,1.0,0.8));

        return mix(getSkyColor(dir),
                   getSeaColor(p,n,light,dir,dist),
                   pow(smoothstep(0.0,-0.02,dir.y),0.2));
      }

      void main(){
        vec3 col = render(gl_FragCoord.xy);
        outColor = vec4(pow(col, vec3(0.65)), 1.0);
      }
    `;

    // ---------- compile helpers -------------------------------------------
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error(
          "Shader compile error:",
          type === gl.VERTEX_SHADER ? "VERTEX" : "FRAGMENT",
          gl.getShaderInfoLog(sh),
        );
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };

    const vShader = compile(gl.VERTEX_SHADER, vertexShaderSource);
    const fShader = compile(gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vShader || !fShader) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }

    // ---------- buffers ----------------------------------------------------
    const positionBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const locPos = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(locPos);
    gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);

    // ---------- uniform locations -----------------------------------------
    const locResolution = gl.getUniformLocation(program, "u_resolution");
    const locTime = gl.getUniformLocation(program, "u_time");
    const locMouse = gl.getUniformLocation(program, "u_mouse");

    // ---------- mouse tracking --------------------------------------------
    const mouse = { x: 0, y: 0 };
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) * (window.devicePixelRatio || 1);
      mouse.y =
        rect.height * (window.devicePixelRatio || 1) -
        (e.clientY - rect.top) * (window.devicePixelRatio || 1);
    };
    window.addEventListener("pointermove", onPointerMove);

    // ---------- render loop -----------------------------------------------
    gl.useProgram(program);
    const start = performance.now();

    const render = () => {
      resizeCanvas();

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform2f(locResolution, canvas.width, canvas.height);
      gl.uniform1f(locTime, (performance.now() - start) / 1000);
      gl.uniform2f(locMouse, mouse.x, mouse.y);

      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      requestAnimationFrame(render);
    };
    render();

    // ---------- cleanup ----------------------------------------------------
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("pointermove", onPointerMove);
      gl.deleteProgram(program);
      gl.deleteShader(vShader);
      gl.deleteShader(fShader);
      gl.deleteBuffer(positionBuffer);
      gl.deleteVertexArray(vao);
    };
  }, []);

  return (
    <div className="relative h-screen w-full">
      <canvas
        ref={canvasRef}
        className="block h-screen w-full"
        style={{ touchAction: "none" }}
      />
      <div className="pointer-events-none absolute bottom-4 right-4 text-sm text-white opacity-80"></div>
    </div>
  );
};

export default SeascapeGLSLVisualization;
