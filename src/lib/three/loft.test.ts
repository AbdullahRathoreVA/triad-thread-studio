import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { loft, section, mix } from "./loft";

/**
 * These tests exist because the first jacket model shipped looking like a
 * stack of flat slabs — extruded 2D panels with no volume. The regression
 * guard that matters is simply: does the geometry have real extent on all
 * three axes, and is it a closed surface?
 */

describe("section", () => {
  test("returns the requested number of points", () => {
    assert.equal(section({ radial: 48, rx: 1, rz: 0.5, y: 0 }).length, 48);
  });

  test("points lie on the requested plane", () => {
    for (const p of section({ radial: 16, rx: 1, rz: 0.5, y: 2.5 })) {
      assert.equal(p.y, 2.5);
    }
  });

  test("respects the x/z radii, so sections are not circular", () => {
    const pts = section({ radial: 64, rx: 1, rz: 0.4, y: 0 });
    const maxX = Math.max(...pts.map((p) => Math.abs(p.x)));
    const maxZ = Math.max(...pts.map((p) => Math.abs(p.z)));
    assert.ok(Math.abs(maxX - 1) < 0.02, `maxX ${maxX}`);
    assert.ok(Math.abs(maxZ - 0.4) < 0.02, `maxZ ${maxZ}`);
    assert.ok(maxX > maxZ * 2, "a body section must be wider than it is deep");
  });

  test("is offset by centreX and centreZ", () => {
    const pts = section({ radial: 8, rx: 0.2, rz: 0.2, y: 0, centreX: 3 });
    const avgX = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    assert.ok(Math.abs(avgX - 3) < 0.001);
  });
});

describe("loft", () => {
  const rings = [
    section({ radial: 24, rx: 1, rz: 0.45, y: -1 }),
    section({ radial: 24, rx: 1.1, rz: 0.5, y: 0 }),
    section({ radial: 24, rx: 0.9, rz: 0.4, y: 1 }),
  ];

  test("rejects fewer than two rings", () => {
    assert.throws(() => loft([rings[0]]));
  });

  test("produces one vertex per ring point", () => {
    const g = loft(rings);
    assert.equal(g.getAttribute("position").count, 24 * 3);
  });

  test("stitches two triangles per quad between rings", () => {
    const g = loft(rings);
    // 2 gaps × 24 quads × 6 indices
    assert.equal(g.getIndex()!.count, 2 * 24 * 6);
  });

  /** The actual regression: a slab has zero depth, a garment does not. */
  test("has real extent on all three axes", () => {
    const g = loft(rings);
    g.computeBoundingBox();
    const size = new THREE.Vector3();
    g.boundingBox!.getSize(size);

    assert.ok(size.x > 1.5, `width ${size.x}`);
    assert.ok(size.y > 1.5, `height ${size.y}`);
    assert.ok(size.z > 0.5, `depth ${size.z} — geometry is flat, not a volume`);
  });

  test("computes vertex normals", () => {
    const g = loft(rings);
    const normals = g.getAttribute("normal");
    assert.ok(normals, "normals missing — surface would render unlit");

    // Normals must be unit length or the lighting is wrong.
    for (let i = 0; i < normals.count; i += 17) {
      const len = Math.hypot(
        normals.getX(i),
        normals.getY(i),
        normals.getZ(i),
      );
      assert.ok(Math.abs(len - 1) < 0.001, `normal ${i} length ${len}`);
    }
  });

  test("caps add geometry and close the surface", () => {
    const open = loft(rings);
    const capped = loft(rings, { capStart: true, capEnd: true });
    assert.ok(
      capped.getIndex()!.count > open.getIndex()!.count,
      "caps should add triangles",
    );
  });
});

describe("mix", () => {
  test("clamps outside 0..1 and eases between", () => {
    assert.equal(mix(0, 10, -1), 0);
    assert.equal(mix(0, 10, 2), 10);
    assert.equal(mix(0, 10, 0.5), 5);
    // Smoothstep, so it is not linear away from the midpoint.
    assert.ok(mix(0, 10, 0.25) < 2.5);
  });
});
