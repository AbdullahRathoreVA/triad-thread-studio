import * as THREE from "three";

/**
 * Surface lofting — builds a mesh by stitching a stack of closed cross-section
 * rings together.
 *
 * This replaces the earlier approach of extruding flat 2D pattern shapes,
 * which produced exactly what it sounds like: rigid slabs floating in space
 * with no volume. A garment is a tapering tube, so the honest primitive is a
 * loft, not an extrusion.
 *
 * Every ring must contain the same number of points, ordered consistently
 * around the section.
 */
export function loft(
  rings: THREE.Vector3[][],
  { capStart = false, capEnd = false } = {},
): THREE.BufferGeometry {
  if (rings.length < 2) throw new Error("loft needs at least two rings");

  const radial = rings[0].length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r];
    for (let i = 0; i < radial; i++) {
      positions.push(ring[i].x, ring[i].y, ring[i].z);
      uvs.push(i / radial, r / (rings.length - 1));
    }
  }

  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < radial; i++) {
      const next = (i + 1) % radial;
      const a = r * radial + i;
      const b = r * radial + next;
      const c = (r + 1) * radial + i;
      const d = (r + 1) * radial + next;
      indices.push(a, c, b, b, c, d);
    }
  }

  // Caps are simple fans to a centroid — enough for a hem or a cuff, which
  // are only ever seen at a glancing angle.
  const addCap = (ring: THREE.Vector3[], flip: boolean) => {
    const centre = ring
      .reduce((acc, p) => acc.add(p), new THREE.Vector3())
      .divideScalar(ring.length);

    const centreIndex = positions.length / 3;
    positions.push(centre.x, centre.y, centre.z);
    uvs.push(0.5, 0.5);

    const base = positions.length / 3;
    for (const p of ring) {
      positions.push(p.x, p.y, p.z);
      uvs.push(0.5, 0.5);
    }

    for (let i = 0; i < ring.length; i++) {
      const next = (i + 1) % ring.length;
      if (flip) indices.push(centreIndex, base + next, base + i);
      else indices.push(centreIndex, base + i, base + next);
    }
  };

  if (capStart) addCap(rings[0], true);
  if (capEnd) addCap(rings[rings.length - 1], false);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A closed cross-section: a superellipse, which gives a body-like rounded
 * rectangle rather than a pure oval. `power` controls the flatness of the
 * front and back panels.
 */
export function section({
  radial,
  rx,
  rz,
  y,
  power = 2.4,
  centreX = 0,
  centreZ = 0,
}: {
  radial: number;
  rx: number;
  rz: number;
  y: number;
  power?: number;
  centreX?: number;
  centreZ?: number;
}): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < radial; i++) {
    const t = (i / radial) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    // Superellipse: |x/a|^n + |z/b|^n = 1
    const sx = Math.sign(c) * Math.pow(Math.abs(c), 2 / power);
    const sz = Math.sign(s) * Math.pow(Math.abs(s), 2 / power);
    points.push(new THREE.Vector3(centreX + sx * rx, y, centreZ + sz * rz));
  }
  return points;
}

/** Smoothstep between two values. */
export function mix(a: number, b: number, t: number): number {
  const k = Math.max(0, Math.min(1, t));
  return a + (b - a) * (k * k * (3 - 2 * k));
}

/**
 * A tube swept along an arbitrary path.
 *
 * `section()` always builds its ring in the horizontal plane, which is correct
 * for a torso but wrong for anything diagonal: on a sleeve that runs down and
 * outward, consecutive horizontal rings shear past each other and the result
 * renders as a flat ribbon rather than a limb. This builds each ring on a
 * frame perpendicular to the local path direction, so the cross-section stays
 * circular whichever way the path turns.
 */
export function tube(
  points: THREE.Vector3[],
  radiusAt: (t: number) => number,
  radial = 24,
  flatten = 0.92,
): THREE.BufferGeometry {
  const rings: THREE.Vector3[][] = [];
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < points.length; i++) {
    const t = i / (points.length - 1);

    const tangent = (
      i === 0
        ? points[1].clone().sub(points[0])
        : points[i].clone().sub(points[i - 1])
    ).normalize();

    // Degenerate when the path runs straight up; fall back to a fixed axis.
    let normal = new THREE.Vector3().crossVectors(tangent, up);
    if (normal.lengthSq() < 1e-6) normal = new THREE.Vector3(1, 0, 0);
    normal.normalize();

    const binormal = new THREE.Vector3()
      .crossVectors(tangent, normal)
      .normalize();

    const r = radiusAt(t);
    const ring: THREE.Vector3[] = [];
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      ring.push(
        points[i]
          .clone()
          .addScaledVector(normal, Math.cos(a) * r)
          .addScaledVector(binormal, Math.sin(a) * r * flatten),
      );
    }
    rings.push(ring);
  }

  return loft(rings, { capEnd: true });
}
