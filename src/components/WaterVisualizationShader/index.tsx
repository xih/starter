"use client";

import { useRef, useEffect } from "react";

const WaterGLSLVisualization = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ------------------------------------------------------------------ WebGL
    const gl = canvas.getContext("webgl2");
    if (!gl) {
      console.error("WebGL2 not supported");
      return;
    }

    // ------------------------------------------------------- resize + DPR helper
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // ----------------------------------------------------------- shader sources
    const vertexShaderSource = `#version 300 es
      in vec4 a_position;
      void main() { gl_Position = a_position; }
    `;

    const fragmentShaderSource = `#version 300 es
      precision highp float;
      out vec4 outColor;

      // Shadertoy‑style uniforms
      uniform vec2  iResolution;
      uniform float iTime;
      uniform vec4  iMouse;

      // ---------- original shader ------------------------------------------------
      #define DRAG_MULT 0.38
      #define WATER_DEPTH 1.0
      #define CAMERA_HEIGHT 1.5
      #define ITERATIONS_RAYMARCH 12
      #define ITERATIONS_NORMAL 36
      #define NormalizedMouse (iMouse.xy / iResolution.xy)

      vec2 wavedx(vec2 position, vec2 direction, float frequency, float timeshift) {
        float x = dot(direction, position) * frequency + timeshift;
        float wave = exp(sin(x) - 1.0);
        float dx = wave * cos(x);
        return vec2(wave, -dx);
      }

      float getwaves(vec2 position, int iterations) {
        float wavePhaseShift = length(position) * 0.1;
        float iter = 0.0;
        float frequency = 1.0;
        float timeMultiplier = 2.0;
        float weight = 1.0;
        float sumOfValues = 0.0;
        float sumOfWeights = 0.0;
        for(int i=0; i<iterations; i++) {
          vec2 p = vec2(sin(iter), cos(iter));
          vec2 res = wavedx(position, p, frequency,
                            iTime * timeMultiplier + wavePhaseShift);
          position += p * res.y * weight * DRAG_MULT;
          sumOfValues += res.x * weight;
          sumOfWeights += weight;
          weight = mix(weight, 0.0, 0.2);
          frequency *= 1.18;
          timeMultiplier *= 1.07;
          iter += 1232.399963;
        }
        return sumOfValues / sumOfWeights;
      }

      float raymarchwater(vec3 camera, vec3 start, vec3 end, float depth) {
        vec3 pos = start;
        vec3 dir = normalize(end - start);
        for(int i=0; i<64; i++) {
          float height = getwaves(pos.xz, ITERATIONS_RAYMARCH) * depth - depth;
          if(height + 0.01 > pos.y) { return distance(pos, camera); }
          pos += dir * (pos.y - height);
        }
        return distance(start, camera);
      }

      vec3 normal(vec2 pos, float e, float depth) {
        vec2 ex = vec2(e, 0.0);
        float H = getwaves(pos, ITERATIONS_NORMAL) * depth;
        vec3 a = vec3(pos.x, H, pos.y);
        return normalize(cross(
          a - vec3(pos.x - e, getwaves(pos - ex, ITERATIONS_NORMAL)*depth, pos.y),
          a - vec3(pos.x, getwaves(pos + ex.yx, ITERATIONS_NORMAL)*depth, pos.y + e)
        ));
      }

      mat3 createRotationMatrixAxisAngle(vec3 axis, float angle) {
        float s = sin(angle);
        float c = cos(angle);
        float oc = 1.0 - c;
        return mat3(
          oc*axis.x*axis.x + c,           oc*axis.x*axis.y - axis.z*s,  oc*axis.z*axis.x + axis.y*s,
          oc*axis.x*axis.y + axis.z*s,    oc*axis.y*axis.y + c,         oc*axis.y*axis.z - axis.x*s,
          oc*axis.z*axis.x - axis.y*s,    oc*axis.y*axis.z + axis.x*s,  oc*axis.z*axis.z + c
        );
      }

      vec3 getRay(vec2 fragCoord) {
        vec2 uv = ((fragCoord/iResolution) * 2.0 - 1.0)
                  * vec2(iResolution.x/iResolution.y, 1.0);
        vec3 proj = normalize(vec3(uv, 1.5));
        if(iResolution.x < 600.0) return proj;
        proj = createRotationMatrixAxisAngle(vec3(0.0, -1.0, 0.0),
                         3.0 * ((NormalizedMouse.x + 0.5)*2.0 - 1.0))
             * createRotationMatrixAxisAngle(vec3(1.0, 0.0, 0.0),
                         0.5 + 1.5 * ((((NormalizedMouse.y==0.0)
                         ? 0.27 : NormalizedMouse.y))*2.0 - 1.0)) * proj;
        return proj;
      }

      float intersectPlane(vec3 origin, vec3 direction,
                           vec3 point, vec3 normal) {
        return clamp(dot(point - origin, normal)/dot(direction, normal),
                     -1.0, 9991999.0);
      }

      vec3 extra_cheap_atmosphere(vec3 raydir, vec3 sundir) {
        float special_trick = 1.0/(raydir.y*1.0 + 0.1);
        float special_trick2 = 1.0/(sundir.y*11.0 + 1.0);
        float raysundt = pow(abs(dot(sundir,raydir)), 2.0);
        float sundt = pow(max(0.0,dot(sundir,raydir)),8.0);
        float mymie = sundt*special_trick*0.2;
        vec3 suncolor = mix(vec3(1.0), max(vec3(0.0),
                        vec3(1.0)-vec3(5.5,13.0,22.4)/22.4), special_trick2);
        vec3 bluesky = vec3(5.5,13.0,22.4)/22.4 * suncolor;
        vec3 bluesky2 = max(vec3(0.0),
                        bluesky-vec3(5.5,13.0,22.4)*0.002*
                        (special_trick + -6.0*sundir.y*sundir.y));
        bluesky2 *= special_trick*(0.24 + raysundt*0.24);
        return bluesky2 * (1.0 + pow(1.0 - raydir.y, 3.0));
      }

      vec3 getSunDirection() {
        return normalize(vec3(-0.077350269, 0.5 + sin(iTime*0.2+2.6)*0.45,
                              0.577350269));
      }
      vec3 getAtmosphere(vec3 dir) { return extra_cheap_atmosphere(dir,
                                        getSunDirection())*0.5; }
      float getSun(vec3 dir) {
        return pow(max(0.0,dot(dir,getSunDirection())), 720.0) * 210.0;
      }

      vec3 aces_tonemap(vec3 color) {
        mat3 m1 = mat3(
          0.59719,0.076,0.0284, 0.35458,0.90834,0.13383, 0.04823,0.01566,0.83777);
        mat3 m2 = mat3(
          1.60475,-0.10208,-0.00327, -0.53108,1.10813,-0.07276,
          -0.07367,-0.00605,1.07602);
        vec3 v = m1*color;
        vec3 a = v*(v+0.0245786) - 0.000090537;
        vec3 b = v*(0.983729*v + 0.4329510) + 0.238081;
        return pow(clamp(m2*(a/b),0.0,1.0), vec3(1.0/2.2));
      }

      void mainImage(out vec4 fragColor, in vec2 fragCoord) {
        vec3 ray = getRay(fragCoord);
        if(ray.y >= 0.0) {
          vec3 C = getAtmosphere(ray) + getSun(ray);
          fragColor = vec4(aces_tonemap(C*2.0), 1.0);
          return;
        }

        vec3 waterPlaneHigh = vec3(0.0, 0.0, 0.0);
        vec3 waterPlaneLow  = vec3(0.0, -WATER_DEPTH, 0.0);
        vec3 origin = vec3(iTime*0.2, CAMERA_HEIGHT, 1.0);

        float highPlaneHit = intersectPlane(origin, ray, waterPlaneHigh,
                                            vec3(0.0,1.0,0.0));
        float lowPlaneHit  = intersectPlane(origin, ray, waterPlaneLow,
                                            vec3(0.0,1.0,0.0));
        vec3 highHitPos = origin + ray*highPlaneHit;
        vec3 lowHitPos  = origin + ray*lowPlaneHit;

        float dist = raymarchwater(origin, highHitPos, lowHitPos, WATER_DEPTH);
        vec3 waterHitPos = origin + ray*dist;

        vec3 N = normal(waterHitPos.xz, 0.01, WATER_DEPTH);
        N = mix(N, vec3(0.0,1.0,0.0),
                0.8 * min(1.0, sqrt(dist*0.01)*1.1));

        float fresnel = 0.04 + (1.0-0.04) *
                        pow(1.0 - max(0.0, dot(-N, ray)), 5.0);

        vec3 R = normalize(reflect(ray, N)); R.y = abs(R.y);

        vec3 reflection = getAtmosphere(R) + getSun(R);
        vec3 scattering = vec3(0.0293,0.0698,0.1717) * 0.1 *
                          (0.2 + (waterHitPos.y+WATER_DEPTH)/WATER_DEPTH);

        vec3 C = fresnel*reflection + scattering;
        fragColor = vec4(aces_tonemap(C*2.0), 1.0);
      }

      // ---------------- GLSL main (wrap Shadertoy entry) -------------------
      void main() {
        vec4 col;
        mainImage(col, gl_FragCoord.xy);
        outColor = col;
      }
    `;

    // ------------------------------------------------------------- utilities
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

    // ----------------------------------------------------- buffers & attribs
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

    // ------------------------------------------------------------- uniforms
    const locResolution = gl.getUniformLocation(program, "iResolution");
    const locTime = gl.getUniformLocation(program, "iTime");
    const locMouse = gl.getUniformLocation(program, "iMouse");

    // ------------------------------------------------------------- mouse
    const mouse = { x: 0, y: 0 };
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      mouse.x = (e.clientX - rect.left) * dpr;
      mouse.y = (rect.height - (e.clientY - rect.top)) * dpr; // flip Y
    };
    window.addEventListener("pointermove", onPointerMove);

    // ------------------------------------------------------------- render
    gl.useProgram(program);
    const start = performance.now();

    const render = () => {
      resizeCanvas();

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform2f(locResolution, canvas.width, canvas.height);
      gl.uniform1f(locTime, (performance.now() - start) / 1000);
      gl.uniform4f(locMouse, mouse.x, mouse.y, 0, 0);

      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      requestAnimationFrame(render);
    };
    render();

    // ------------------------------------------------------------- cleanup
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
      {/* Optional overlay UI / attribution */}
    </div>
  );
};

export default WaterGLSLVisualization;
