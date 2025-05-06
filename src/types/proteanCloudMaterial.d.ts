import type * as THREE from "three";
import type React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      proteanCloudMaterial: React.PropsWithChildren<{
        ref?: React.Ref<
          THREE.ShaderMaterial & {
            uniforms: {
              iTime: { value: number };
              iResolution: { value: THREE.Vector2 };
              iMouse: { value: THREE.Vector4 };
            };
          }
        >;
      }>;
    }
  }
}
