"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createLeatherMaps } from "@/lib/three/leather-texture";

/**
 * A hanging leather panel that breathes.
 *
 * Displacement runs in the vertex shader via `onBeforeCompile`, not in JS.
 * Moving ~25k vertices per frame on the CPU and calling computeVertexNormals()
 * would cost several milliseconds a frame; on the GPU it is free, and the
 * normals are derived analytically from the same wave functions so the
 * lighting stays correct across the whole surface.
 */
export function LeatherDrape({
  color = "#45271a",
  grain = 26,
}: {
  color?: string;
  grain?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const maps = useMemo(
    () => createLeatherMaps({ color, grain, roughness: 0.58, relief: 2.6 }),
    [color, grain],
  );

  const material = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      map: maps.map,
      normalMap: maps.normalMap,
      roughnessMap: maps.roughnessMap,
      normalScale: new THREE.Vector2(1.15, 1.15),
      metalness: 0.06,
      roughness: 1,
      // A thin clearcoat is what separates "finished hide" from "brown rubber".
      clearcoat: 0.35,
      clearcoatRoughness: 0.42,
      sheen: 0.5,
      sheenColor: new THREE.Color("#b79976"),
      sheenRoughness: 0.7,
      side: THREE.DoubleSide,
    });

    m.map!.repeat.set(3, 4);
    m.normalMap!.repeat.set(3, 4);
    m.roughnessMap!.repeat.set(3, 4);

    // The clock uniform is owned by the material and reached through the mesh
    // ref in useFrame. Keeping it off a memoised value matters: three.js needs
    // it mutated every frame, which the React Compiler forbids on anything it
    // has memoised — and stashing it on `userData` is the escape hatch three
    // provides for exactly this.
    const clock = { value: 0 };
    m.userData.clock = clock;

    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = clock;

      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          /* glsl */ `
          #include <common>
          uniform float uTime;

          // Three travelling waves at different scales. The lowest frequency
          // is the drape itself; the highest is the flutter along the hem.
          float drapeHeight(vec2 p) {
            float w1 = sin(p.x * 1.30 + uTime * 0.34) * 0.42;
            float w2 = sin(p.y * 0.85 - uTime * 0.24) * 0.30;
            float w3 = sin((p.x + p.y) * 2.10 + uTime * 0.52) * 0.11;
            // Pin the top edge, let the bottom swing free.
            float hang = smoothstep(1.0, -1.0, p.y);
            return (w1 + w2 + w3) * hang;
          }
          `,
        )
        .replace(
          "#include <beginnormal_vertex>",
          /* glsl */ `
          #include <beginnormal_vertex>

          // Central differences on the height field give exact normals.
          float e = 0.06;
          float hL = drapeHeight(position.xy - vec2(e, 0.0));
          float hR = drapeHeight(position.xy + vec2(e, 0.0));
          float hD = drapeHeight(position.xy - vec2(0.0, e));
          float hU = drapeHeight(position.xy + vec2(0.0, e));

          objectNormal = normalize(vec3(hL - hR, hD - hU, 2.0 * e));
          `,
        )
        .replace(
          "#include <begin_vertex>",
          /* glsl */ `
          #include <begin_vertex>
          transformed.z += drapeHeight(position.xy);
          `,
        );
    };

    return m;
  }, [maps]);

  useFrame((_, delta) => {
    const material = meshRef.current?.material as THREE.Material | undefined;
    const clock = material?.userData?.clock as { value: number } | undefined;
    // Clamp delta so a backgrounded tab doesn't jump the animation forward.
    if (clock) clock.value += Math.min(delta, 0.05);
  });

  return (
    <mesh ref={meshRef} rotation={[0, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[9, 6.4, 180, 128]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

