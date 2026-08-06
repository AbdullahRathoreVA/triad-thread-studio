"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createLeatherMaps } from "@/lib/three/leather-texture";

/**
 * A jacket built from extruded pattern pieces.
 *
 * This is deliberately a *stylised* garment, not a photoreal one. A convincing
 * photoreal jacket needs a sculpted, UV-unwrapped, cloth-simulated mesh, which
 * is a 3D-artist deliverable rather than something to fake in code — pretending
 * otherwise produces the melted-mannequin look that reads as cheap instantly.
 *
 * What this DOES give, honestly and immediately:
 *   - the customer's actual leather, colour, finish and grain on a garment form
 *   - real hardware and lining materials in the right places
 *   - free rotation, so the back panel and personalisation are visible
 *
 * The `<JacketModel>` props are exactly the fields a GLTF-based replacement
 * would need, so swapping in a sculpted model later touches this file only.
 */

export type JacketAppearance = {
  leatherColour: string;
  leatherGrain: number;
  roughness: number;
  hardwareColour: string;
  liningColour: string;
  threadColour: string;
  /** Silhouette shifts by style — cropped biker vs. long coat. */
  bodyLength: number;
  /** 0 = slim, 1 = oversized. */
  looseness: number;
};

/** Rounded-rectangle helper — every pattern piece is built from these. */
function panelShape(
  width: number,
  height: number,
  radius: number,
  taper = 0,
): THREE.Shape {
  const w = width / 2;
  const h = height / 2;
  const s = new THREE.Shape();
  const tw = w - taper;

  s.moveTo(-w + radius, h);
  s.lineTo(w - radius, h);
  s.quadraticCurveTo(w, h, w, h - radius);
  s.lineTo(tw, -h + radius);
  s.quadraticCurveTo(tw, -h, tw - radius, -h);
  s.lineTo(-tw + radius, -h);
  s.quadraticCurveTo(-tw, -h, -tw, -h + radius);
  s.lineTo(-w, h - radius);
  s.quadraticCurveTo(-w, h, -w + radius, h);
  return s;
}

const EXTRUDE = {
  depth: 0.34,
  bevelEnabled: true,
  bevelThickness: 0.07,
  bevelSize: 0.07,
  bevelSegments: 4,
  curveSegments: 18,
};

