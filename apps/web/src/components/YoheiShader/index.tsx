"use client";

import { useRef, useEffect } from "react";

const TweetGLSLVisualization = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get WebGL2 context
    const gl = canvas.getContext("webgl2");
    if (!gl) {
      console.error("WebGL2 not supported");
      return;
    }

    // Resize canvas to full screen
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Vertex shader - just pass through position
    const vertexShaderSource = `#version 300 es
      in vec4 a_position;
      void main() {
        gl_Position = a_position;
      }
    `;

    // Fragment shader - exact copy of the original GLSL code
    const fragmentShaderSource = `#version 300 es
  precision highp float;
  out vec4 outColor;
  uniform vec2 u_resolution;  // Screen resolution
  uniform float u_time;       // Time in seconds
  
  // HSV to RGB color conversion
  // h: hue [0,1], s: saturation [0,1], v: value/brightness [0,1]
  // Returns RGB color in [0,1] range
  // This is a standard colorspace transformation used in signal visualization
  vec3 hsv(float h, float s, float v) {
    vec4 t = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(vec3(h) + t.xyz) * 6.0 - vec3(t.w));
    return v * mix(vec3(t.x), clamp(p - vec3(t.x), 0.0, 1.0), s);
  }
  
  void main() {
    // Initialize variables
    vec2 r = u_resolution;                  // Screen resolution
    vec2 FC = gl_FragCoord.xy;              // Current fragment coordinates
    float t = u_time;                       // Current time
    vec4 o = vec4(0.0, 0.0, 0.0, 1.0);      // Output color (initially black)
    
    // Core variables for the ray-marching and fractal generation
    float i,                                // Loop counter for ray steps
          e,                                // Distance estimation value
          R,                                // Radius/length of position vector
          s;                                // Scale factor for fractal iteration
    
    // Position vectors
    vec3 q,                                 // Current position in 3D space (accumulates)
         p,                                 // Working position (modified each iteration)
         
         // Initial ray direction vector:
         // - Normalizes screen coordinates to [-0.5,0.5] range
         // - Offsets y by 0.3 to center the view
         // - Sets z=0.8 to control perspective/field of view
         d=vec3(FC.xy/r-vec2(.5,-.3),.8);
    
    // Main ray-marching loop
    // This is a simplified ray-marching algorithm that steps through 3D space
    // q.zy-- initializes z and y components to -1 (sets up the initial view direction)
    for(q.zy--;i++<99.;){
      // Accumulate color based on distance estimation and scale
      // - This creates a glow effect where the color intensity is related to how close we are to the surface
      // - The min() function prevents oversaturation in areas of high detail
      // - The division by 35.0 controls the overall brightness
      // - HSV color model with fixed hue (0.1) and saturation (0.15) creates a consistent color palette
      o.rgb+=hsv(.1,.15,min(e*s,.7-e)/35.);
      
      // Reset scale factor for the next fractal iteration
      s=1.;
      
      // Update position: current position + direction * distance * radius * 0.2
      // This is the ray-marching step, moving along the ray by a distance proportional to e*R
      // The 0.2 factor controls the step size (smaller = more precise but slower)
      p=q+=d*e*R*.2;
      
      // Transform position into a logarithmic spiral space
      // This creates the characteristic spiral fractal pattern
      // - log(R) creates a logarithmic scaling effect
      // - exp(0.8-p.z/R) creates exponential distortion
      // - atan(p.y,p.x) gives the angle in the xy plane
      p=vec3(log(R=length(p))-t*.8,exp(.8-p.z/R),atan(p.y,p.x)+t*.4);
      
      // Fractal detail generation using frequency domain synthesis
      // This is similar to spectral noise synthesis in signal processing
      // - Starting with e = p.y-1
      // - For each octave (s doubles each iteration)
      // - Add weighted sinusoidal noise components
      // - The dot product combines multiple dimensions of noise
      // - The division by s creates a 1/f (pink) noise spectral characteristic
      // - This creates detail with natural-looking falloff at higher frequencies
      for(e=--p.y;s<3e2;s+=s)e+=dot(sin(p.yzz*s)-.5,.8-sin(p.zxx*s))/s*.3;
    }
    
    // Output the final color
    outColor = o;
  }
`;

    // Create shader program
    const createShader = (
      gl: WebGL2RenderingContext,
      type: number,
      source: string,
    ) => {
      const shader = gl.createShader(type);
      if (!shader) {
        console.error("Failed to create shader");
        return null;
      }

      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }

      return shader;
    };

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource,
    );

    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) {
      console.error("Failed to create program");
      return;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking error:", gl.getProgramInfoLog(program));
      return;
    }

    // Set up position buffer (full screen quad)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const positions = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Set up attributes and uniforms
    const positionAttributeLocation = gl.getAttribLocation(
      program,
      "a_position",
    );
    const resolutionUniformLocation = gl.getUniformLocation(
      program,
      "u_resolution",
    );
    const timeUniformLocation = gl.getUniformLocation(program, "u_time");

    // Set up vertex array
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(positionAttributeLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    // Start time for animation
    const startTime = performance.now();

    // Use shader program
    gl.useProgram(program);

    // Render function
    const render = () => {
      // Calculate time in seconds
      const currentTime = performance.now();
      const elapsedTime = (currentTime - startTime) / 1000;

      // Set canvas size and viewport
      resizeCanvas();
      gl.viewport(0, 0, canvas.width, canvas.height);

      // Clear canvas
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.bindVertexArray(vao);

      // Set uniforms
      gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
      gl.uniform1f(timeUniformLocation, elapsedTime);

      // Draw
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Request next frame
      requestAnimationFrame(render);
    };

    gl.useProgram(program);
    // Start rendering
    render();

    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
      gl.deleteVertexArray(vao);
      gl.useProgram(null);
    };
  }, []);

  return (
    <div className="relative h-screen w-full">
      <canvas
        ref={canvasRef}
        className="block h-screen w-full"
        style={{ touchAction: "none" }}
      />
      <div className="pointer-events-none absolute bottom-4 right-4 text-sm text-white opacity-80">
        <a
          href="https://x.com/YoheiNishitsuji/status/1918213871375892638"
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto text-white hover:underline"
        >
          @Yohei Nishitsuji
        </a>
      </div>
    </div>
  );
};

export default TweetGLSLVisualization;
