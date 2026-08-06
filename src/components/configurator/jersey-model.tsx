"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createFabricMaps } from "@/lib/three/leather-texture";
import { loft, section, mix } from "@/lib/three/loft";

/**
 * A sublimated jersey, lofted from cross-sections like the jacket but with a
 * completely different silhouette: straighter through the body, wider at the
 * hem, no lapels or hardware, and set-in sleeves that stand away from the
 * torso rather than hanging.
 *
 * The material matters as much as the shape here — a jersey rendered with a
 * leather shader reads as plastic, so this uses the woven fabric generator.
 */

export type JerseyAppearance = {
  primaryColour: string;
  secondaryColour: string;
  fabricWeave: number;
  mesh: boolean;
  /** "short" | "long" | "sleeveless" */
  sleeve: string;
  /** "crew" | "v-neck" | "polo" | "stand" */
  collar: string;
  /** Number printed on the back, if any. */
  number?: string;
};

const RADIAL = 44;

/** Jersey torso: broad shoulders, minimal waist suppression, released hem. */
function bodyProfile(t: number) {
  // t: 0 = hem, 1 = shoulder
  if (t > 0.88) return { rx: mix(1.06, 0.94, (t - 0.88) / 0.12), rz: 0.5 };
  if (t > 0.55) return { rx: mix(1.0, 1.06, (t - 0.55) / 0.33), rz: 0.48 };
  return { rx: mix(1.04, 1.0, t / 0.55), rz: 0.47 };
}

export function JerseyModel({
  appearance,
  autoRotate = true,
}: {
  appearance: JerseyAppearance;
}
& { autoRotate?: boolean }) {
  const group = useRef<THREE.Group>(null);

  const fabric = useMemo(() => {
    const maps = createFabricMaps({
      color: appearance.primaryColour,
      weave: appearance.fabricWeave,
      mesh: appearance.mesh,
    });
    for (const t of [maps.map, maps.normalMap, maps.roughnessMap]) {
      t.repeat.set(6, 6);
    }
    return new THREE.MeshPhysicalMaterial({
      map: maps.map,
      normalMap: maps.normalMap,
      roughnessMap: maps.roughnessMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: 1,
      metalness: 0,
      // Technical knits are matte with a faint sheen along the thread, never
      // a clearcoat — that is what makes CG fabric look like vinyl.
      sheen: 0.6,
      sheenColor: new THREE.Color("#ffffff"),
      sheenRoughness: 0.85,
      side: THREE.DoubleSide,
    });
  }, [appearance.primaryColour, appearance.fabricWeave, appearance.mesh]);

  const accent = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: appearance.secondaryColour,
        roughness: 0.88,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    [appearance.secondaryColour],
  );

  const { body, sleeveL, sleeveR, collarRing } = useMemo(() => {
    const L = 2.5;
    const halfL = L / 2;

    const rings: THREE.Vector3[][] = [];
    const STEPS = 22;
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const { rx, rz } = bodyProfile(t);
      rings.push(
        section({ radial: RADIAL, rx, rz, y: -halfL + t * L, power: mix(2.3, 2.7, t) }),
      );
    }
    const bodyGeo = loft(rings, { capStart: true });

    const sleeveLength =
      appearance.sleeve === "long" ? 1.5 : appearance.sleeve === "sleeveless" ? 0.16 : 0.62;

    const buildSleeve = (side: 1 | -1) => {
      const segs = 10;
      const out: THREE.Vector3[][] = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        // Set-in sleeves stand out from the shoulder before dropping.
        const x = side * (0.96 + t * (appearance.sleeve === "long" ? 0.5 : 0.32));
        const y = halfL - 0.2 - t * sleeveLength;
        const r = mix(0.34, appearance.sleeve === "long" ? 0.19 : 0.29, t);
        out.push(
          section({ radial: RADIAL, rx: r, rz: r * 0.95, y, centreX: x, power: 2.1 }),
        );
      }
      return loft(out, { capEnd: appearance.sleeve === "sleeveless" });
    };

    // Neck rib — a shallow band, flared for polo/stand collars.
    const collarHeight = appearance.collar === "polo" || appearance.collar === "stand" ? 0.2 : 0.07;
    const collarRings: THREE.Vector3[][] = [];
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      collarRings.push(
        section({
          radial: RADIAL,
          rx: mix(0.42, appearance.collar === "polo" ? 0.5 : 0.44, t),
          rz: mix(0.3, appearance.collar === "polo" ? 0.36 : 0.31, t),
          y: halfL + t * collarHeight,
          power: 2.5,
        }),
      );
    }

    return {
      body: bodyGeo,
      sleeveL: buildSleeve(-1),
      sleeveR: buildSleeve(1),
      collarRing: loft(collarRings),
    };
  }, [appearance.sleeve, appearance.collar]);

  useFrame((state, delta) => {
    if (!group.current) return;
    if (autoRotate) group.current.rotation.y += delta * 0.22;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.55) * 0.03;
  });

  return (
    <group ref={group} scale={0.82}>
      <mesh geometry={body} material={fabric} castShadow receiveShadow />
      <mesh geometry={sleeveL} material={fabric} castShadow />
      <mesh geometry={sleeveR} material={fabric} castShadow />
      {/* Contrast neck rib — the clearest read of the secondary colour. */}
      <mesh geometry={collarRing} material={accent} />

      {/* Contrast sleeve cuffs */}
      {appearance.sleeve !== "sleeveless" &&
        [-1, 1].map((side) => (
          <mesh
            key={side}
            material={accent}
            position={[
              side * (0.96 + (appearance.sleeve === "long" ? 0.5 : 0.32)),
              1.25 - 0.2 - (appearance.sleeve === "long" ? 1.5 : 0.62),
              0,
            ]}
            rotation={[0, 0, 0]}
          >
            <cylinderGeometry
              args={[
                appearance.sleeve === "long" ? 0.2 : 0.3,
                appearance.sleeve === "long" ? 0.195 : 0.295,
                0.09,
                RADIAL,
                1,
                true,
              ]}
            />
          </mesh>
        ))}

      {/* Hem band */}
      <mesh material={accent} position={[0, -1.25 - 0.03, 0]}>
        <cylinderGeometry args={[1.045, 1.045, 0.07, RADIAL, 1, true]} />
      </mesh>
    </group>
  );
}