export function JacketModel({
  appearance,
  autoRotate = true,
}: {
  appearance: JacketAppearance;
  autoRotate?: boolean;
}) {
  const group = useRef<THREE.Group>(null);

  const leatherMaterial = useMemo(() => {
    const maps = createLeatherMaps({
      color: appearance.leatherColour,
      grain: appearance.leatherGrain,
      roughness: appearance.roughness,
      relief: 2.4,
    });

    // Pattern pieces are small, so the grain must repeat densely or it reads
    // as a painted-on photo rather than a material.
    for (const t of [maps.map, maps.normalMap, maps.roughnessMap]) {
      t.repeat.set(2.4, 2.4);
    }

    return new THREE.MeshPhysicalMaterial({
      map: maps.map,
      normalMap: maps.normalMap,
      roughnessMap: maps.roughnessMap,
      normalScale: new THREE.Vector2(1.1, 1.1),
      roughness: 1,
      metalness: 0.05,
      clearcoat: 1 - appearance.roughness * 0.75,
      clearcoatRoughness: 0.4,
      sheen: 0.4,
      sheenColor: new THREE.Color("#b79976"),
    });
  }, [appearance.leatherColour, appearance.leatherGrain, appearance.roughness]);

  const hardwareMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: appearance.hardwareColour,
        metalness: 0.95,
        roughness: 0.22,
      }),
    [appearance.hardwareColour],
  );

  const liningMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: appearance.liningColour,
        roughness: 0.72,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    [appearance.liningColour],
  );

  const threadMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: appearance.threadColour,
        roughness: 0.85,
      }),
    [appearance.threadColour],
  );

  const { bodyGeo, sleeveGeo, collarGeo } = useMemo(() => {
    const width = 2.0 + appearance.looseness * 0.42;
    const height = appearance.bodyLength;

    return {
      bodyGeo: new THREE.ExtrudeGeometry(
        panelShape(width, height, 0.16, 0.1 - appearance.looseness * 0.1),
        EXTRUDE,
      ),
      sleeveGeo: new THREE.ExtrudeGeometry(
        panelShape(0.56 + appearance.looseness * 0.14, height * 0.94, 0.2, 0.1),
        { ...EXTRUDE, depth: 0.3 },
      ),
      collarGeo: new THREE.ExtrudeGeometry(panelShape(1.15, 0.34, 0.1), {
        ...EXTRUDE,
        depth: 0.26,
      }),
    };
  }, [appearance.bodyLength, appearance.looseness]);

  useFrame((state, delta) => {
    if (!group.current) return;
    if (autoRotate) {
      group.current.rotation.y += delta * 0.24;
    }
    // Gentle bob so a paused model never looks frozen.
    group.current.position.y =
      Math.sin(state.clock.elapsedTime * 0.6) * 0.035 - 0.1;
  });

  const halfW = 1.0 + appearance.looseness * 0.21;

  return (
    <group ref={group} scale={0.92}>
      {/* Lining sits just behind the shell and is visible through the opening. */}
      <mesh geometry={bodyGeo} material={liningMaterial} position={[0, 0, -0.06]} scale={[0.94, 0.97, 1]} />

      {/* Front shell, split into two panels so the jacket reads as "open". */}
      <mesh
        geometry={bodyGeo}
        material={leatherMaterial}
        position={[-halfW * 0.52, 0, 0.02]}
        scale={[0.52, 1, 1]}
        rotation={[0, 0.06, 0.012]}
        castShadow
      />
      <mesh
        geometry={bodyGeo}
        material={leatherMaterial}
        position={[halfW * 0.52, 0, 0.02]}
        scale={[0.52, 1, 1]}
        rotation={[0, -0.06, -0.012]}
        castShadow
      />

      {/* Back panel */}
      <mesh
        geometry={bodyGeo}
        material={leatherMaterial}
        position={[0, 0, -0.34]}
        castShadow
      />

      {/* Sleeves, angled out from the shoulder line. */}
      <mesh
        geometry={sleeveGeo}
        material={leatherMaterial}
        position={[-halfW - 0.24, -0.16, -0.14]}
        rotation={[0, 0, 0.14]}
        castShadow
      />
      <mesh
        geometry={sleeveGeo}
        material={leatherMaterial}
        position={[halfW + 0.24, -0.16, -0.14]}
        rotation={[0, 0, -0.14]}
        castShadow
      />

      {/* Collar */}
      <mesh
        geometry={collarGeo}
        material={leatherMaterial}
        position={[0, appearance.bodyLength / 2 + 0.08, -0.1]}
        rotation={[0.3, 0, 0]}
      />

      {/* Centre zip tape + pull */}
      <mesh material={hardwareMaterial} position={[0, 0, 0.2]}>
        <boxGeometry args={[0.055, appearance.bodyLength * 0.94, 0.03]} />
      </mesh>
      <mesh material={hardwareMaterial} position={[0, -appearance.bodyLength * 0.34, 0.24]}>
        <boxGeometry args={[0.1, 0.2, 0.05]} />
      </mesh>

      {/* Contrast topstitching down both front edges. */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          material={threadMaterial}
          position={[side * halfW * 0.55, 0, 0.19]}
        >
          <boxGeometry args={[0.016, appearance.bodyLength * 0.88, 0.012]} />
        </mesh>
      ))}

      {/* Shoulder hardware — reads as snaps/epaulettes at a glance. */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          material={hardwareMaterial}
          position={[side * halfW * 0.62, appearance.bodyLength / 2 - 0.18, 0.16]}
        >
          <cylinderGeometry args={[0.045, 0.045, 0.03, 16]} />
        </mesh>
      ))}
    </group>
  );
}
