"use client";

import { useRef, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { View, Environment, Lightformer, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { JacketModel } from "@/components/configurator/jacket-model";
import { JerseyModel } from "@/components/configurator/jersey-model";
import { useWebGLSupport, useReducedMotion } from "@/hooks/use-environment";

/**
 * Product imagery, rendered rather than photographed.
 *
 * A grid of product cards cannot each own a `<Canvas>` — browsers cap live
 * WebGL contexts at roughly 8–16 and silently kill the oldest, so a 12-product
 * collection would start blanking cards. drei's `<View>` solves exactly this:
 * every card declares a viewport, and a single renderer draws them all in one
 * frame with scissor testing.
 *
 * The point is not to avoid work — it is that these renders are the studio's
 * own product, generated from the same geometry and materials the configurator
 * uses. No stock library, no licensing risk, and the image always matches what
 * the customer can actually order.
 */

/** Wrap a page containing <ProductRender> cards in this. Mount once. */
export function ProductRenderRoot({ children }: { children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const supported = useWebGLSupport();

  return (
    <div ref={container} className="relative">
      {children}

      {supported && (
        <Canvas
          eventSource={container as React.RefObject<HTMLElement>}
          className="pointer-events-none !fixed inset-0 z-0"
          dpr={[1, 1.5]}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.1,
          }}
        >
          <View.Port />
        </Canvas>
      )}
    </div>
  );
}

/** Compact studio rig. Built locally — no CDN HDRI fetch. */
function CardRig() {
  return (
    <Environment resolution={128} frames={1}>
      <Lightformer form="rect" intensity={3.4} color="#fff4e6" position={[-3, 2.6, 3.4]} scale={[5, 4, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={4} color="#b79976" position={[3.8, 0.4, 2]} scale={[2, 5, 1]} target={[0, 0, 0]} />
      <Lightformer form="ring" intensity={0.6} color="#4a4238" position={[0, 4, -2]} scale={[7, 7, 1]} />
    </Environment>
  );
}

export type RenderSpec =
  | {
      kind: "jacket";
      leatherColour: string;
      leatherGrain?: number;
      roughness?: number;
      hardwareColour?: string;
      liningColour?: string;
      threadColour?: string;
      bodyLength?: number;
      looseness?: number;
    }
  | {
      kind: "jersey";
      primaryColour: string;
      secondaryColour?: string;
      sleeve?: string;
      collar?: string;
    };

/**
 * One product's viewport. Must sit inside a <ProductRenderRoot>.
 * Falls back to a material-coloured panel when WebGL is unavailable.
 */
export function ProductRender({
  spec,
  className,
}: {
  spec: RenderSpec;
  className?: string;
}) {
  const supported = useWebGLSupport();
  const reducedMotion = useReducedMotion();

  const fallbackColour =
    spec.kind === "jacket" ? spec.leatherColour : spec.primaryColour;

  if (!supported) {
    return (
      <div
        aria-hidden="true"
        className={`grain ${className ?? ""}`}
        style={{
          background: `radial-gradient(70% 70% at 50% 35%, ${fallbackColour} 0%, #150905 60%, #0a0a0a 100%)`,
        }}
      />
    );
  }

  return (
    <View className={className}>
      <PerspectiveCamera makeDefault position={[0, 0.1, 5.2]} fov={34} />
      <CardRig />

      {spec.kind === "jacket" ? (
        <JacketModel
          autoRotate={!reducedMotion}
          appearance={{
            leatherColour: spec.leatherColour,
            leatherGrain: spec.leatherGrain ?? 26,
            roughness: spec.roughness ?? 0.58,
            hardwareColour: spec.hardwareColour ?? "#4a4d52",
            liningColour: spec.liningColour ?? "#1a1a1a",
            threadColour: spec.threadColour ?? spec.leatherColour,
            bodyLength: spec.bodyLength ?? 2.6,
            looseness: spec.looseness ?? 0.2,
          }}
        />
      ) : (
        <JerseyModel
          autoRotate={!reducedMotion}
          appearance={{
            primaryColour: spec.primaryColour,
            secondaryColour: spec.secondaryColour ?? "#f2eee7",
            fabricWeave: 5,
            mesh: false,
            sleeve: spec.sleeve ?? "short",
            collar: spec.collar ?? "crew",
          }}
        />
      )}
    </View>
  );
}
