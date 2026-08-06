"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/lib/three/leather-texture";

/**
 * Ambient dust motes drifting through the key light.
 *
 * One `Points` draw call with additive blending. Per-particle motion lives in
 * the vertex shader; the CPU only advances a single uTime uniform, so 90 or
 * 900 motes cost the same on the main thread.
 */
export function Motes({ count = 90 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const scales = new Float32Array(count);

    // Seeded rather than Math.random(): useMemo must be pure, or React may
    // re-run it and silently reshuffle the whole field mid-scene. This also
    // makes the layout reproducible, which matters for visual regression shots.
    const rand = mulberry32(0x7715);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand() - 0.5) * 9;
      positions[i * 3 + 1] = (rand() - 0.5) * 6.5;
      positions[i * 3 + 2] = rand() * 3.4 + 0.4;
      seeds[i] = rand() * Math.PI * 2;
      scales[i] = rand() * 0.7 + 0.3;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    g.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    return g;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        // Owned by the material and mutated per-frame through the points ref.
        // Never a memoised React value — the compiler forbids mutating those.
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          uniform float uTime;
          attribute float aSeed;
          attribute float aScale;
          varying float vAlpha;

          void main() {
            vec3 p = position;
            // Slow lissajous drift — no two motes share a path.
            p.x += sin(uTime * 0.19 + aSeed) * 0.42;
            p.y += cos(uTime * 0.13 + aSeed * 1.7) * 0.34
                 + sin(uTime * 0.05 + aSeed) * 0.16;

            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;

            // Perspective-correct size, and fade with depth so the far motes
            // sit behind the leather rather than on top of it.
            gl_PointSize = aScale * 46.0 / -mv.z;
            vAlpha = aScale * smoothstep(5.2, 1.4, -mv.z)
                   * (0.55 + 0.45 * sin(uTime * 0.7 + aSeed * 3.1));
          }
        `,
        fragmentShader: /* glsl */ `
          varying float vAlpha;
          void main() {
            // Round, soft-edged sprite from point coordinates — no texture.
            vec2 uv = gl_PointCoord - 0.5;
            float d = length(uv);
            float mask = smoothstep(0.5, 0.06, d);
            if (mask < 0.01) discard;
            gl_FragColor = vec4(vec3(0.88, 0.78, 0.62), mask * vAlpha * 0.5);
          }
        `,
      }),
    [],
  );

  useFrame((_, delta) => {
    const mat = pointsRef.current?.material as THREE.ShaderMaterial | undefined;
    if (mat) mat.uniforms.uTime.value += Math.min(delta, 0.05);
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
}
