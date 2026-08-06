"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { JacketModel, type JacketAppearance } from "./jacket-model";
import { JerseyModel, type JerseyAppearance } from "./jersey-model";
import { useWebGLSupport } from "@/hooks/use-environment";
import type { ProductType } from "@/config/configurator";

/** Same locally-built studio rig as the hero — no remote HDRI fetch. */
function StudioRig() {
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer form="rect" intensity={3.4} color="#fff6e8" position={[-3.6, 3, 4]} scale={[6, 5, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={4.2} color="#b79976" position={[4.4, 0.6, 2.4]} scale={[2, 6, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={1.6} color="#d8dadd" position={[-3, -2.6, 2.4]} scale={[4, 2, 1]} target={[0, 0, 0]} />
      <Lightformer form="ring" intensity={0.55} color="#4a4238" position={[0, 5, -3]} scale={[8, 8, 1]} />
    </Environment>
  );
}

function StaticPreview({ colour }: { colour: string }) {
  return (
    <div
      className="grain absolute inset-0 grid place-items-center"
      style={{
        background: `radial-gradient(70% 70% at 50% 40%, ${colour} 0%, #150905 55%, #0a0a0a 100%)`,
      }}
    >
      <p className="max-w-xs px-8 text-center text-[0.78rem] leading-relaxed text-ink-400">
        3D preview is unavailable on this device. Your specification and price
        are still calculated exactly the same.
      </p>
    </div>
  );
}

export function ConfiguratorPreview({
  productType,
  appearance,
  jerseyAppearance,
  autoRotate,
}: {
  productType: ProductType;
  appearance: JacketAppearance;
  jerseyAppearance: JerseyAppearance;
  autoRotate: boolean;
}) {
  // Reduced-motion users still get the 3D model — it is the product itself,
  // not decoration. Only the auto-rotation is suppressed, by the caller.
  const supported = useWebGLSupport();

  if (!supported) {
    return (
      <StaticPreview
        colour={
          productType === "jersey"
            ? jerseyAppearance.primaryColour
            : appearance.leatherColour
        }
      />
    );
  }

  return (
    <Canvas
      className="absolute inset-0"
      camera={{ position: [0, 0.1, 4.6], fov: 38 }}
      dpr={[1, 1.75]}
      shadows
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
    >
      <Suspense fallback={null}>
        <StudioRig />
        {productType === "jersey" ? (
          <JerseyModel appearance={jerseyAppearance} autoRotate={autoRotate} />
        ) : (
          <JacketModel appearance={appearance} autoRotate={autoRotate} />
        )}
        <ContactShadows
          position={[0, -1.75, 0]}
          opacity={0.55}
          scale={7}
          blur={2.6}
          far={3}
          color="#000000"
        />
        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={3}
          maxDistance={7}
          // Stop the customer tumbling under the floor or over the top, which
          // instantly breaks the illusion of a studio shot.
          minPolarAngle={Math.PI * 0.22}
          maxPolarAngle={Math.PI * 0.72}
          dampingFactor={0.08}
          enableDamping
        />
      </Suspense>
    </Canvas>
  );
}
