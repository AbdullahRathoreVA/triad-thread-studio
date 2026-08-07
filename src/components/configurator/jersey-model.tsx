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

/**
 * Jersey torso, hem (t=0) to shoulder line (t=1).
 *
 * A jersey is only slightly tapered — the shape that makes it read as a
 * garment is the SHOULDER YOKE above this, not the body. An earlier version
 * lofted a plain tube and stuck sleeves on the side of it, which rendered as
 * a bucket with flaps.
 */
function bodyProfile(t: number) {
  if (t > 0.9) return { rx: mix(0.98, 0.9, (t - 0.9) / 0.1), rz: 0.4 };
  if (t > 0.5) return { rx: mix(0.95, 0.98, (t - 0.5) / 0.4), rz: 0.4 };
  return { rx: mix(0.97, 0.95, t / 0.5), rz: 0.41 };
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
    const L = 2.3;
    const halfL = L / 2;

    const rings: THREE.Vector3[][] = [];

    // --- Body: hem up to the shoulder line ------------------------------
    const STEPS = 18;
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const { rx, rz } = bodyProfile(t);
      rings.push(
        section({ radial: RADIAL, rx, rz, y: -halfL + t * L, power: 2.5 }),
      );
    }

    // --- Shoulder yoke: closes the top and makes the T ------------------
    // Without this the torso is an open tube and the whole thing reads as a
    // container rather than a shirt.
    const YOKE = 7;
    for (let i = 1; i <= YOKE; i++) {
      const t = i / YOKE;
      rings.push(
        section({
          radial: RADIAL,
          // Sweeps in hard toward the neck opening.
          rx: mix(0.9, 0.29, t * t),
          rz: mix(0.4, 0.2, t * t),
          y: halfL + t * 0.3,
          power: 2.4,
        }),
      );
    }

    const bodyGeo = loft(rings, { capStart: true });

    // --- Sleeves --------------------------------------------------------
    const sleeveLength =
      appearance.sleeve === "long" ? 1.25 : appearance.sleeve === "sleeveless" ? 0.1 : 0.5;

    const buildSleeve = (side: 1 | -1) => {
      const segs = 10;
      const out: THREE.Vector3[][] = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        // Set into the shoulder and angled DOWN and out, the way a sleeve
        // actually hangs — not straight out sideways.
        const x = side * (0.78 + t * (0.42 + sleeveLength * 0.22));
        const y = halfL - 0.06 - t * sleeveLength;
        const r = mix(0.33, appearance.sleeve === "long" ? 0.17 : 0.27, t);
        out.push(
          section({ radial: RADIAL, rx: r, rz: r * 0.9, y, centreX: x, power: 2.1 }),
        );
      }
      return loft(out, { capEnd: true });
    };

    // --- Neck rib -------------------------------------------------------
    const flared = appearance.collar === "polo" || appearance.collar === "stand";
    const collarRings: THREE.Vector3[][] = [];
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      collarRings.push(
        section({
          radial: RADIAL,
          rx: mix(0.3, flared ? 0.36 : 0.31, t),
          rz: mix(0.21, flared ? 0.26 : 0.22, t),
          y: halfL + 0.3 + t * (flared ? 0.16 : 0.05),
          power: 2.4,
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
    <group ref={group} scale={0.95}>
      <mesh geometry={body} material={fabric} castShadow receiveShadow />
      <mesh geometry={sleeveL} material={fabric} castShadow />
      <mesh geometry={sleeveR} material={fabric} castShadow />
      {/* Contrast neck rib — the clearest read of the secondary colour. */}
      <mesh geometry={collarRing} material={accent} />

      {/* Hem band, sitting flush at the bottom edge of the body. */}
      <mesh material={accent} position={[0, -1.15 + 0.035, 0]}>
        <cylinderGeometry args={[0.972, 0.972, 0.07, RADIAL, 1, true]} />
      </mesh>
    </group>
  );
}
