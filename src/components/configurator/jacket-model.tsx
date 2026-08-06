"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createLeatherMaps } from "@/lib/three/leather-texture";
import { loft, section, mix } from "@/lib/three/loft";

/**
 * A jacket lofted from cross-sections.
 *
 * The torso is a closed tapering tube built from ~24 horizontal rings —
 * shoulders wide, chest full, waist drawn in, hem released — so it has real
 * volume and reads as a garment from any angle. Sleeves are separate tapered
 * lofts set into the shoulder line.
 *
 * This is still a stylised garment, not a photoreal one: a convincing
 * photoreal jacket needs a sculpted, cloth-simulated GLTF from a 3D artist.
 * The props below are exactly what such a model would need, so swapping one in
 * later touches only this file.
 */

export type JacketAppearance = {
  leatherColour: string;
  leatherGrain: number;
  roughness: number;
  hardwareColour: string;
  liningColour: string;
  threadColour: string;
  /** Overall body length in world units. */
  bodyLength: number;
  /** 0 = slim, 1 = oversized. */
  looseness: number;
};

const RADIAL = 48;

/** Torso profile: half-width and half-depth at a normalised height t (0 hem → 1 shoulder). */
function torsoProfile(t: number, looseness: number) {
  const ease = looseness * 0.34;

  // Shoulder → chest → waist → hem, with the waist suppression easing out
  // as the fit gets looser.
  let rx: number;
  if (t > 0.86) rx = mix(1.04, 0.9, (t - 0.86) / 0.14); // shoulder cap rolls in
  else if (t > 0.62) rx = mix(0.99, 1.04, (t - 0.62) / 0.24); // chest
  else if (t > 0.3) rx = mix(0.86 + ease * 0.5, 0.99, (t - 0.3) / 0.32); // waist
  else rx = mix(0.95, 0.86 + ease * 0.5, t / 0.3); // hem release

  const rz = rx * mix(0.44, 0.5, looseness);
  return { rx: rx + ease, rz: rz + ease * 0.45 };
}

