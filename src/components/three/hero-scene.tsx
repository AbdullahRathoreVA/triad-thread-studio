"use client";

import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, AdaptiveDpr } from "@react-three/drei";
import * as THREE from "three";
import { LeatherDrape } from "./leather-drape";
import { Motes } from "./motes";
import {
  useReducedMotion,
  useWebGLSupport,
  useDeviceTier,
} from "@/hooks/use-environment";

/** Camera drifts toward the pointer. Damped, so it never snaps. */
function CameraRig() {
  const { camera, pointer } = useThree();
  const target = useRef(new THREE.Vector3(0, 0, 6.2));

  useFrame((_, delta) => {
    // Small amplitude on purpose: a hero that lurches with the mouse is
    // nauseating and hides the product.
    target.current.set(pointer.x * 0.55, pointer.y * 0.35, 6.2);
    camera.position.lerp(target.current, Math.min(delta * 1.8, 1));
    camera.lookAt(0, 0, 0);
  });

  return null;
}

/**
 * Studio lighting rig, built entirely from Lightformers.
 *
 * Deliberately NOT using drei's `<Environment preset="…">` — those fetch HDRI
 * files from a third-party CDN at runtime, which breaks the strict CSP, adds a
 * blocking network dependency, and would fail offline. Lightformers build the
 * environment map locally on the GPU with no requests at all.
 */
function StudioRig() {
  return (
    <Environment resolution={256} frames={1}>
      {/* Key: broad soft box, upper left. */}
      <Lightformer
        form="rect"
        intensity={3.2}
        color="#fff4e2"
        position={[-4, 3.4, 3.5]}
        scale={[7, 5, 1]}
        target={[0, 0, 0]}
      />
      {/* Warm gold rim, raking from the right — this is what makes the
          grain read as leather rather than as flat brown. */}
      <Lightformer
        form="rect"
        intensity={5.4}
        color="#b79976"
        position={[5.2, 0.4, 1.6]}
        scale={[2.2, 7, 1]}
        target={[0, 0, 0]}
      />
      {/* Cool silver kicker, low left — echoes the needle in the logo. */}
      <Lightformer
        form="rect"
        intensity={1.5}
        color="#d8dadd"
        position={[-3.4, -3, 2]}
        scale={[4, 2, 1]}
        target={[0, 0, 0]}
      />
      {/* Overhead ambient wash, keeps the shadow side from going pure black. */}
      <Lightformer
        form="ring"
        intensity={0.7}
        color="#4a4238"
        position={[0, 5.5, -2]}
        scale={[9, 9, 1]}
      />
    </Environment>
  );
}

function Scene({ quality }: { quality: "high" | "low" }) {
  return (
    <>
      <CameraRig />
      <StudioRig />

      <LeatherDrape color="#45271a" grain={quality === "high" ? 24 : 34} />

      {/* Contact spot grounds the panel against the background. */}
      <spotLight
        position={[0, 4, 5]}
        angle={0.7}
        penumbra={1}
        intensity={22}
        color="#e0cdb2"
        distance={16}
      />

      {quality === "high" && <Motes count={90} />}
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * Static fallback used for reduced-motion, no-WebGL and low-power devices.
 * Not a blank box — it carries the same gradient and grain so the layout and
 * mood survive intact.
 */
function StaticBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="grain absolute inset-0"
      style={{
        background:
          "radial-gradient(120% 90% at 68% 38%, #5c3a26 0%, #341c11 34%, #150905 62%, #0a0a0a 100%)",
      }}
    />
  );
}

export function HeroScene() {
  // All three are read from external stores during render, so the correct
  // branch is chosen on the first pass instead of after a mount effect.
  const reducedMotion = useReducedMotion();
  const webgl = useWebGLSupport();
  const tier = useDeviceTier();

  // Context loss is a genuine event, so this one stays as state.
  const [contextLost, setContextLost] = useState(false);

  const mode = reducedMotion || !webgl || contextLost ? "static" : tier;

  if (mode === "static") return <StaticBackdrop />;

  return (
    <div className="absolute inset-0">
      <StaticBackdrop />
      <Canvas
        className="!absolute inset-0"
        camera={{ position: [0, 0, 6.2], fov: 34 }}
        // Capping DPR at 1.75 costs almost nothing visually and saves ~40% of
        // fragment work on 3× phone screens.
        dpr={mode === "high" ? [1, 1.75] : [1, 1.25]}
        gl={{
          antialias: mode === "high",
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        onCreated={({ gl }) => {
          // A lost context leaves a permanently blank canvas. Fall back to the
          // static backdrop rather than showing a black hole where the hero was.
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            setContextLost(true);
          });
        }}
      >
        <Suspense fallback={null}>
          <Scene quality={mode} />
        </Suspense>
      </Canvas>
    </div>
  );
}