export function JacketModel({
  appearance,
  autoRotate = true,
}: {
  appearance: JacketAppearance;
  autoRotate?: boolean;
}) {
  const group = useRef<THREE.Group>(null);

  const leather = useMemo(() => {
    const maps = createLeatherMaps({
      color: appearance.leatherColour,
      grain: appearance.leatherGrain,
      roughness: appearance.roughness,
      relief: 2.5,
    });
    for (const t of [maps.map, maps.normalMap, maps.roughnessMap]) {
      t.repeat.set(3, 3);
    }
    return new THREE.MeshPhysicalMaterial({
      map: maps.map,
      normalMap: maps.normalMap,
      roughnessMap: maps.roughnessMap,
      normalScale: new THREE.Vector2(0.9, 0.9),
      roughness: 1,
      metalness: 0.04,
      // Patent finishes get a hard clearcoat; suede gets almost none.
      clearcoat: Math.max(0, 1 - appearance.roughness * 1.1),
      clearcoatRoughness: 0.35,
      sheen: 0.35,
      sheenColor: new THREE.Color("#b79976"),
      sheenRoughness: 0.65,
      side: THREE.DoubleSide,
    });
  }, [appearance.leatherColour, appearance.leatherGrain, appearance.roughness]);

  const hardware = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: appearance.hardwareColour,
        metalness: 0.96,
        roughness: 0.2,
      }),
    [appearance.hardwareColour],
  );

  const lining = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: appearance.liningColour,
        roughness: 0.8,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    [appearance.liningColour],
  );

  const thread = useMemo(
    () => new THREE.MeshStandardMaterial({ color: appearance.threadColour, roughness: 0.9 }),
    [appearance.threadColour],
  );

  const { torso, collar, sleeveL, sleeveR, lapel, hem } = useMemo(() => {
    const { bodyLength: L, looseness } = appearance;
    const halfL = L / 2;

    // ---- Torso ----------------------------------------------------------
    const STEPS = 26;
    const torsoRings: THREE.Vector3[][] = [];
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS; // 0 = hem, 1 = shoulder
      const { rx, rz } = torsoProfile(t, looseness);
      torsoRings.push(
        section({
          radial: RADIAL,
          rx,
          rz,
          y: -halfL + t * L,
          // Flatter front/back panels near the chest, rounder at the hem.
          power: mix(2.2, 2.8, t),
        }),
      );
    }
    const torsoGeo = loft(torsoRings, { capStart: true });

    // ---- Collar ---------------------------------------------------------
    // A short flared band rising from the neck opening.
    const collarRings: THREE.Vector3[][] = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      collarRings.push(
        section({
          radial: RADIAL,
          rx: mix(0.62, 0.78, t),
          rz: mix(0.3, 0.4, t),
          y: halfL + t * 0.26,
          power: 2.6,
        }),
      );
    }
    const collarGeo = loft(collarRings);

    // ---- Sleeves --------------------------------------------------------
    // Lofted along an arc from the shoulder, tapering to the cuff.
    const buildSleeve = (side: 1 | -1) => {
      const rings: THREE.Vector3[][] = [];
      const SEG = 16;
      const shoulderX = side * (0.92 + looseness * 0.3);
      const shoulderY = halfL - 0.12;

      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG;
        // Slight outward then downward sweep — a hanging sleeve, not a plank.
        const x = shoulderX + side * (0.28 * Math.sin(t * 1.15));
        const y = shoulderY - t * (L * 0.86);
        const z = Math.sin(t * 2.2) * 0.07;
        const r = mix(0.3 + looseness * 0.08, 0.155 + looseness * 0.05, t);

        rings.push(
          section({
            radial: RADIAL,
            rx: r,
            rz: r * 0.92,
            y,
            centreX: x,
            centreZ: z,
            power: 2.2,
          }),
        );
      }
      return loft(rings, { capEnd: true });
    };

    // ---- Lapels ---------------------------------------------------------
    // A lapel genuinely IS a flat folded panel, so an extruded outline is the
    // right primitive here — unlike the body, which needed lofting.
    const lapelShape = new THREE.Shape();
    lapelShape.moveTo(0, 0);
    lapelShape.lineTo(0.34, 0.06);
    lapelShape.lineTo(0.42, -0.34); // notch point
    lapelShape.lineTo(0.2, -0.42);
    lapelShape.lineTo(0.05, -0.9); // tapers down the chest
    lapelShape.lineTo(-0.04, -0.86);
    lapelShape.closePath();

    const lapelGeo = new THREE.ExtrudeGeometry(lapelShape, {
      depth: 0.035,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 2,
      curveSegments: 6,
    });

    // ---- Hem band -------------------------------------------------------
    const hemRings: THREE.Vector3[][] = [];
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      const { rx, rz } = torsoProfile(0, looseness);
      hemRings.push(
        section({
          radial: RADIAL,
          rx: rx * mix(1.012, 0.975, t),
          rz: rz * mix(1.012, 0.975, t),
          y: -halfL - 0.16 + t * 0.17,
          power: 2.6,
        }),
      );
    }
    const hemGeo = loft(hemRings, { capStart: true });

    return {
      torso: torsoGeo,
      collar: collarGeo,
      sleeveL: buildSleeve(-1),
      sleeveR: buildSleeve(1),
      lapel: lapelGeo,
      hem: hemGeo,
    };
  }, [appearance]);

  useFrame((state, delta) => {
    if (!group.current) return;
    if (autoRotate) group.current.rotation.y += delta * 0.22;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.55) * 0.03;
  });

  const halfL = appearance.bodyLength / 2;

  return (
    <group ref={group} scale={0.78}>
      <mesh geometry={torso} material={leather} castShadow receiveShadow />
      <mesh geometry={collar} material={leather} castShadow />
      <mesh geometry={sleeveL} material={leather} castShadow />
      <mesh geometry={sleeveR} material={leather} castShadow />
      <mesh geometry={hem} material={leather} castShadow />

      {/* Notch lapels, mirrored and folded back off the chest. This is the
          single detail that most makes a jacket read as a jacket. */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          geometry={lapel}
          material={leather}
          position={[side * 0.16, halfL - 0.06, 0.38]}
          rotation={[0.12, side * -0.42, side * 0.08]}
          scale={[side, 1, 1]}
          castShadow
        />
      ))}

      {/* Cuffs */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          material={leather}
          position={[
            side * (0.92 + appearance.looseness * 0.3 + 0.25),
            halfL - 0.12 - appearance.bodyLength * 0.84,
            0.05,
          ]}
        >
          <cylinderGeometry
            args={[
              0.175 + appearance.looseness * 0.05,
              0.165 + appearance.looseness * 0.05,
              0.13,
              28,
              1,
              true,
            ]}
          />
        </mesh>
      ))}

      {/* Chest and hip pocket zips — small, but their absence is conspicuous. */}
      {[
        { x: 0.42, y: 0.18, len: 0.3, rot: 0.5 },
        { x: -0.42, y: 0.18, len: 0.3, rot: -0.5 },
        { x: 0.5, y: -halfL * 0.45, len: 0.36, rot: 0.35 },
        { x: -0.5, y: -halfL * 0.45, len: 0.36, rot: -0.35 },
      ].map((p, i) => (
        <mesh
          key={i}
          material={hardware}
          position={[p.x, p.y, 0.42]}
          rotation={[0, 0, p.rot]}
        >
          <boxGeometry args={[0.022, p.len, 0.016]} />
        </mesh>
      ))}

      {/* Lining visible through the neck opening. */}
      <mesh material={lining} position={[0, halfL - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 32]} />
      </mesh>

      {/* Centre-front zip tape, sitting proud of the shell. */}
      <mesh material={hardware} position={[0, -0.05, 0.47]}>
        <boxGeometry args={[0.05, appearance.bodyLength * 0.94, 0.035]} />
      </mesh>
      {/* Zip pull */}
      <mesh material={hardware} position={[0, -halfL * 0.55, 0.5]}>
        <boxGeometry args={[0.085, 0.17, 0.045]} />
      </mesh>

      {/* Contrast topstitching flanking the zip. */}
      {[-1, 1].map((side) => (
        <mesh key={side} material={thread} position={[side * 0.11, -0.05, 0.46]}>
          <boxGeometry args={[0.014, appearance.bodyLength * 0.88, 0.012]} />
        </mesh>
      ))}

      {/* Shoulder snaps. */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          material={hardware}
          position={[side * 0.55, halfL - 0.06, 0.3]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.042, 0.042, 0.03, 16]} />
        </mesh>
      ))}
    </group>
  );
}
